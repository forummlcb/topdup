import logging
import random
import string

from modules.ml.constants import META_MAPPING


def random_string(length: int = 10) -> str:
    """
    return a random string of lowercase letters and digits with a given length
    """
    return "".join(
        [random.choice(string.ascii_letters + string.digits) for n in range(length)]
    )


def meta_parser(meta_key: str, meta_dict: dict):
    meta_value = None
    for k in META_MAPPING[meta_key]:
        try:
            meta_value = meta_dict[k]
        except:
            pass
    if meta_value is None:
        raise ValueError(f"Missing key for {meta_key}")
    return meta_value


def get_logger():
    loglevel = logging.INFO
    l = logging.getLogger(__name__)
    if not getattr(l, "handler_set", None):
        l.setLevel(loglevel)
        h = logging.StreamHandler()
        f = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
        h.setFormatter(f)
        l.addHandler(h)
        l.setLevel(loglevel)
        l.handler_set = True
    return l
