import itertools
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from uuid import uuid4

import pandas as pd
from sqlalchemy import Column, DateTime, ForeignKey, String, Text, create_engine, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.sql import case, null
from tqdm.auto import tqdm

from modules.ml.constants import META_MAPPING
from modules.ml.document_store.base import BaseDocumentStore
from modules.ml.schema import Document
from modules.ml.utils import get_logger

logger = get_logger()


Base = declarative_base()  # type: Any

WHITELIST = ["genk", "cafebiz"]


class ORMBase(Base):
    __abstract__ = True

    id = Column(String(100), default=lambda: str(uuid4()), primary_key=True)
    created = Column(DateTime, server_default=func.now())
    updated = Column(DateTime, server_default=func.now(), server_onupdate=func.now())


class DocumentORM(ORMBase):
    __tablename__ = "document"

    text = Column(Text, nullable=False)
    index = Column(String(100), nullable=False)
    vector_id = Column(String(100), unique=True, nullable=True)

    # speeds up queries for get_documents_by_vector_ids() by having a single query that returns joined metadata
    meta = relationship("MetaORM", backref="Document", lazy="joined")


class MetaORM(ORMBase):
    __tablename__ = "meta"

    name = Column(String(100), index=True)
    value = Column(String(1000), index=True)
    document_id = Column(
        String(100),
        ForeignKey("document.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True,
    )

    documents = relationship(DocumentORM, backref="Meta")


class SQLDocumentStore(BaseDocumentStore):
    def __init__(
        self,
        url: str,
        index: str = "document",
        label_index: str = "label",
        update_existing_documents: bool = False,
        batch_size: int = 1000,
    ):
        """An SQL backed DocumentStore. Currently supports SQLite, PostgreSQL and MySQL backends.

        Attributes:
            url (str): URL for SQL database as expected by SQLAlchemy.
                Defaults to "postgresql+psycopg2://".
                More info here: https://docs.sqlalchemy.org/en/13/core/engines.html#database-urls.
            index (str, optional): The documents are scoped to an index attribute that
                can be used when writing, querying, or deleting documents.
                Defaults to "document".
            label_index (str, optional): The default value of index attribute for the labels.
                Defaults to "label".
            update_existing_documents (bool, optional): Whether to update any existing
                documents with the same ID when adding documents.
                When set as True, any document with an existing ID gets updated.
                If set to False, an error is raised if the document ID of the document
                being added already exists. Using this parameter could cause
                performance degradation for document insertion. Defaults to False.
            batch_size (int, optional): Maximum number of variable parameters and rows
                fetched in a single SQL statement, to help in excessive memory allocations.
                In most methods of the DocumentStore this means number of documents fetched in one query.
                Tune this value based on host machine main memory.
                For SQLite versions prior to v3.32.0 keep this value less than 1000.
                More info refer: https://www.sqlite.org/limits.html. Defaults to 1000.
        """
        engine = create_engine(url)
        self.engine = engine
        ORMBase.metadata.create_all(engine)
        Session = sessionmaker(bind=engine)
        self.session = Session()
        self.index = index
        self.label_index = label_index
        self.update_existing_documents = update_existing_documents
        if getattr(self, "similarity", None) is None:
            self.similarity = None
        self.batch_size = batch_size

    def get_document_by_id(
        self, id: str, index: Optional[str] = None
    ) -> Optional[Document]:
        """Fetches a document by specifying its text id string"""
        documents = self.get_documents_by_id([id], index)
        document = documents[0] if documents else None
        return document

    def get_documents_by_id(
        self, ids: List[str], index: Optional[str] = None
    ) -> List[Document]:
        """Fetches documents by specifying a list of text id strings"""
        index = index or self.index

        documents = []
        for i in range(0, len(ids), self.batch_size):
            query = self.session.query(DocumentORM).filter(
                DocumentORM.id.in_(ids[i : i + self.batch_size]),
                DocumentORM.index == index,
            )
            for row in query.all():
                documents.append(self._convert_sql_row_to_document(row))

        sorted_documents = sorted(documents, key=lambda doc: doc.id)
        return sorted_documents

    def get_documents_by_vector_ids(
        self, vector_ids: List[str], index: Optional[str] = None
    ):
        """Fetches documents by specifying a list of text vector id strings"""

        index = index or self.index

        documents = []
        for i in range(0, len(vector_ids), self.batch_size):
            query = self.session.query(DocumentORM).filter(
                DocumentORM.vector_id.in_(vector_ids[i : i + self.batch_size]),
                DocumentORM.index == index,
            )
            for row in query.all():
                documents.append(self._convert_sql_row_to_document(row))

        sorted_documents = sorted(
            documents, key=lambda doc: vector_ids.index(doc.vector_id)
        )
        return sorted_documents

    def get_similar_documents_by_threshold(
        self,
        threshold: float = 0.50,
        from_time: datetime = None,
        to_time: datetime = None,
    ) -> List[Document]:
        """Fetches documents by specifying a threshold to filter the similarity scores in meta data"""

        # Update `updated` column with last update timestamp per `document_id`
        with self.engine.connect() as conn:
            conn.execute(
                """
        UPDATE meta AS m1
        SET updated = m2.last_updated
        FROM (
            SELECT document_id
                ,MAX(updated) last_updated
            FROM meta
            GROUP BY document_id
            HAVING COUNT(DISTINCT updated) > 1
            ) AS m2
        WHERE m1.document_id = m2.document_id"""
            )

        if not from_time and not to_time:  # get all
            meta = self.session.query(MetaORM)
        else:
            if not from_time:
                from_time = datetime(1970, 1, 1)
            if not to_time:
                to_time = datetime.now()
            meta = self.session.query(MetaORM).filter(
                MetaORM.updated > from_time, MetaORM.updated <= to_time
            )

        meta_df = pd.read_sql(
            sql=f"""
        SELECT DISTINCT m1.document_id_a
            ,m2.document_id_b
            ,m1.sim_score
        FROM (
            SELECT DISTINCT document_id AS document_id_a
                ,value AS sim_score
                ,updated
                ,RIGHT(name, 2) AS rank
            FROM meta
            WHERE name LIKE 'sim_score%%'
                AND cast(value AS DECIMAL) > {threshold}
            ) AS m1
        INNER JOIN (
            SELECT DISTINCT document_id AS document_id_a
                ,value AS document_id_b
                ,RIGHT(name, 2) AS rank
            FROM meta
            WHERE name LIKE 'similar_to%%'
            ) AS m2 ON m1.document_id_a = m2.document_id_a
            AND m1.rank = m2.rank
        INNER JOIN (
            SELECT DISTINCT document_id
                ,lower(value) AS "domain"
            FROM meta
            WHERE LOWER("name") IN ({", ".join(["'{}'".format(x) for x in META_MAPPING["domain"]])})
            ) AS m3 ON m1.document_id_a = m3.document_id
        INNER JOIN (
            SELECT DISTINCT document_id
                ,LOWER(value) AS "domain"
            FROM meta
            WHERE LOWER("name") IN ({", ".join(["'{}'".format(x) for x in META_MAPPING["domain"]])})
            ) AS m4 ON m2.document_id_b = m4.document_id
        --filter rules defined by PO
        WHERE (m3.domain NOT IN ({", ".join(["'{}'".format(x) for x in WHITELIST])})
            OR m4.domain NOT IN ({", ".join(["'{}'".format(x) for x in WHITELIST])}))
        AND m3.domain != m4.domain
        AND m1.updated > '{from_time.strftime("%Y-%m-%d %H:%M:%S")}'""",
            con=self.engine,
        )

        documents = list()
        document_id_AB = list()
        for _, row in meta_df.iterrows():
            document_id_AB.append(
                sorted([row["document_id_a"], row["document_id_b"]])
                + [row["sim_score"]]
            )
        # Remove duplicate A-->B and B-->A are identical
        document_id_AB_set = set(tuple(x) for x in document_id_AB)
        document_id_AB = [list(x) for x in document_id_AB_set]

        for document_id in tqdm(document_id_AB):
            meta_A = dict()
            meta_B = dict()

            meta_A.update({"document_id": document_id[0]})
            meta_B.update({"document_id": document_id[1]})
            for row in meta.filter(MetaORM.document_id == document_id[0]).all():
                if "sim" not in row.name:
                    meta_A.update({row.name: row.value})
            for row in meta.filter(MetaORM.document_id == document_id[1]).all():
                if "sim" not in row.name:
                    meta_B.update({row.name: row.value})
            meta_A.update({"sim_score": document_id[2]})
            meta_B.update({"sim_score": document_id[2]})

            documents.append((meta_A, meta_B))

        return documents

    def get_all_documents(
        self,
        index: Optional[str] = None,
        filters: Optional[Dict[str, List[str]]] = None,
        return_embedding: Optional[bool] = None,
    ) -> List[Document]:
        """Gets all documents from the DocumentStore.

        Args:
            index (str, optional): Name of the index to get the documents from. If None,
                DocumentStore's default index (self.index) will be used.
                Defaults to None.
            filters (Dict[str, List[str]], optional): Optional filters to narrow down
                the documents to return.
                Example: {"name": ["some", "more"], "category": ["only_one"]}.
                Defaults to None.
            return_embedding (bool, optional): Whether to return the document embeddings.
                Defaults to None.

        Returns:
            List[Document]
        """

        index = index or self.index
        # Generally ORM objects kept in memory cause performance issue
        # Hence using directly column name improve memory and performance.
        documents_query = self.session.query(
            DocumentORM.id, DocumentORM.text, DocumentORM.vector_id
        ).filter_by(index=index)

        if filters:
            documents_query = documents_query.join(MetaORM)
            for key, values in filters.items():
                documents_query = documents_query.filter(
                    MetaORM.name == key,
                    MetaORM.value.in_(values),
                    DocumentORM.id == MetaORM.document_id,
                )

        documents_map = {}
        for row in documents_query.all():
            documents_map[row.id] = Document(
                id=row.id,
                text=row.text,
                meta=None
                if row.vector_id is None
                else {"vector_id": row.vector_id},  # type: ignore
            )

        for doc_ids in self.chunked_iterable(
            documents_map.keys(), size=self.batch_size
        ):
            meta_query = self.session.query(
                MetaORM.document_id, MetaORM.name, MetaORM.value
            ).filter(MetaORM.document_id.in_(doc_ids))

            for row in meta_query.all():
                if documents_map[row.document_id].meta is None:
                    documents_map[row.document_id].meta = {}
                documents_map[row.document_id].meta[
                    row.name
                ] = row.value  # type: ignore

        return list(documents_map.values())

    def write_documents(
        self, documents: Union[List[dict], List[Document]], index: Optional[str] = None
    ):
        """Indexes documents for later queries.

        Args:
            documents (Union[List[dict], List[Document]]): a list of Python dictionaries
                or a list of Haystack Document objects.
                For documents as dictionaries, the format is {"text": "<the-actual-text>"}.
                Optionally: Include meta data via {"text": "<the-actual-text>",
                "meta":{"name": "<some-document-name>, "author": "somebody", ...}}
                It can be used for filtering and is accessible in the responses of the Finder.
            index (Optional[str], optional): add an optional index attribute to documents.
                It can be later used for filtering.
                For instance, documents for evaluation can be indexed in a separate
                index than the documents for search. Defaults to None.

        Raises:
            Exception: raised when session can not commit.
        """
        # TODO handle Iterable type
        index = index or self.index
        if len(documents) == 0:
            return

        # Make sure we comply to Document class format
        if isinstance(documents[0], dict):
            document_objects = [
                Document.from_dict(d) if isinstance(d, dict) else d for d in documents
            ]
        else:
            document_objects = documents

        for i in range(0, len(document_objects), self.batch_size):
            for doc in document_objects[i : i + self.batch_size]:
                meta_fields = doc.meta or {}
                # vector_id = meta_fields.get("vector_id")
                vector_id = doc.vector_id
                meta_orms = [
                    MetaORM(name=key, value=value) for key, value in meta_fields.items()
                ]

                doc_orm = DocumentORM(
                    id=doc.id,
                    text=doc.text,
                    vector_id=vector_id,
                    meta=meta_orms,
                    index=index,
                )

                if self.update_existing_documents:
                    # First old meta data cleaning is required
                    self.session.query(MetaORM).filter_by(document_id=doc.id).delete()
                    self.session.merge(doc_orm)
                else:
                    self.session.add(doc_orm)

            try:
                self.session.commit()
            except Exception as ex:
                logger.error(f"Transaction rollback: {ex.__cause__}")
                # Rollback is important here otherwise self.session will be in inconsistent state and next call will fail
                self.session.rollback()
                raise ex

    def reset_vector_ids(self, index: Optional[str] = None):
        """Sets vector IDs for all documents as None
        """
        index = index or self.index
        self.session.query(DocumentORM).filter_by(index=index).update(
            {DocumentORM.vector_id: null()}
        )
        self.session.commit()

    def update_vector_ids(
        self, vector_id_map: Dict[str, str], index: Optional[str] = None
    ):
        """Updates vector_ids for given document_ids.

        Args:
            vector_id_map (Dict[str, str]): dict containing mapping of document_id -> vector_id.
            index (Optional[str], optional): filter documents by the optional index attribute for documents in database.
                                             Defaults to None.

        Raises:
            Exception: raised when session can not commit.
        """
        index = index or self.index
        for chunk_map in self.chunked_dict(vector_id_map, size=self.batch_size):
            self.session.query(DocumentORM).filter(
                DocumentORM.id.in_(chunk_map), DocumentORM.index == index
            ).update(
                {DocumentORM.vector_id: case(chunk_map, value=DocumentORM.id)},
                synchronize_session=False,
            )
            try:
                self.session.commit()
            except Exception as ex:
                logger.error(f"Transaction rollback: {ex.__cause__}")
                self.session.rollback()
                raise ex

    def update_document_meta(self, id: str, meta: Dict[str, str]):
        """Updates the metadata dictionary of a document by specifying its string id
        """
        query = self.session.query(MetaORM).filter_by(document_id=id)
        current_meta = dict()
        for row in query.all():
            current_meta.update({row.name: row.value})
        query.delete()

        meta.update(current_meta)
        meta_orms = [
            MetaORM(name=key, value=value, document_id=id)
            for key, value in meta.items()
        ]

        for m in meta_orms:
            self.session.add(m)
        self.session.commit()

    def update_documents_meta(self, id_meta: List[Dict[str, str]]):
        """Updates the metadata dictionary of multiple documents
        """
        # Query the current metadata of documents
        document_ids = list(set([im["document_id"] for im in id_meta]))
        names = list(set(sum([list(im.keys()) for im in id_meta], [])))
        names.remove("document_id")
        current_meta = pd.read_sql(
            sql="""
        SELECT DISTINCT document_id, name, value FROM meta
        WHERE document_id IN ({})""".format(
                ", ".join(["'{}'".format(id) for id in document_ids])
            ),
            con=self.engine,
        )

        # Remove the current metadata from table
        with self.engine.connect() as conn:
            conn.execute(
                """
        DELETE FROM meta
        WHERE document_id IN ({0})
        AND name IN ({1})""".format(
                    ", ".join(["'{}'".format(id) for id in document_ids]),
                    ", ".join(["'{}'".format(name) for name in names]),
                )
            )

        # Insert the metadata on DataFrame `current_meta`
        ## Build id_meta to DataFrame
        id_meta_df = list()
        for im in id_meta:
            for k in im.keys():
                if k != "document_id":
                    id_meta_df.append([im["document_id"], k, im[k]])

        id_meta_df = pd.DataFrame(id_meta_df, columns=current_meta.columns)
        ## Bulk insert
        df = pd.merge(
            current_meta,
            id_meta_df,
            how="outer",
            on=["document_id", "name"],
            suffixes=("_current", "_update"),
        )
        df = df[df["value_update"].notna()]

        insert = list()
        for _, row in df.iterrows():
            insert.append(
                {
                    "name": row["name"],
                    "value": row["value_update"],
                    "document_id": row["document_id"],
                }
            )
        self.engine.execute(MetaORM.__table__.insert().values(insert))

    def get_document_count(
        self,
        filters: Optional[Dict[str, List[str]]] = None,
        index: Optional[str] = None,
    ) -> int:
        """Returns the number of documents in the DocumentStore.
        """
        index = index or self.index
        query = self.session.query(DocumentORM).filter_by(index=index)

        if filters:
            query = query.join(MetaORM)
            for key, values in filters.items():
                query = query.filter(MetaORM.name == key, MetaORM.value.in_(values))

        count = query.count()
        return count

    def get_document_ids(
        self,
        from_time: datetime = None,
        to_time: datetime = None,
        index: Optional[str] = None,
    ) -> List[str]:
        """Returns list of document ids in the DocumentStore.

        Args:
            from_time (datetime, optional). Defaults to None.
            to_time (datetime, optional). Defaults to None.
            index (str, optional): Specify an index name if needed. Defaults to None.

        Returns:
            List[str]: List of document ids only
        """
        if not from_time and not to_time:  # get all
            query = self.session.query(DocumentORM.id).filter_by(index=index)
        else:
            if not from_time:
                from_time = datetime(1970, 1, 1)
            if not to_time:
                to_time = datetime.now()
            query = self.session.query(
                DocumentORM.id, DocumentORM.index, DocumentORM.updated
            ).filter(
                DocumentORM.updated > from_time,
                DocumentORM.updated <= to_time,
                DocumentORM.index == index,
            )
        return [row.id for row in query.all()]

    def _convert_sql_row_to_document(self, row) -> Document:
        document = Document(
            id=row.id, text=row.text, meta={meta.name: meta.value for meta in row.meta}
        )
        if row.vector_id:
            document.vector_id = row.vector_id
        return document

    def query_by_embedding(
        self,
        query_emb: List[float],
        filters: Optional[dict] = None,
        top_k: int = 10,
        index: Optional[str] = None,
        return_embedding: Optional[bool] = None,
    ) -> List[Document]:

        raise NotImplementedError(
            "SQLDocumentStore is currently not supporting embedding queries. "
            "Change the query type (e.g. by choosing a different retriever) "
            "or change the DocumentStore (e.g. to ElasticsearchDocumentStore)"
        )

    def delete_all_documents(
        self,
        index: Optional[str] = None,
        filters: Optional[Dict[str, List[str]]] = None,
    ):
        """Deletes documents in an index. All documents are deleted if no filters are passed.

        Args:
            index (str, optional): Index name to delete the document from.
                Defaults to None.
            filters (Dict[str, List[str]], optional): Optional filters to narrow down
                the documents to be deleted. Defaults to None.

        Raises:
            NotImplementedError: Delete by filters is not implemented for SQLDocumentStore.
        """
        if filters:
            raise NotImplementedError(
                "Delete by filters is not implemented for SQLDocumentStore."
            )
        index = index or self.index
        documents = self.session.query(DocumentORM).filter_by(index=index)
        documents.delete(synchronize_session=False)

    def _get_or_create(self, session, model, **kwargs):
        instance = session.query(model).filter_by(**kwargs).first()
        if instance:
            return instance
        else:
            instance = model(**kwargs)
            session.add(instance)
            session.commit()
            return instance

    # Refer: https://alexwlchan.net/2018/12/iterating-in-fixed-size-chunks/
    def chunked_iterable(self, iterable, size):
        it = iter(iterable)
        while True:
            chunk = tuple(itertools.islice(it, size))
            if not chunk:
                break
            yield chunk

    def chunked_dict(self, dictionary, size):
        it = iter(dictionary)
        for i in range(0, len(dictionary), size):
            yield {k: dictionary[k] for k in itertools.islice(it, size)}
