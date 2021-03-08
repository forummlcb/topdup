from typing import Any, Dict, List, Optional
from uuid import uuid4

import numpy as np


class Document:
    def __init__(
        self,
        text: str,
        id: Optional[str] = None,
        score: Optional[float] = None,
        meta: Dict[str, Any] = None,
        embedding: Optional[np.array] = None,  # type: ignore
    ):
        """
        Object used to represent documents / passages in a standardized way within modules.ml.
        For example, this is what the retriever will return from the DocumentStore,
        regardless if it's ElasticsearchDocumentStore or InMemoryDocumentStore.

        Note that there can be multiple Documents originating from one file (e.g. PDF),
        if you split the text into smaller passages. We'll have one Document per passage in this case.

        :param id: ID used within the DocumentStore
        :param text: Text of the document
        :param score: Retriever's query score for a retrieved document
        :param probability: a pseudo probability by scaling score in the range 0 to 1
        :param question: Question text for FAQs.
        :param meta: Meta fields for a document like name, url, or author.
        :param embedding: Vector encoding of the text
        """

        self.text = text
        # Create a unique ID (either new one, or one from user input)
        if id:
            self.id = str(id)
        else:
            self.id = str(uuid4())

        self.score = score
        self.meta = meta or {}
        self.embedding = embedding

    def to_dict(self, field_map={}):
        inv_field_map = {v: k for k, v in field_map.items()}
        _doc: Dict[str, str] = {}
        for k, v in self.__dict__.items():
            k = k if k not in inv_field_map else inv_field_map[k]
            _doc[k] = v
        return _doc

    @classmethod
    def from_dict(cls, dict, field_map={}):
        _doc = dict.copy()
        init_args = ["text", "id", "score", "question", "meta", "embedding"]
        if "meta" not in _doc.keys():
            _doc["meta"] = {}
        # copy additional fields into "meta"
        for k, v in _doc.items():
            if k not in init_args and k not in field_map:
                _doc["meta"][k] = v
        # remove additional fields from top level
        _new_doc = {}
        for k, v in _doc.items():
            if k in init_args:
                _new_doc[k] = v
            elif k in field_map:
                k = field_map[k]
                _new_doc[k] = v

        return cls(**_new_doc)

    def __repr__(self):
        return str(self.to_dict())

    def __str__(self):
        return str(self.to_dict())
