import logging
import os
import uuid
from datetime import datetime, timedelta

import pandas as pd
import schedule
from sqlalchemy.exc import ProgrammingError
from tqdm.auto import tqdm

from modules.ml.document_store.faiss import FAISSDocumentStore
from modules.ml.retriever.retriever import Retriever
from modules.ml.utils import meta_parser
from modules.ml.vectorizer.tf_idf import TfidfDocVectorizer

LOCAL_DB_URI = os.getenv("LOCAL_DB_URI", "sqlite:///local.db")
POSTGRES_URI = os.getenv(
    "POSTGRES_URI", "postgresql+psycopg2://user:pwd@host/topdup_articles"
)
CAND_DIM = 768
RTRV_DIM = 1024
HARD_SIM_THRESHOLD = 0.5
CAND_PATH = os.getenv("CAND_PATH", "vectorizer_cand.bin")
RTRV_PATH = os.getenv("RTRV_PATH", "vectorizer_rtrv.bin")
INDEX = "document"
LOCAL_IDX_PATH = os.getenv("LOCAL_IDX_PATH", "faiss_index_local.bin")
REMOTE_IDX_PATH = os.getenv("REMOTE_IDX_PATH", "faiss_index_remote.bin")

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


def get_connection(uri: str, vector_dim: int):
    try:
        conn = FAISSDocumentStore(sql_url=uri, vector_dim=vector_dim)
        return conn
    except Exception as e:
        logger.error(e)
        return None


def chunks(lst, n):
    """Yield successive n-sized chunks from list
    """
    for i in range(0, len(lst), n):
        yield lst[i : i + n]


def update_local_db(local_doc_store, remote_doc_store):
    """
    Write a proper docstring later
    This method runs in serial as follow:
    1. Get document ids from remote and local db
    2. Check if there is new document
    If Yes:
    3. Write new document to local db
    4. Update embeddings on small FAISS index
    5. Update vector ids on local db
    6. Run sequential retriever to pre-calculate the similarity scores
    and update on local db meta data
    """

    if not local_doc_store or not remote_doc_store:
        logger.warning("DB connection not initialized, trying re-connect...")
        local_doc_store = get_connection(LOCAL_DB_URI, CAND_DIM)
        remote_doc_store = get_connection(POSTGRES_URI, CAND_DIM)
        if not local_doc_store or not remote_doc_store:
            logger.error("DB initialization failed, quit local_update...")
            return

    remote_reindex = not os.path.exists(REMOTE_IDX_PATH)
    now = datetime.now()
    if remote_reindex:
        new_ids = remote_doc_store.get_document_ids(
            from_time=now - timedelta(days=365), index=INDEX
        )
    else:
        new_ids = remote_doc_store.get_document_ids(
            from_time=now - timedelta(minutes=3), index=INDEX
        )
    if not new_ids:
        logger.info(f"No new updates in local db at {now}")
        return

    local_ids = local_doc_store.get_document_ids(index=INDEX)

    # Filter existing ids in local out of recent updated ids from remote db
    new_ids = sorted([_id for _id in new_ids if _id not in local_ids])

    docs = remote_doc_store.get_documents_by_id(new_ids, index=INDEX)
    logger.info(f"Retrieved {len(docs)} at {datetime.now()}")

    local_doc_store.write_documents(docs)
    logger.info(f"Stored {len(docs)} docs to local db")

    local_retriever = Retriever(
        document_store=local_doc_store,
        candidate_vectorizer=TfidfDocVectorizer(CAND_DIM),
        retriever_vectorizer=TfidfDocVectorizer(RTRV_DIM),
    )
    remote_retriever = Retriever(
        document_store=remote_doc_store,
        candidate_vectorizer=TfidfDocVectorizer(CAND_DIM),
        retriever_vectorizer=TfidfDocVectorizer(RTRV_DIM),
    )

    if not os.path.exists(CAND_PATH) or not os.path.exists(RTRV_PATH):
        remote_retriever.train_candidate_vectorizer(retrain=True, save_path=CAND_PATH)
        remote_retriever.train_retriever_vectorizer(retrain=True, save_path=RTRV_PATH)
        logger.info("Vectorizers retrained")
    else:
        remote_retriever.train_candidate_vectorizer(retrain=False, save_path=CAND_PATH)
        remote_retriever.train_retriever_vectorizer(retrain=False, save_path=RTRV_PATH)

    local_retriever.train_candidate_vectorizer(retrain=False, save_path=CAND_PATH)
    local_retriever.train_retriever_vectorizer(retrain=False, save_path=RTRV_PATH)
    logger.info("Vectorizers loaded")

    local_retriever.update_embeddings(
        retrain=True, save_path=LOCAL_IDX_PATH, sql_url=LOCAL_DB_URI
    )
    remote_retriever.update_embeddings(
        retrain=remote_reindex, save_path=REMOTE_IDX_PATH, sql_url=POSTGRES_URI
    )
    logger.info("Embeddings updated")

    docs = [doc.text for doc in docs]

    if remote_reindex:
        local_results = local_retriever.batch_retrieve(docs)
        remote_results = local_results.copy()
    else:
        local_results = local_retriever.batch_retrieve(docs)
        remote_results = remote_retriever.batch_retrieve(docs)

    # Split payloads to chunks to reduce pressure on the database
    new_ids_chunks = list(chunks(new_ids, 1000))
    local_results_chunks = list(chunks(local_results, 1000))
    remote_results_chunks = list(chunks(remote_results, 1000))
    id_meta = dict()
    for i in tqdm(range(len(new_ids_chunks)), desc="Updating meta.....  "):
        for _id, l, r in zip(
            new_ids_chunks[i], local_results_chunks[i], remote_results_chunks[i]
        ):
            rank = "_".join(list(l.keys())[-1].split("_")[-2:])
            local_sim = l.get(f"sim_score_{rank}", 0)
            remote_sim = r.get(f"sim_score_{rank}", 0)
            if (local_sim > HARD_SIM_THRESHOLD) & (remote_sim > HARD_SIM_THRESHOLD):
                if local_sim >= remote_sim:
                    sim_data = {
                        f"sim_score_{rank}": local_sim,
                        f"similar_to_{rank}": l[f"sim_document_id_{rank}"],
                    }
                else:
                    sim_data = {
                        f"sim_score_{rank}": remote_sim,
                        f"similar_to_{rank}": r[f"sim_document_id{rank}"],
                    }
                id_meta.update({_id: sim_data})

        remote_doc_store.update_documents_meta(id_meta=id_meta)
    logger.info("Similarity scores updated into metadata")


