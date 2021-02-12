from uuid import uuid4
from modules.data_wranglers import datalayer
from modules.data_wranglers.preprocessor.vi_preprocessor import ViPreProcessor

def data_prep(data_dict):
    '''
    To transform data provided by DocBao to fit with the schema at FAISSDocumentStore
    '''

    content = list()
    for c in data_dict['content']:
        if (c['type'] == 'text') & (len(c['content'].split(' ')) > 10):
            content.append(c['content'])
    content = ' '.join(content)

    meta = dict()
    for k in data_dict.keys():
        if k != 'content':
            meta[k] = data_dict[k]

    return content, meta

def main():

    # get data from table topdup_articles
    processor = ViPreProcessor()
    articles = datalayer.getdata('SELECT * FROM topdup_articles')
    sqls = []
    for article in articles:
        # insert document record
        documentid          = str(uuid4())
        topdup_article_id   = str(article['article_id'])
        content             = str(article['content'])
        doc                 = datalayer.cleantext(str(processor.clean({"text": content})['text']))
        
        
        sqlcmd = "INSERT INTO document(id,text,index,datasource,topdup_article_id) " \
            " VALUES('" + documentid + "','" + doc + "','document','topdup_articles','" + topdup_article_id + "')"
        sqls.append(sqlcmd)
        
        # insert meta record
        topic               = datalayer.cleantext(str(article['topic']))
        href                = str(article['href'])
        publish_date        = str(article['publish_date'])
        newspaper           = str(article['newspaper'])
        language            = str(article['language'])

        # topic
        metaid              = str(uuid4())
        sqlcmd = "INSERT INTO meta(id,name,value,document_id) " \
                "VALUES('" + metaid + "','topic','" + topic + "','" + documentid + "')"
        sqls.append(sqlcmd)

        # href
        metaid              = str(uuid4())
        sqlcmd = "INSERT INTO meta(id,name,value,document_id) " \
                "VALUES('" + metaid + "','href','" + href + "','" + documentid + "')"
        sqls.append(sqlcmd)

        # publish_date
        metaid              = str(uuid4())
        sqlcmd = "INSERT INTO meta(id,name,value,document_id) "\
                "VALUES('" + metaid + "','publish_date','" + publish_date + "','" + documentid + "')"
        sqls.append(sqlcmd)

        # newspaper
        metaid              = str(uuid4())
        sqlcmd = "INSERT INTO meta(id,name,value,document_id) "\
                "VALUES('" + metaid + "','newspaper','" + newspaper + "','" + documentid + "')"
        sqls.append(sqlcmd)

        # language
        metaid              = str(uuid4())
        sqlcmd = "INSERT INTO meta(id,name,value,document_id) "\
                "VALUES('" + metaid + "','language','" + language + "','" + documentid + "')"
        sqls.append(sqlcmd)

        
    # archive data which has been processed
    sqlcmd = "INSERT INTO archive_topdup_articles SELECT a.* FROM topdup_articles a INNER JOIN document b "\
            "ON A.article_id = b.topdup_article_id"
    sqls.append(sqlcmd)

    # remove the old data which has been processed
    sqlcmd = "DELETE FROM topdup_articles a " \
            "USING 	archive_topdup_articles b " \
            "WHERE	A.article_id = b.article_id"
    sqls.append(sqlcmd)
        
    # execute & commit
    datalayer.executesqls(sqls)


if __name__ == '__main__':
    main()

        


