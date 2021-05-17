from uuid import uuid4

import schedule

from modules.data_wranglers import datalayer
from modules.data_wranglers.preprocessor.vi_preprocessor import ViPreProcessor


def main():
    # get data from table topdup_articles
    processor = ViPreProcessor()
    articles = datalayer.getdata("SELECT * FROM topdup_articles")
    sqls = []

    # -----------------------------------------------------------
    #               LOOP ALL ARTICLES & CLEAN CONTENTS
    #                       BASED ON ViPreProcessor
    # -----------------------------------------------------------
    for article in articles:
        # insert document record
        document_id = str(uuid4())
        topdup_article_id = str(article["article_id"])
        content = str(article["content"])
        doc = datalayer.cleantext(str(processor.clean({"text": content})["text"]))

        sqlcmd = (
            "INSERT INTO document(id,text,index,datasource,topdup_article_id) "
            " VALUES('"
            + document_id
            + "','"
            + doc
            + "','document','topdup_articles','"
            + topdup_article_id
            + "')"
        )
        sqls.append(sqlcmd)

        # insert meta record
        topic = datalayer.cleantext(str(article["topic"]))
        href = str(article["href"])
        publish_date = str(article["publish_date"])
        newspaper = str(article["newspaper"])
        language = str(article["language"])

        # topic
        metaid = str(uuid4())
        sqlcmd = (
            "INSERT INTO meta(id,name,value,document_id) "
            "VALUES('" + metaid + "','topic','" + topic + "','" + document_id + "')"
        )
        sqls.append(sqlcmd)

        # href
        metaid = str(uuid4())
        sqlcmd = (
            "INSERT INTO meta(id,name,value,document_id) "
            "VALUES('" + metaid + "','href','" + href + "','" + document_id + "')"
        )
        sqls.append(sqlcmd)

        # publish_date
        metaid = str(uuid4())
        sqlcmd = (
            "INSERT INTO meta(id,name,value,document_id) "
            "VALUES('"
            + metaid
            + "','publish_date','"
            + publish_date
            + "','"
            + document_id
            + "')"
        )
        sqls.append(sqlcmd)

        # newspaper
        metaid = str(uuid4())
        sqlcmd = (
            "INSERT INTO meta(id,name,value,document_id) "
            "VALUES('"
            + metaid
            + "','newspaper','"
            + newspaper
            + "','"
            + document_id
            + "')"
        )
        sqls.append(sqlcmd)

        # language
        metaid = str(uuid4())
        sqlcmd = (
            "INSERT INTO meta(id,name,value,document_id) "
            "VALUES('"
            + metaid
            + "','language','"
            + language
            + "','"
            + document_id
            + "')"
        )
        sqls.append(sqlcmd)

    # -----------------------------------------------------------
    #               CLEAN DATA INSIDE POSTGRES
    # -----------------------------------------------------------
    # archive data which has been processed
    sqlcmd = (
        "INSERT INTO archive_topdup_articles "
        "SELECT a.* FROM topdup_articles a INNER JOIN document b "
        "ON A.article_id = b.topdup_article_id"
    )
    sqls.append(sqlcmd)

    # update the original text into document
    sqlcmd = (
        "UPDATE	document a "
        "SET 	text_original = b.content "
        "FROM	topdup_articles b "
        "WHERE	a.topdup_article_id = b.article_id"
    )

    sqls.append(sqlcmd)

    # remove the old data which has been processed
    sqlcmd = (
        "DELETE FROM topdup_articles a "
        "USING 	archive_topdup_articles b "
        "WHERE	A.article_id = b.article_id"
    )
    sqls.append(sqlcmd)

    # remove character ' due to text error
    sqlcmd = "UPDATE document SET index='document' WHERE index = '''document'''"
    sqls.append(sqlcmd)
    sqlcmd = "UPDATE document SET datasource='topdup_articles' WHERE index = '''topdup_articles'''"
    sqls.append(sqlcmd)
    sqlcmd = (
        "UPDATE document SET text = replace(text,'''','') WHERE left(text,1) = ''''"
    )
    sqls.append(sqlcmd)

    # execute & commit
    datalayer.executesqls(sqls)


if __name__ == "__main__":
    schedule.every(5).minutes.do(main)
    while True:
        schedule.run_pending()
