import os
from pathlib import Path
from shutil import copyfile

import pytest
from qcore.asserts import assert_raises
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from modules.ml.document_store.faiss import FAISSDocumentStore
from modules.ml.document_store.sql import DocumentORM, ORMBase
from modules.ml.retriever.retriever import Retriever
from modules.ml.vectorizer.base import DocVectorizerBase
from modules.ml.vectorizer.tf_idf import TfidfDocVectorizer

parent_cwd = Path(__file__).parent
test_db_path = os.path.join(parent_cwd, "topdup.test_db")
temp_test_db_path = os.path.join(parent_cwd, "temp_topdup.test_db")

# -----------------------------------------------------------
#               Temporarily disable tests
# -----------------------------------------------------------

# def test_construction():
#     with pytest.raises(ValueError):
#         retriever = Retriever()
#         print(type(retriever))

#     # Copy new temp test database
#     copyfile(test_db_path, temp_test_db_path)
#     document_store = FAISSDocumentStore(sql_url=f"sqlite:///{temp_test_db_path}")
#     cand_vectorizer = TfidfDocVectorizer(100)
#     rtrv_vectorizer = TfidfDocVectorizer(256)

#     with pytest.raises(ValueError):
#         retriever = Retriever(
#             document_store=document_store,
#             candidate_vectorizer=cand_vectorizer,
#             retriever_vectorizer=rtrv_vectorizer,
#         )
#         assert isinstance(retriever, Retriever)

#     document_store = FAISSDocumentStore(sql_url=f"sqlite:///{temp_test_db_path}")
#     cand_vectorizer = TfidfDocVectorizer(128)
#     rtrv_vectorizer = TfidfDocVectorizer(256)
#     retriever = Retriever(
#         document_store=document_store,
#         candidate_vectorizer=cand_vectorizer,
#         retriever_vectorizer=rtrv_vectorizer,
#     )
#     assert isinstance(retriever, Retriever)

#     # Remove temp test database
#     os.remove(temp_test_db_path)


# def test_train_candidate_vectorizer(mocker):
#     # Copy new temp test database
#     copyfile(test_db_path, temp_test_db_path)
#     save_path = os.path.join(parent_cwd, "cand_vector.test_pkl")

#     document_store = FAISSDocumentStore(sql_url=f"sqlite:///{temp_test_db_path}")
#     cand_vectorizer = TfidfDocVectorizer(128)
#     rtrv_vectorizer = TfidfDocVectorizer(256)
#     retriever = Retriever(
#         document_store=document_store,
#         candidate_vectorizer=cand_vectorizer,
#         retriever_vectorizer=rtrv_vectorizer,
#     )

#     if os.path.exists(save_path):
#         os.remove(save_path)
#     retriever.train_candidate_vectorizer(save_path=save_path)
#     assert isinstance(retriever.candidate_vectorizer, DocVectorizerBase)
#     assert retriever.candidate_vectorizer.is_trained
#     os.path.exists(save_path)

#     document_store = FAISSDocumentStore(
#         sql_url=f"sqlite:///{temp_test_db_path}", vector_dim=100
#     )
#     retriever = Retriever(document_store=document_store)
#     with pytest.raises(ValueError):
#         retriever.train_candidate_vectorizer(save_path=save_path, retrain=False)

#     document_store = FAISSDocumentStore(
#         sql_url=f"sqlite:///{temp_test_db_path}", vector_dim=128
#     )
#     retriever = Retriever(document_store=document_store)
#     retriever.train_candidate_vectorizer(save_path=save_path, retrain=False)
#     assert isinstance(retriever.candidate_vectorizer, DocVectorizerBase)
#     assert retriever.candidate_vectorizer.is_trained

#     document_store = FAISSDocumentStore(sql_url=f"sqlite:///{temp_test_db_path}")
#     retriever = Retriever(document_store=document_store)
#     with pytest.raises(ValueError):
#         retriever.train_candidate_vectorizer(save_path=save_path)

#     document_store = FAISSDocumentStore(sql_url=f"sqlite:///{temp_test_db_path}")
#     cand_vectorizer = TfidfDocVectorizer(128)
#     rtrv_vectorizer = TfidfDocVectorizer(256)
#     retriever = Retriever(
#         document_store=document_store,
#         candidate_vectorizer=cand_vectorizer,
#         retriever_vectorizer=rtrv_vectorizer,
#     )
#     mocker.patch(
#         "modules.ml.document_store.faiss.FAISSDocumentStore.get_all_documents",
#         return_value=[],
#     )

#     with pytest.raises(ValueError):
#         retriever.train_candidate_vectorizer()

#     url = f"sqlite:///{temp_test_db_path}"
#     engine = create_engine(url)
#     ORMBase.metadata.create_all(engine)
#     Session = sessionmaker(bind=engine)
#     session = Session()

