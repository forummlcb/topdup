import os
import uuid
from datetime import datetime, timedelta

import pandas as pd
import schedule
from sqlalchemy.exc import ProgrammingError
from tqdm.auto import tqdm

from modules.ml.document_store.faiss import FAISSDocumentStore
from modules.ml.retriever.retriever import Retriever
from modules.ml.utils import get_logger, meta_parser
from modules.ml.vectorizer.tf_idf import TfidfDocVectorizer

LOCAL_DB_URI = os.getenv("LOCAL_DB_URI", "sqlite:///local.db")
POSTGRES_URI = os.getenv(
    "POSTGRES_URI", "postgresql+psycopg2://user:pwd@host/topdup_articles"
)
CAND_DIM = 768
RTRV_DIM = 1024
HARD_SIM_THRESHOLD = 0.8
CAND_PATH = os.getenv("CAND_PATH", "vectorizer_cand.bin")
RTRV_PATH = os.getenv("RTRV_PATH", "vectorizer_rtrv.bin")
INDEX = "document"
LOCAL_IDX_PATH = os.getenv("LOCAL_IDX_PATH", "faiss_index_local.bin")
REMOTE_IDX_PATH = os.getenv("REMOTE_IDX_PATH", "faiss_index_remote.bin")


logger = get_logger()


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
    """This method runs in serial as follow:

    - Compares list of `document_id` between local and
    remote database
    - Fetches and writes new documents into local database
    - Updates embeddings and vector ids on small FAISS index
    - Runs batch retriever to pre-calculate the similarity scores
    and updates metadata on remote database
    """

    if not local_doc_store or not remote_doc_store:
        logger.warning("DB connection not initialized, try to re-connect...")
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
            from_time=now - timedelta(days=1), index=INDEX
        )

    local_ids = local_doc_store.get_document_ids(index=INDEX)

    # Filter existing ids in local out of recent updated ids from remote db
    new_ids = sorted([_id for _id in new_ids if _id not in local_ids])

    if not new_ids:
        logger.info(f"No new updates in local db")
        return

    docs = remote_doc_store.get_documents_by_id(new_ids, index=INDEX)
    logger.info(f"Retrieved {len(docs)} docs")

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

    local_retriever.train_candidate_vectorizer(retrain=False, save_path=CAND_PATH)
    local_retriever.train_retriever_vectorizer(retrain=False, save_path=RTRV_PATH)
    logger.info("Vectorizers loaded")

    local_retriever.update_embeddings(
        retrain=True, save_path=LOCAL_IDX_PATH, sql_url=LOCAL_DB_URI
    )
    logger.info("Embeddings updated")

    results = local_retriever.batch_retrieve(docs)

    # Split payloads to chunks to reduce pressure on the database
    results_chunks = list(chunks(results, 1000))

    for i in tqdm(range(len(results_chunks)), desc="Updating meta.....  "):
        id_meta = list()
        for r in results_chunks[i]:
            rank = "_".join(list(r.keys())[-1].split("_")[-2:])
            sim_score = r.get(f"sim_score_{rank}", 0)
            if sim_score > HARD_SIM_THRESHOLD:
                sim_data = {
                    "document_id": r["document_id"],
                    f"sim_score_{rank}": sim_score,
                    f"similar_to_{rank}": r[f"sim_document_id_{rank}"],
                }
                id_meta.append(sim_data)

        if id_meta:
            remote_doc_store.update_documents_meta(id_meta=id_meta)
    logger.info("Similarity scores updated into metadata")

    consolidate_sim_docs(remote_doc_store)


def update_remote_db(remote_doc_store):
    """This method updates embeddings and vector ids on remote database
    """

    remote_retriever = Retriever(
        document_store=remote_doc_store,
        candidate_vectorizer=TfidfDocVectorizer(CAND_DIM),
        retriever_vectorizer=TfidfDocVectorizer(RTRV_DIM),
    )
    remote_retriever.train_candidate_vectorizer(retrain=False, save_path=CAND_PATH)
    remote_retriever.update_embeddings(retrain=True)
    logger.info("Remote embeddings and vector ids updated")


def consolidate_sim_docs(remote_doc_store):
    """This method gathers the similar document pairs and writes to `similar_docs` table
    """

    docs = remote_doc_store.get_similar_documents_by_threshold(
        threshold=HARD_SIM_THRESHOLD, from_time=datetime.now() - timedelta(days=7)
    )

    if not docs:
        logger.info(f"No new similar docs")
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
        except ValueError as e:
            logger.error(f"{str(e)}: doc = {doc}")

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
        logger.info(f"No new similar docs")
        return
    else:
        logger.info(f"Retrieved {len(df)} similar docs")

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
    schedule.every().day.at("00:00").do(update_remote_db, remote_doc_store)
    while True:
        schedule.run_pending()
