import logging


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