#     query = session.query(DocumentORM).filter_by().limit(20)
#     training_documents = [query_result.text for query_result in query.all()]

#     document_store = FAISSDocumentStore(sql_url=f"sqlite:///{temp_test_db_path}")
#     cand_vectorizer = TfidfDocVectorizer(128)
#     rtrv_vectorizer = TfidfDocVectorizer(256)
#     retriever = Retriever(
#         document_store=document_store,
#         candidate_vectorizer=cand_vectorizer,
#         retriever_vectorizer=rtrv_vectorizer,
#     )
#     retriever.train_candidate_vectorizer(training_documents=training_documents)
#     assert isinstance(retriever.candidate_vectorizer, DocVectorizerBase)
#     assert retriever.candidate_vectorizer.is_trained

#     # Remove temp test database
#     os.remove(temp_test_db_path)


# def test_train_retriever_vectorizer(mocker):
#     # Copy new temp test database
#     copyfile(test_db_path, temp_test_db_path)
#     save_path = os.path.join(parent_cwd, "retriever_vector.test_pkl")

#     document_store = FAISSDocumentStore(sql_url=f"sqlite:///{temp_test_db_path}")
#     cand_vectorizer = TfidfDocVectorizer(128)
#     rtrv_vectorizer = TfidfDocVectorizer(256)
#     retriever = Retriever(
#         document_store=document_store,
#         candidate_vectorizer=cand_vectorizer,
#         retriever_vectorizer=rtrv_vectorizer,
#     )

#     if os.path.exists(save_path):
#         os.remove(save_path)
#     retriever.train_retriever_vectorizer(save_path=save_path)
#     assert isinstance(retriever.retriever_vectorizer, DocVectorizerBase)
#     assert retriever.retriever_vectorizer.is_trained
#     os.path.exists(save_path)

#     document_store = FAISSDocumentStore(
#         sql_url=f"sqlite:///{temp_test_db_path}", vector_dim=128
#     )
#     retriever = Retriever(document_store=document_store)
#     retriever.train_retriever_vectorizer(save_path=save_path, retrain=False)
#     assert isinstance(retriever.retriever_vectorizer, DocVectorizerBase)
#     assert retriever.retriever_vectorizer.is_trained

#     document_store = FAISSDocumentStore(sql_url=f"sqlite:///{temp_test_db_path}")
#     retriever = Retriever(document_store=document_store)
#     with pytest.raises(ValueError):
#         retriever.train_retriever_vectorizer(save_path=save_path)

#     document_store = FAISSDocumentStore(sql_url=f"sqlite:///{temp_test_db_path}")
#     cand_vectorizer = TfidfDocVectorizer(128)
#     rtrv_vectorizer = TfidfDocVectorizer(256)
#     retriever = Retriever(
#         document_store=document_store,
#         candidate_vectorizer=cand_vectorizer,
#         retriever_vectorizer=rtrv_vectorizer,
#     )
#     mocker.patch(
#         "modules.ml.document_store.faiss.FAISSDocumentStore.get_all_documents",
#         return_value=[],
#     )

#     with pytest.raises(ValueError):
#         retriever.train_retriever_vectorizer()

#     print("Query sample input from database")
#     url = f"sqlite:///{temp_test_db_path}"
#     engine = create_engine(url)
#     ORMBase.metadata.create_all(engine)
#     Session = sessionmaker(bind=engine)
#     session = Session()

#     query = session.query(DocumentORM).filter_by().limit(20)
#     training_documents = [query_result.text for query_result in query.all()]

#     document_store = FAISSDocumentStore(sql_url=f"sqlite:///{temp_test_db_path}")
#     cand_vectorizer = TfidfDocVectorizer(128)
#     rtrv_vectorizer = TfidfDocVectorizer(256)
#     retriever = Retriever(
#         document_store=document_store,
#         candidate_vectorizer=cand_vectorizer,
#         retriever_vectorizer=rtrv_vectorizer,
#     )
#     retriever.train_retriever_vectorizer(training_documents=training_documents)
#     assert isinstance(retriever.retriever_vectorizer, DocVectorizerBase)
#     assert retriever.retriever_vectorizer.is_trained

#     # Remove temp test database
#     os.remove(temp_test_db_path)


# def test_update_embeddings():
#     # Copy new temp test database
#     copyfile(test_db_path, temp_test_db_path)
#     document_store = FAISSDocumentStore(sql_url=f"sqlite:///{temp_test_db_path}")
#     cand_vectorizer = TfidfDocVectorizer(128)
#     rtrv_vectorizer = TfidfDocVectorizer(256)
#     retriever = Retriever(
#         document_store=document_store,
#         candidate_vectorizer=cand_vectorizer,
#         retriever_vectorizer=rtrv_vectorizer,
#     )
#     with pytest.raises(ValueError):
#         retriever.update_embeddings()

