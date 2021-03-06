# coding=utf-8
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))

import pickle
import os
from tqdm.auto import tqdm
from pathlib import Path
import jsonpickle
from data_wranglers import datalayer
from data_wranglers import data_prep



def main():

    cwd = Path(__file__).parent
    if not os.path.exists(os.path.join(cwd, "post_dataset.pkl")):
        print("Downloading sample data of TopDup")
        urllib.request.urlretrieve(
            "https://storage.googleapis.com/topdup/dataset/post_dataset.pkl",
            os.path.join(cwd, "post_dataset.pkl"),
        )

    # open the pickled file

    post_data = pickle.load(open(os.path.join(cwd, "post_dataset.pkl"), "rb"))
    docs = list()
    sqls = []
    for d in tqdm(post_data):
        content, meta = data_prep(jsonpickle.loads(d))
        sqlcmd = "INSERT INTO post_dataset(url,content) " \
                " VALUES('" + meta["url"] + "','" + datalayer.cleantext(content) + "')"
        sqls.append((sqlcmd))

    datalayer.executesqls(sqls)


if __name__ == "__main__":
    main()
