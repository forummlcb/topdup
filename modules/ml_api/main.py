import os
from copy import deepcopy

import pandas as pd
from fastapi import FastAPI, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from scipy.optimize import linear_sum_assignment
from sklearn.metrics.pairwise import cosine_similarity
from starlette.exceptions import HTTPException as StarletteHTTPException

from modules.ml.document_store.faiss import FAISSDocumentStore
from modules.ml.preprocessor.vi_preprocessor import ViPreProcessor
from modules.ml.retriever.retriever import Retriever
from modules.ml.vectorizer.tf_idf import TfidfDocVectorizer
from modules.ml_api.models import CompareEntry, QueryResult

# Environment variables
POSTGRES_URI = os.getenv(
    "POSTGRES_URI", "postgresql+psycopg2://user:pwd@host/topdup_articles"
)
CAND_DIM = 768
RTRV_DIM = 1024
EDIT_DISTANCE_THRESHOLD = 0.25
CAND_PATH = os.getenv("CAND_PATH", "cand.bin")
URL_QUERY = """
    SELECT text_original
    FROM (
        SELECT value AS url
            ,document_id
        FROM meta m
        WHERE lower(name) IN (
                'href'
                ,'url'
                )
        ) AS url_table
    INNER JOIN "document" d ON url_table.document_id = d.id
    WHERE CAST(levenshtein('{0}', url) AS DECIMAL) / CAST(length(url) AS DECIMAL) < {1}
    ORDER BY levenshtein('{0}', url) LIMIT 1
"""

# Default methods
preprocessor = ViPreProcessor(split_by="sentence")

document_store = FAISSDocumentStore(
    sql_url=POSTGRES_URI, vector_dim=CAND_DIM, index_buffer_size=5000
)

retriever = Retriever(
    document_store=document_store,
    candidate_vectorizer=TfidfDocVectorizer(CAND_DIM),
    retriever_vectorizer=TfidfDocVectorizer(RTRV_DIM),
)
retriever.train_candidate_vectorizer(retrain=False, save_path=CAND_PATH)

remote_doc_store = FAISSDocumentStore(sql_url=POSTGRES_URI, vector_dim=CAND_DIM)

tags_metadata = [
    {"name": "get", "description": "Properly do nothing now"},
    {
        "name": "compare",
        "description": "Compare and show the similar sentences between two documents",
    },
]
app = FastAPI(
    title="TopDup-ML",
    description="Allow other services to connect with ML engines",
    version="0.0.1",
    openapi_tags=tags_metadata,
)


@app.get("/", tags=["get"])
def get_query():
    return Response()


def compare_(text_A: str, text_B: str):
    # Split texts before cleaning
    s_text_A = preprocessor.split({"text": text_A})
    s_text_B = preprocessor.split({"text": text_B})

    # Clean texts
    sc_text_A = deepcopy(s_text_A)
    sc_text_B = deepcopy(s_text_B)
    sc_text_A = [preprocessor.clean(s_text) for s_text in sc_text_A]
    sc_text_B = [preprocessor.clean(s_text) for s_text in sc_text_B]

    # Calculate embedding vectors
    embedding_vectors_A = retriever.candidate_vectorizer.transform(
        [t["text"] for t in sc_text_A]
    )
    embedding_vectors_B = retriever.candidate_vectorizer.transform(
        [t["text"] for t in sc_text_B]
    )

    # Maximize the sum of similiraties
    sim_matrix = cosine_similarity(embedding_vectors_A, embedding_vectors_B)
    row_idx, col_idx = linear_sum_assignment(sim_matrix, maximize=True)

    pairs = list()
    for a, b in zip(row_idx, col_idx):
        pairs.append(
            {
                "segmentIdxA": s_text_A[a]["meta"]["_split_id"],
                "segmentIdxB": s_text_B[b]["meta"]["_split_id"],
                "similarityScore": sim_matrix[a, b],
            }
        )

    return {
        "segmentListA": [s["text"] for s in s_text_A],
        "segmentListB": [s["text"] for s in s_text_B],
        "pairs": pairs,
    }


@app.post(
    "/compare",
    response_model=QueryResult,
    status_code=status.HTTP_200_OK,
    tags=["compare"],
)
def compare(entry: CompareEntry, response: Response):
    if entry.pairs[0].mode == "url":
        text_A = pd.read_sql_query(
            URL_QUERY.format(entry.pairs[0].content, EDIT_DISTANCE_THRESHOLD),
            con=remote_doc_store.engine,
        )
        if text_A.empty:
            response.status_code = status.HTTP_400_BAD_REQUEST
            return {"message": "We cannot find your URLs"}
        else:
            text_A = text_A.values[0][0]
    elif entry.pairs[0].mode == "text":
        text_A = entry.pairs[0].content
    else:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return {"message": "Invalid input mode, either url or text"}

    if entry.pairs[1].mode == "url":
        text_B = pd.read_sql_query(
            URL_QUERY.format(entry.pairs[1].content, EDIT_DISTANCE_THRESHOLD),
            con=remote_doc_store.engine,
        )
        if text_B.empty:
            response.status_code = status.HTTP_400_BAD_REQUEST
            return {"message": "We cannot find your URLs"}
        else:
            text_B = text_B.values[0][0]
    elif entry.pairs[1].mode == "text":
        text_B = entry.pairs[1].content
    else:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return {"message": "Invalid input mode, either url or text"}

    results = compare_(text_A, text_B)
    return {"message": "Successfully requested TopDup-ML [compare]", "results": results}


@app.exception_handler(RequestValidationError)
def validation_exception_handler(request, exc):
    msg = ", ".join([f'{err["loc"]}: {err["msg"]}' for err in exc.errors()])
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST, content={"message": msg}
    )


@app.exception_handler(StarletteHTTPException)
def http_exception_handler(request, exc):
    code = status.HTTP_400_BAD_REQUEST
    msg = str(exc)
    if exc.status_code == 404:
        code = status.HTTP_404_NOT_FOUND
        msg = exc.detail

    return JSONResponse(status_code=code, content={"message": msg})


if __name__ == "__main__":
    # For debugging only
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