#     cand_vectorizer = TfidfDocVectorizer(128)
#     rtrv_vectorizer = TfidfDocVectorizer(256)
#     retriever = Retriever(
#         document_store=document_store,
#         candidate_vectorizer=cand_vectorizer,
#         retriever_vectorizer=rtrv_vectorizer,
#     )
#     retriever.train_candidate_vectorizer()
#     save_path = os.path.join(parent_cwd, "document_store.test_pkl")
#     retriever.update_embeddings(save_path=save_path)
#     # Remove temp test database
#     os.remove(temp_test_db_path)


# def test_get_candidates():
#     # Copy new temp test database
#     copyfile(test_db_path, temp_test_db_path)
#     document_store = FAISSDocumentStore(sql_url=f"sqlite:///{temp_test_db_path}")
#     cand_vectorizer = TfidfDocVectorizer(128)
#     rtrv_vectorizer = TfidfDocVectorizer(256)
#     retriever = Retriever(
#         document_store=document_store,
#         candidate_vectorizer=cand_vectorizer,
#         retriever_vectorizer=rtrv_vectorizer,
#     )
#     assert_raises(retriever.get_candidates(query_texts=["Test candidate"]), ValueError)

#     # Remove temp test database
#     os.remove(temp_test_db_path)


# def test_calc_scores_for_candidates():
#     # Copy new temp test database
#     copyfile(test_db_path, temp_test_db_path)
#     document_store = FAISSDocumentStore(sql_url=f"sqlite:///{temp_test_db_path}")
#     cand_vectorizer = TfidfDocVectorizer(128)
#     rtrv_vectorizer = TfidfDocVectorizer(256)
#     retriever = Retriever(
#         document_store=document_store,
#         candidate_vectorizer=cand_vectorizer,
#         retriever_vectorizer=rtrv_vectorizer,
#     )
#     assert_raises(
#         retriever._calc_scores_for_candidates(
#             query_text="Test candidate", candidate_ids=[1, 2, 0]
#         ), ValueError
#     )

#     # Remove temp test database
#     os.remove(temp_test_db_path)


# def test_batch_retriever():
#     # Copy new temp test database
#     copyfile(test_db_path, temp_test_db_path)

#     # Get a document from the database as input for retriever
#     print("Query sample input from database")
#     url = f"sqlite:///{temp_test_db_path}"
#     engine = create_engine(url)
#     ORMBase.metadata.create_all(engine)
#     Session = sessionmaker(bind=engine)
#     session = Session()

#     query = session.query(DocumentORM).filter_by().limit(5)

#     # Get text from query to input
#     input_doc = query.all()[0].text
#     print(" ".join(input_doc.split(" ")[:50]))  # print the query doc

#     # Init expected result
#     # expected_id_result = query.all()[0].id
#     expected_score_result = 1

#     print("Init vectorizers")
#     cand_vectorizer = TfidfDocVectorizer(128)
#     rtrv_vectorizer = TfidfDocVectorizer(256)

#     print("Init DocumentStore")
#     document_store = FAISSDocumentStore(sql_url=f"sqlite:///{temp_test_db_path}")

#     print("Init retriever")
#     retriever = Retriever(
#         document_store=document_store,
#         candidate_vectorizer=cand_vectorizer,
#         retriever_vectorizer=rtrv_vectorizer,
#     )

#     # Train vectorizers for two phases of searching
#     print("Training vectorizers")
#     retriever.train_candidate_vectorizer()
#     retriever.train_retriever_vectorizer()

#     # Subtets 1 check raise ERROR synchronize
#     assert_raises(
#         retriever.batch_retrieve([input_doc], top_k_results=10), ValueError)

#     # Update trained embeddings to DocumentStore
#     print("Updating embeddings to DocumentStore")
#     retriever.update_embeddings()

#     print("Retrieving")

#     # Test without process input data
#     result = retriever.batch_retrieve([input_doc], top_k_results=10)
#     # print the retrieved doc
#     print(" ".join(result[0]["retrieve_result"].split(" ")[:50]))

#     assert result[0]["query_doc"] == input_doc
#     # assert result[0]["retrieve_result"] == expected_id_result
#     assert result[0]["similarity_score"] == expected_score_result

#     # Test with processing input data
#     result = retriever.batch_retrieve(
#         [input_doc], top_k_results=10, process_query_docs=True
#     )
#     # print the retrieved doc
#     print(" ".join(result[0]["retrieve_result"].split(" ")[:50]))

#     assert result[0]["query_doc"] == input_doc
#     # assert result[0]["retrieve_result"] == expected_id_result
#     assert result[0]["similarity_score"] == expected_score_result

#     # Remove temp test database
#     os.remove(temp_test_db_path)
