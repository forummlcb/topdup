from typing import Any, Dict, List, Tuple

from tqdm import tqdm

from modules.ml.document_store.faiss import FAISSDocumentStore
from modules.ml.preprocessor.vi_preprocessor import ViPreProcessor
from modules.ml.schema import Document
from modules.ml.utils import get_logger
from modules.ml.vectorizer.base import DocVectorizerBase

logger = get_logger()


class Retriever:
    def __init__(
        self,
        document_store: FAISSDocumentStore = None,
        candidate_vectorizer: DocVectorizerBase = None,
        retriever_vectorizer: DocVectorizerBase = None,
    ):
        """Inits an instance of a Retriever.

        Attributes:
            document_store (FAISSDocumentStore, optional): An instance of DocumentStore
                where data is indexed and stored. Defaults to None.
            candidate_vectorizer (DocVectorizerBase, optional): An instance of vectorizer
                to convert QUERY documents (in database) to embedding. Defaults to None.
            retriever_vectorizer (DocVectorizerBase, optional): An instance of vectorizer
                to convert CANDIDATE documents to embeddings. Defaults to None.
        """

        self.document_store: FAISSDocumentStore = document_store
        self.candidate_vectorizer: DocVectorizerBase = candidate_vectorizer
        self.retriever_vectorizer: DocVectorizerBase = retriever_vectorizer

        if not self.document_store:
            raise ValueError(
                "Document store cannot be None."
                " Try to set document_store to a DocumentStore object again."
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
                " Try to set candidate_vectorizer to a DocVectorizerBase object."
            )

        if not training_documents or len(training_documents) == 0:
            self.training_documents = [
                document.text for document in self.document_store.get_all_documents()
            ]

            if not self.training_documents or len(self.training_documents) == 0:
                raise ValueError(
                    "Fit method can not be called with empty DocumentStore"
                    " and empty training documents."
                )
        else:
            self.training_documents = training_documents

        self.sparse_documnet_embedding = self.candidate_vectorizer.fit_transform(
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
                "Retriver vectorizer cannot be None."
                " Try to set retriever_vectorizer to a DocVectorizerBase object."
            )

        if not training_documents or len(training_documents) == 0:
            self.training_documents = [
                document.text for document in self.document_store.get_all_documents()
            ]

            if not self.training_documents or len(self.training_documents) == 0:
                raise ValueError(
                    "Fit method can not be called with empty DocumentStore"
                    " and empty training documents."
                )
        else:
            self.training_documents = training_documents

        self.sparse_documnet_embedding = self.retriever_vectorizer.fit_transform(
            self.training_documents
        )

        if save_path:
            self.retriever_vectorizer.save(save_path)

    def update_embeddings(
        self, retrain: bool = True, save_path: str = None, sql_url: str = None
    ):
        """Updates embeddings of documents with candidate vectorizer to `document_store`.
        """
        if retrain:
            if not self.candidate_vectorizer.is_trained:
                raise ValueError(
                    "Candidate vectorizer is not trained yet."
                    " Try to call train_candidate_vectorizer first."
                )

            self.document_store.update_embeddings(self.candidate_vectorizer)
            if save_path:
                self.document_store.save(file_path=save_path)
        else:
            self.document_store = FAISSDocumentStore.load(
                faiss_file_path=save_path, sql_url=sql_url
            )

    def get_candidates(
        self, query_texts: List[str], top_k: int = 10, index: str = None, filters=None
    ) -> Tuple:
        """First phase of retriever to get top_k candidates

        Args:
            query_texts (List[str]): The documents to query. Defaults to None.
            top_k (int, optional): Number of documents to return for each query_doc.
                Defaults to 10.

        Returns:
            tuple: Return a tuple of score_matrix and vector_id_matrix (top_k)
                             that are most relevant to each query_doc
        """
        if not self.candidate_vectorizer.is_trained:
            raise ValueError(
                "Candidate vectorizer is not trained yet."
                " Try to call train_candidate_vectorizer first."
            )

        query_embs = self.candidate_vectorizer.transform(query_texts)
        score_matrix, vector_id_matrix = self.document_store.query_ids_by_embedding(
            query_emb=query_embs, filters=filters, top_k=top_k, index=index
        )

        return query_embs, score_matrix, vector_id_matrix

    def _calc_scores_for_candidates(
        self, query_text, candidate_ids, top_k_results: int = 10
    ):
        """Caculates scores for each candidate in 2nd phase

        Args:
            query_text (str, optional): The document to query. Defaults to None.
            candidate_ids (List[int]): List of candidate_ids of query. Defaults to None.

        Returns:
            [type]: [description]
        """
        if not self.retriever_vectorizer.is_trained:
            raise ValueError(
                "Retriever vectorizer is not trained yet."
                " Try to call train_retriever_vectorizer first."
            )

        query_emb = self.retriever_vectorizer.transform([query_text])
        candidate_ids = list(map(str, candidate_ids))

        candidate_docs = self.document_store.get_documents_by_vector_ids(candidate_ids)
        candidate_docs_text = [candidate_doc.text for candidate_doc in candidate_docs]
        candidate_docs_id = [candidate_doc.id for candidate_doc in candidate_docs]
        candidate_embs = self.retriever_vectorizer.transform(candidate_docs_text)

        scores = candidate_embs.dot(query_emb.T)
        idx_scores = [(idx, score) for idx, score in enumerate(scores)]

        # 0 location is the query_text itself, so pick the next ones
        highest_scores = sorted(idx_scores, key=(lambda tup: tup[1]), reverse=True)[
            1 : top_k_results + 1
        ]

        return [[candidate_docs_id[score[0]], score[1]] for score in highest_scores]

    def batch_retrieve(
        self,
        query_docs: List[Document],
        top_k_results: int = 10,
        process_query_texts: bool = False,
        index: str = None,
        filters=None,
    ) -> List[Dict[str, Any]]:
        """Retrieves batch of most k similar docs of given batch of documents

        Args:
            query_docs ([type]): [description]
            top_k_results (int, optional): [description]. Defaults to 10.
            process_query_texts (bool, optional): [description]. Defaults to False.
            index ([type], optional): [description]. Defaults to None.
            filters ([type], optional): [description]. Defaults to None.

        Returns:
            List[Dict[str, Any]]: Retrieved results
        """
        if not self.document_store.is_synchronized():
            raise ValueError(
                "faiss_index and database haven't been synchronized yet."
                " Try to call update_embeddings methods first."
            )

        query_texts = [doc.text for doc in query_docs]

        if process_query_texts:
            processor = ViPreProcessor()
            query_texts = [
                processor.clean({"text": query_text})["text"]
                for query_text in query_texts
            ]

        _, _, candidate_id_matrix = self.get_candidates(
            query_texts=query_texts,
            top_k=10 * top_k_results,
            index=index,
            filters=filters,
        )  # create large candidates search space 10*top_k_results

        retrieve_results = []

        for idx, query_text in enumerate(tqdm(query_texts, desc="Retrieving.....  ")):
            candidate_ids = [
                candidate_id
                for candidate_id in candidate_id_matrix[idx]
                if candidate_id >= 0
            ]

            reranked_candidates = self._calc_scores_for_candidates(
                query_text=query_text,
                candidate_ids=candidate_ids,
                top_k_results=top_k_results,
            )

            for rank, reranked_candidate in enumerate(reranked_candidates):
                retrieve_results.append(
                    {
                        "document_id": query_docs[idx].id,
                        f"sim_document_id_rank_{str(rank).zfill(2)}": reranked_candidate[
                            0
                        ],
                        f"sim_score_rank_{str(rank).zfill(2)}": round(
                            reranked_candidate[1][0], 5
                        ),
                    }
                )

        return retrieve_results
