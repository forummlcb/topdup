import os

from vncorenlp import VnCoreNLP


class VnCoreNLPSingleton:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cur_dir = os.path.dirname(os.path.abspath(__file__))
            cls._instance = VnCoreNLP(
                os.path.join(cur_dir, "VnCoreNLP-1.1.1.jar"),
                annotators="wseg",
                max_heap_size="-Xmx500m",
            )
        return cls._instance