def update_remote_db(remote_doc_store):
    """
    Write a proper docstring later
    This method runs in serial as follow:
    1. Update embeddings on large FAISS index
    2. Update vector ids on remote db
    3. Update meta data of documents on local db to remote db
    4. Clear local db
    """

    remote_retriever = Retriever(
        document_store=remote_doc_store,
        candidate_vectorizer=TfidfDocVectorizer(CAND_DIM),
        retriever_vectorizer=TfidfDocVectorizer(RTRV_DIM),
    )
    remote_retriever.train_candidate_vectorizer(retrain=False, save_path=CAND_PATH)
    remote_retriever.update_embeddings(retrain=True)
    logger.info("Remote embeddings and vector ids updated")

    local_doc_store.delete_all_documents()


def consolidate_sim_docs(remote_doc_store):
    """
    Write a proper docstring later
    """

    docs = remote_doc_store.get_similar_documents_by_threshold(
        threshold=HARD_SIM_THRESHOLD, from_time=datetime.now() - timedelta(minutes=3)
    )

    if not docs:
        logger.info(f"No new similar docs at {datetime.now()}")
        return

    data = list()
    for doc in tqdm(docs, desc="Consolidating.....  "):
        try:
            data.append(
                [
                    doc[0]["document_id"],
                    doc[1]["document_id"],
                    meta_parser("domain", doc[0]),
                    meta_parser("domain", doc[1]),
                    meta_parser("url", doc[0]),
                    meta_parser("url", doc[1]),
                    meta_parser("publish_date", doc[0]),
                    meta_parser("publish_date", doc[1]),
                    meta_parser("title", doc[0]),
                    meta_parser("title", doc[1]),
                    doc[0]["sim_score"],
                    str(
                        uuid.uuid5(
                            uuid.NAMESPACE_DNS,
                            doc[0]["document_id"] + doc[1]["document_id"],
                        )
                    ),
                ]
            )
        except Exception as e:
            logger.error(str(e))
            logger.info(doc)

    df = pd.DataFrame(
        data,
        columns=[
            "document_id_A",
            "document_id_B",
            "domain_A",
            "domain_B",
            "url_A",
            "url_B",
            "publish_date_A",
            "publish_date_B",
            "title_A",
            "title_B",
            "sim_score",
            "sim_id",
        ],
    )

    try:
        existing_sim_id = pd.read_sql(
            sql="SELECT DISTINCT sim_id FROM similar_docs", con=remote_doc_store.engine
        )["sim_id"].values.tolist()
    except ProgrammingError:
        existing_sim_id = list()
    df = df[~df.sim_id.isin(existing_sim_id)]

    if df.empty:
        logger.info(f"No new similar docs at {datetime.now()}")
        return
    else:
        logger.info(f"Retrieved {len(df)} similar docs at {datetime.now()}")

    df.to_sql(
        name="similar_docs",
        schema="public",
        con=remote_doc_store.engine,
        if_exists="append",
        index=False,
    )
    try:
        with remote_doc_store.engine.connect() as con:
            con.execute('ALTER TABLE similar_docs ADD PRIMARY KEY ("sim_id")')
    except ProgrammingError:
        pass


if __name__ == "__main__":
    local_doc_store = get_connection(LOCAL_DB_URI, CAND_DIM)
    remote_doc_store = get_connection(POSTGRES_URI, CAND_DIM)

    schedule.every().minute.do(update_local_db, local_doc_store, remote_doc_store)
    schedule.every().minute.do(consolidate_sim_docs, remote_doc_store)
    schedule.every().day.at("00:00").do(update_remote_db, remote_doc_store)
    while True:
        schedule.run_pending()
