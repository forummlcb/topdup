import logging
from pathlib import Path
from sys import platform
from typing import Dict, List, Optional, Union

import numpy as np
from scipy.special import expit
from tqdm import tqdm

from modules.ml.document_store.sql import SQLDocumentStore
from modules.ml.schema import Document
from modules.ml.utils import get_logger
from modules.ml.vectorizer.base import DocVectorizerBase

if platform != "win32" and platform != "cygwin":
    import faiss
else:
    raise ModuleNotFoundError("FAISSDocumentStore on windows platform is not supported")


logger = get_logger()


class FAISSDocumentStore(SQLDocumentStore):
    """Document store for very large scale embedding based dense retrievers like the DPR.

    It implements the FAISS library(https://github.com/facebookresearch/faiss)
    to perform similarity search on vectors.

    The document text and meta-data (for filtering) are stored using the
    SQLDocumentStore, while the vector embeddings are indexed in a FAISS Index.

    """

    def __init__(
        self,
        sql_url: str = "postgresql+psycopg2://",
        index_buffer_size: int = 10000,
        vector_dim: int = 128,
        faiss_index_factory_str: str = "Flat",
        faiss_index: str = None,
        return_embedding: bool = False,
        update_existing_documents: bool = False,
        index: str = "document",
        similarity: str = "dot_product",
        **kwargs,
    ):
        """
        Attributes:
            sql_url (str, optional): SQL connection URL for database. It defaults to
                local file based SQLite DB (Change to PostgredSQL). For large scale
                deployment, Postgres is recommended. Defaults to "postgresql+psycopg2://".
            index_buffer_size (int, optional): When working with large datasets,
                the ingestion process(FAISS + SQL) can be buffered in
                smaller chunks to reduce memory footprint. Defaults to 10000.
            vector_dim (int, optional): the embedding vector size. Defaults to 128.

            faiss_index_factory_str (str, optional):
                Create a new FAISS index of the specified type.
                The type is determined from the given string following the conventions
                of the original FAISS index factory.
                    Recommended options:
                    - "Flat" (default): Best accuracy (= exact). Becomes slow and RAM intense for > 1 Mio docs.
                    - "HNSW": Graph-based heuristic. If not further specified,
                        we use a RAM intense, but more accurate config:
                        HNSW256, efConstruction=256 and efSearch=256
                    - "IVFx,Flat": Inverted Index. Replace x with the number of centroids aka nlist.
                        Rule of thumb: nlist = 10 * sqrt (num_docs) is a good starting point.
                    For more details see:
                    - Overview of indices https://github.com/facebookresearch/faiss/wiki/Faiss-indexes
                    - Guideline for choosing an index https://github.com/facebookresearch/faiss/wiki/Guidelines-to-choose-an-index
                    - FAISS Index factory https://github.com/facebookresearch/faiss/wiki/The-index-factory
                    Benchmarks: XXX. Defaults to "Flat".
            faiss_index (str, optional): Pass an existing FAISS Index, i.e.
                an empty one that you configured manually or one with docs
                that you used in Haystack before and want to load again.
                Defaults to None.
            return_embedding (bool, optional): To return document embedding.
                Defaults to False.
            update_existing_documents (bool, optional): Whether to update any existing
                documents with the same ID when adding documents.
                When set as True, any document with an existing ID gets updated.
                If set to False, an error is raised if the document ID of the document
                being added already exists. Defaults to False.
            index (str, optional): Name of index in document store to use.
                Defaults to "document".
            similarity (str, optional): The similarity function used to compare
                document vectors. 'dot_product' is the default sine it is
                more performant with DPR embeddings.
                'cosine' is recommended if you are using a Sentence BERT model.
                Defaults to "dot_product".

        Raises:
            ValueError: FAISSDocumentStore currently only supports dot_product similarity.
        """

        self.vector_dim = vector_dim

        if faiss_index:
            self.faiss_index = faiss_index
        else:
            self.faiss_index = self._create_new_index(
                vector_dim=self.vector_dim,
                index_factory=faiss_index_factory_str,
                **kwargs,
            )

            if (
                "ivf" in faiss_index_factory_str.lower()
            ):  # enable reconstruction of vectors for inverted index
                self.faiss_index.set_direct_map_type(faiss.DirectMap.Hashtable)

        self.sql_url = sql_url
        self.index_buffer_size = index_buffer_size
        self.return_embedding = return_embedding
        if similarity == "dot_product":
            self.similarity = similarity
        else:
            raise ValueError(
                "The FAISS document store can currently only support dot_product similarity. "
                'Please set similarity="dot_product"'
            )
        super().__init__(
            url=sql_url,
            update_existing_documents=update_existing_documents,
            index=index,
        )

    def _create_new_index(
        self,
        vector_dim: int,
        index_factory: str = "Flat",
        metric_type=faiss.METRIC_INNER_PRODUCT,
        **kwargs,
    ):
        if index_factory == "HNSW" and metric_type == faiss.METRIC_INNER_PRODUCT:
            # faiss index factory doesn't give the same results for HNSW IP, therefore direct init.
            # defaults here are similar to DPR codebase (good accuracy, but very high RAM consumption)
            n_links = kwargs.get("n_links", 128)
            index = faiss.IndexHNSWFlat(vector_dim, n_links, metric_type)
            index.hnsw.efSearch = kwargs.get("efSearch", 20)  # 20
            index.hnsw.efConstruction = kwargs.get("efConstruction", 80)  # 80
            logger.info(
                f"HNSW params: n_links: {n_links}, efSearch: {index.hnsw.efSearch}, efConstruction: {index.hnsw.efConstruction}"
            )
        else:
            index = faiss.index_factory(vector_dim, index_factory, metric_type)
        return index

    def write_documents(
        self, documents: Union[List[dict], List[Document]], index: Optional[str] = None
    ):
        """Adds new documents to the DocumentStore.

        Args:
            documents (List[dict], List[Document]): List of `Dicts` or List of `Documents`.
                If they already contain the embeddings, we'll index them right away in FAISS.
                If not, you can later call update_embeddings() to create & index them.
            index (str, optional): (SQL) index name for storing the docs and metadata.
                Defaults to None.

        Raises:
            ValueError: self.faiss_index not initialized.
        """
        # vector index
        if not self.faiss_index:
            raise ValueError(
                "Couldn't find a FAISS index. Try to init the FAISSDocumentStore() again ..."
            )

        # doc + metadata index
        index = index or self.index
        field_map = self._create_document_field_map()
        document_objects = [
            Document.from_dict(d, field_map=field_map) if isinstance(d, dict) else d
            for d in documents
        ]

        add_vectors = False if document_objects[0].embedding is None else True

        if self.update_existing_documents and add_vectors:
            logger.warning(
                "You have enabled `update_existing_documents` feature and "
                "`FAISSDocumentStore` does not support update in existing `faiss_index`.\n"
                "Please call `update_embeddings` method to repopulate `faiss_index`"
            )

        for i in range(0, len(document_objects), self.index_buffer_size):
            vector_id = self.faiss_index.ntotal
            if add_vectors:
                embeddings = [
                    doc.embedding
                    for doc in document_objects[i : i + self.index_buffer_size]
                ]
                embeddings = np.array(embeddings, dtype="float32")
                self.faiss_index.add(embeddings)

            docs_to_write_in_sql = []
            for doc in document_objects[i : i + self.index_buffer_size]:
                if add_vectors:
                    doc.vector_id = vector_id
                    vector_id += 1
                else:
                    doc.vector_id = None
                docs_to_write_in_sql.append(doc)

            super(FAISSDocumentStore, self).write_documents(
                docs_to_write_in_sql, index=index
            )

    def _create_document_field_map(self) -> Dict:
        return {self.index: "embedding"}

    def update_embeddings(
        self, vectorizer: DocVectorizerBase, index: Optional[str] = None
    ):
        """Updates the embeddings in the the document store using the encoding model
        specified in the retriever. This can be useful if want to add or change
        the embeddings for your documents (e.g. after changing the retriever config).

        Args:
            vectorizer (DocVectorizerBase): Vectorizer for generating
                embeddings existing docs.
            index (str, optional): (SQL) index name for storing the docs and metadata.
                Defaults to None.

        Raises:
            ValueError: self.faiss_index not initialized.
        """

        if not self.faiss_index:
            raise ValueError(
                "Couldn't find a FAISS index. Try to init the FAISSDocumentStore() again ..."
            )

        # Faiss does not support update in existing index data so clear all existing data in it
        self.faiss_index.reset()
        self.reset_vector_ids(index=index)

        index = index or self.index
        documents = self.get_all_documents(index=index)

        if len(documents) == 0:
            logger.warning(
                "Calling DocumentStore.update_embeddings() on an empty index"
            )
            return

        # To clear out the FAISS index contents and frees all memory immediately that is in use by the index
        # self.faiss_index.reset()

        logger.info(f"Updating embeddings for {len(documents)} docs...")
        embeddings = vectorizer.transform_document_objects(documents)  # type: ignore
        assert len(documents) == len(embeddings)
        for i, doc in enumerate(documents):
            doc.embedding = embeddings[i]

        logger.info("Indexing embeddings and updating vectors_ids...")
        for i in tqdm(range(0, len(documents), self.index_buffer_size)):
            vector_id_map = {}
            vector_id = self.faiss_index.ntotal
            embeddings = [
                doc.embedding for doc in documents[i : i + self.index_buffer_size]
            ]
            embeddings = np.ascontiguousarray(embeddings, dtype="float32")
            self.faiss_index.add(embeddings)

            for doc in tqdm(documents[i : i + self.index_buffer_size]):
                vector_id_map[doc.id] = vector_id
                vector_id += 1
            self.update_vector_ids(vector_id_map, index=index)
            print("update")

    def is_synchronized(self) -> bool:
        """Checks if all documents in document store is indexed
        """
        return self.faiss_index.ntotal == self.get_document_count()

    def get_all_documents(
        self, index: Optional[str] = None, return_embedding: Optional[bool] = False
    ) -> List[Document]:
        """Gets documents from the document store.

        Args:
            index (str, optional): Name of the index to get the documents from.
                Defaults to self.index.
            return_embedding (bool, optional): Whether to return the document embeddings.
                Defaults to False.

        Returns:
            List[Document]
        """
        documents = super(FAISSDocumentStore, self).get_all_documents(index=index)
        if return_embedding is None:
            return_embedding = self.return_embedding
        if return_embedding:
            for doc in documents:
                if doc.meta and doc.vector_id is not None:
                    doc.embedding = self.faiss_index.reconstruct(
                        # int(doc.meta["vector_id"])
                        int(doc.vector_id)
                    )
        return documents

    def train_index(
        self,
        documents: Optional[Union[List[dict], List[Document]]],
        embeddings: Optional[np.array] = None,
    ):
        """Some FAISS indices (e.g. IVF) require initial "training" on
        a sample of vectors before you can add your final vectors.
        The train vectors should come from the same distribution as your final ones.
        You can pass either documents (incl. embeddings) or
        just the plain embeddings that the index shall be trained on.

        Args:
            documents (Union[List[dict], List[Document]]): Document instances (incl. the embeddings)
            embeddings (np.array, optional): Plain embeddings. Defaults to None.

        Raises:
            ValueError: raised when both `documents` or `embeddings` are passed.
        """

        if embeddings and documents:
            raise ValueError(
                "Either pass `documents` or `embeddings`. You passed both."
            )
        if documents:
            document_objects = [
                Document.from_dict(d) if isinstance(d, dict) else d for d in documents
            ]
            embeddings = [doc.embedding for doc in document_objects]
            embeddings = np.array(embeddings, dtype="float32")
        self.faiss_index.train(embeddings)

    def delete_all_documents(self, index=None):
        """Deletes all documents from the document store.
        """
        index = index or self.index
        self.faiss_index.reset()
        super().delete_all_documents(index=index)

    def query_ids_by_embedding(
        self,
        query_emb: np.array,
        filters: Optional[dict] = None,
        top_k: int = 10,
        index: Optional[str] = None,
        return_embedding: Optional[bool] = None,
    ) -> List[Document]:
        """Finds k ids belong to k documents that are most similar to the provided
        `query_emb` by using a vector similarity metric.

        Args:
            query_emb (np.array): Embedding of the query (e.g. gathered from DPR)
            filters (dict, optional): Optional filters to narrow down the search space.
                Example: {"name": ["some", "more"], "category": ["only_one"]}.
                Defaults to None.
            top_k (int, optional): Select top k documents to return. Defaults to 10.
            index (str, optional): (SQL) index name for storing the docs and metadata.
                Defaults to None.
            return_embedding (bool, optional): To return document embedding.
                Defaults to None.

        Raises:
            NotImplementedError: raised when trying to use filters arguments in this type of document store.
            ValueError: raised when faiss embeddings not calculated yet.

        Returns:
            List[Document]
        """
        if filters:
            raise NotImplementedError(
                "Query filters are not implemented for the FAISSDocumentStore."
            )
        if not self.faiss_index:
            raise ValueError(
                "No index exists. Use 'update_embeddings()` to create an index."
            )

        query_emb = np.ascontiguousarray(query_emb, dtype="float32")
        return self.faiss_index.search(query_emb, top_k)

    def query_docs_by_embedding(
        self,
        query_emb: np.array,
        filters: Optional[dict] = None,
        top_k: int = 10,
        index: Optional[str] = None,
        return_embedding: Optional[bool] = None,
    ) -> List[Document]:
        """Finds k documents that are most similar to the provided `query_emb`
        by using a vector similarity metric.

        Args:
            query_emb (np.array): Embedding of the query (e.g. gathered from DPR)
            filters (dict, optional): Optional filters to narrow down the search space.
                Example: {"name": ["some", "more"], "category": ["only_one"]}.
                Defaults to None.
            top_k (int, optional): Select top k documents to return. Defaults to 10.
            index (str, optional): (SQL) index name for storing the docs and metadata.
                Defaults to None.
            return_embedding (bool, optional): To return document embedding.
                Defaults to None.

        Raises:
            NotImplementedError: raised when trying to use filters arguments in this type of document store.
            ValueError: raised when faiss embeddings not calculated yet.

        Returns:
            List[Document]
        """
        if filters:
            raise NotImplementedError(
                "Query filters are not implemented for the FAISSDocumentStore."
            )
        if not self.faiss_index:
            raise ValueError(
                "No index exists. Use 'update_embeddings()` to create an index."
            )

        if return_embedding is None:
            return_embedding = self.return_embedding
        index = index or self.index

        query_emb = query_emb.reshape(1, -1).astype(np.float32)
        score_matrix, vector_id_matrix = self.query_idxs_by_embedding(
            query_emb, filters, top_k, index, return_embedding
        )
        vector_ids_for_query = [
            str(vector_id) for vector_id in vector_id_matrix[0] if vector_id != -1
        ]

        documents = self.get_documents_by_vector_ids(vector_ids_for_query, index=index)

        # assign query score to each document
        scores_for_vector_ids: Dict[str, float] = {
            str(v_id): s for v_id, s in zip(vector_id_matrix[0], score_matrix[0])
        }
        for doc in documents:
            # doc.score = scores_for_vector_ids[doc.meta["vector_id"]]
            doc.score = scores_for_vector_ids[doc.vector_id]
            doc.probability = float(expit(np.asarray(doc.score / 100)))
            if return_embedding is True:
                # doc.embedding = self.faiss_index.reconstruct(int(doc.meta["vector_id"]))
                doc.embedding = self.faiss_index.reconstruct(int(doc.vector_id))

        return documents

    def save(self, file_path: Union[str, Path]):
        """Saves FAISS Index to the specified file.

        Args:
            file_path(Union[str, Path]): Path to save to.
        """
        faiss.write_index(self.faiss_index, str(file_path))

    @classmethod
    def load(
        cls,
        faiss_file_path: Union[str, Path],
        sql_url: str,
        index_buffer_size: int = 10000,
    ):
        """Loads a saved FAISS index from a file and connect to the SQL database.

        Note: In order to have a correct mapping from FAISS to SQL,
        make sure to use the same SQL DB that you used when calling `save()`.

        Args:
            faiss_file_path (Union[str, Path]): Stored FAISS index file.
                Can be created via calling `save()`
            sql_url (str): Connection string to the SQL database that contains your docs and metadata.
            index_buffer_size (int, optional): smaller chunks to reduce memory footprint.
                Defaults to 10000.
        """
        faiss_index = faiss.read_index(str(faiss_file_path))
        return cls(
            faiss_index=faiss_index,
            sql_url=sql_url,
            index_buffer_size=index_buffer_size,
            vector_dim=faiss_index.d,
        )
