import logging
from typing import Any, Dict, List, Tuple

from tqdm import tqdm

from modules.ml.document_store.faiss import FAISSDocumentStore
from modules.ml.preprocessor.vi_preprocessor import ViPreProcessor
from modules.ml.vectorizer.base import DocVectorizerBase

logger = logging.getLogger(__name__)


class Retriever:
    def __init__(
        self,
        document_store: FAISSDocumentStore = None,
        candidate_vectorizer: DocVectorizerBase = None,
        retriever_vectorizer: DocVectorizerBase = None,
    ):
        """Init an instance of a Retriever

        Args:
            document_store (FAISSDocumentStore):
                An instance of DocumentStore where data is indexed and stored.
                Defaults to None.
            candidate_vectorizer (DocVectorizerBase):
                An instance of vectorizer to convert QUERY documents (in database) to embedding.
                Defaults to None.
            retriever_vectorizer (DocVectorizerBase): An instance of vectorizer to convert
                                                 CANDIDATE documents to embeddings. Defaults to None.
        """

        self.document_store: FAISSDocumentStore = document_store
        self.candidate_vectorizer: DocVectorizerBase = candidate_vectorizer
        self.retriever_vectorizer: DocVectorizerBase = retriever_vectorizer

        if not self.document_store:
            raise ValueError(
                "Document store cannot be None."
                "Try to set document_store to a DocumentStore object again ..."
            )

        self.index_vector_dim = self.document_store.vector_dim

        if (
            self.candidate_vectorizer is not None
            and self.index_vector_dim != self.candidate_vectorizer.vector_dim
        ):
            raise ValueError(
                "index_vector_dim must be the same with dimention vector of candidate vectorizer."
            )

    def train_candidate_vectorizer(
        self,
        retrain: bool = True,
        training_documents: List[str] = None,
        save_path: str = None,
    ):
        """Train vectorizer for getting candidates phase

        Args:
            retrain (bool): Retrain or load saved vectorizer. Defaults to True.
            training_documents (List[str]): Training documents for vectorizer. Defaults to None.
            save_path (str): Path to save paramenters of vectorizer model. Defaults to None.
        """

        if not retrain:
            self.candidate_vectorizer = DocVectorizerBase.load(save_path)
            if self.index_vector_dim != self.candidate_vectorizer.vector_dim:
                raise ValueError(
                    "index_vector_dim must be the same with dimention vector of candidate vectorizer."
                )
            return

        if not self.candidate_vectorizer:
            raise ValueError(
                "Candidate vectorizer cannot be None."
                "Try to set candidate_vectorizer to a DocVectorizerBase object..."
            )

        if not training_documents or len(training_documents) == 0:
            self.training_documents = [
                document.text for document in self.document_store.get_all_documents()
            ]

            if not self.training_documents or len(self.training_documents) == 0:
                raise ValueError(
                    "Fit method can not be called with empty DocumentStore"
                    " and empty training docuents"
                )
        else:
            self.training_documents = training_documents

        self.spare_documnet_embedding = self.candidate_vectorizer.fit_transform(
            self.training_documents
        )

        if save_path:
            self.candidate_vectorizer.save(save_path)

    def train_retriever_vectorizer(
        self,
        retrain: bool = True,
        training_documents: List[str] = None,
        save_path: str = None,
    ):
        """Train vectorizer for final retrieve phase

        Args:
            retrain (bool): Retrain or load saved vectorizer. Defaults to True.
            training_documents (List[str]): Training documents for vectorizer. Defaults to None.
            save_path (str): Path to save paramenters of vectorizer model. Defaults to None.
        """

        if not retrain:
            self.retriever_vectorizer = DocVectorizerBase.load(save_path)
            return

        if not self.retriever_vectorizer:
            raise ValueError(
                "Retriver vectorizer cannot be None"
                " Try to set retriever_vectorizer to a DocVectorizerBase object..."
            )

        if not training_documents or len(training_documents) == 0:
            self.training_documents = [
                document.text for document in self.document_store.get_all_documents()
            ]

            if not self.training_documents or len(self.training_documents) == 0:
                raise ValueError(
                    "Fit method can not be called with empty DocumentStore"
                    " and empty training docuents"
                )
        else:
            self.training_documents = training_documents

        self.spare_documnet_embedding = self.retriever_vectorizer.fit_transform(
            self.training_documents
        )

        if save_path:
            self.retriever_vectorizer.save(save_path)

    def update_embeddings(
        self, retrain: bool = True, save_path: str = None, sql_url: str = None
    ):
        """
        Update embeddings of documents with candidate vectorizer to `document_store`.
        """
        if retrain:
            if not self.candidate_vectorizer.is_trained:
                raise ValueError(
                    "Candidate vectorizer is not trained yet."
                    " Try to call train_candidate_vectorizer first"
                )

            self.document_store.update_embeddings(self.candidate_vectorizer)
            if save_path:
                self.document_store.save(file_path=save_path)
        # else:
        #     self.document_store = FAISSDocumentStore.load(
        #         faiss_file_path=save_path, sql_url=sql_url
        #     )

    def get_candidates(
        self, query_docs: List[str], top_k: int = 10, index: str = None, filters=None
    ) -> Tuple:
        """First phase of retriever to get top_k candidates

        Args:
            query_docs (List[str]): The documents to query. Defaults to None.
            top_k (int, optional): Number of documents to return for each query_doc.
                Defaults to 10.

        Returns:
            tuple: Return a tuple of score_matrix and vector_id_matrix (top_k)
                             that are most relevant to each query_doc
        """
        if not self.candidate_vectorizer.is_trained:
            raise ValueError(
                "Candidate vectorizer is not trained yet."
                "Try to call train_candidate_vectorizer first"
            )

        query_embs = self.candidate_vectorizer.transform(query_docs)
        score_matrix, vector_id_matrix = self.document_store.query_ids_by_embedding(
            query_emb=query_embs, filters=filters, top_k=top_k, index=index
        )

        return query_embs, score_matrix, vector_id_matrix

    def _calc_scores_for_candidates(self, query_doc, candidate_ids):
        """Caculate scores for each candidate in 2nd phase

        Args:
            query_doc (str, optional): The document to query. Defaults to None.
            candidate_ids (List[int]): List of candidate_ids of query. Defaults to None.

        Returns:
            [type]: [description]
        """
        if not self.retriever_vectorizer.is_trained:
            raise ValueError(
                "Retriever vectorizer is not trained yet."
                " Try to call train_retriever_vectorizer first"
            )

        query_emb = self.retriever_vectorizer.transform([query_doc])
        candidate_ids = list(map(str, candidate_ids))

        candidate_docs = self.document_store.get_documents_by_vector_ids(candidate_ids)
        candidate_docs_text = [candidate_doc.text for candidate_doc in candidate_docs]
        candidate_docs_id = [candidate_doc.id for candidate_doc in candidate_docs]
        candidate_embs = self.retriever_vectorizer.transform(candidate_docs_text)

        scores = candidate_embs.dot(query_emb.T)
        idx_scores = [(idx, score) for idx, score in enumerate(scores)]

        # 0 location is the query_doc itself, so pick the next one
        highest_score = sorted(idx_scores, key=(lambda tup: tup[1]), reverse=True)[1]

        return candidate_docs_id[highest_score[0]], highest_score[1]

    def batch_retrieve(
        self,
        query_docs: List[str],
        top_k_candidates: int = 10,
        process_query_docs: bool = False,
        index: str = None,
        filters=None,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve batch of most k similar docs to given batch of documents

        Args:
            query_docs ([type]): [description]
            top_k_candidates (int, optional): [description]. Defaults to 10.
            process_query_docs (bool, optional): [description]. Defaults to False.
            index ([type], optional): [description]. Defaults to None.
            filters ([type], optional): [description]. Defaults to None.

        Returns:
            List[Dict[str, Any]]: Retrieved results
        """
        if not self.document_store.is_synchronized():
            raise ValueError(
                "Faiss_index and database haven't been synchronized yet."
                " Please, call update_embeddings methods first!"
            )

        if process_query_docs:
            processor = ViPreProcessor()
            query_docs = [
                processor.clean({"text": query_doc})["text"] for query_doc in query_docs
            ]

        _, _, candidate_id_matrix = self.get_candidates(
            query_docs=query_docs, top_k=top_k_candidates, index=index, filters=filters
        )

        retrieve_results = []

        for idx, query_doc in enumerate(tqdm(query_docs, desc="Retrieving.....  ")):
            candidate_ids = [
                candidate_id
                for candidate_id in candidate_id_matrix[idx]
                if candidate_id >= 0
            ]

            retrieve_result, score = self._calc_scores_for_candidates(
                query_doc=query_doc, candidate_ids=candidate_ids
            )

            retrieve_results.append(
                {
                    "query_doc": query_doc,
                    "retrieve_result": retrieve_result,
                    "similarity_score": round(score[0], 5),
                }
            )

        return retrieve_results
