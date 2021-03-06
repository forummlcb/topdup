import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))

from uuid import uuid4
from data_wranglers import datalayer
from data_wranglers.preprocessor.vi_preprocessor import ViPreProcessor



def main():
        # get data from table topdup_articles
        processor = ViPreProcessor()
        articles = datalayer.getdata("SELECT id,text_original FROM document where datasource = 'post_dataset'")
        sqls = []
        for article in articles:
                # insert document record
                documentid          = str(article['id'])
                content             = str(article['text_original'])
                doc                 = datalayer.cleantext(str(processor.clean({"text": content})['text']))


                sqlcmd = "UPDATE document " \
                        " SET text = '" + doc + "' " \
                        " WHERE id = '" + documentid + "'"
                sqls.append(sqlcmd)

        # execute & commit
        datalayer.executesqls(sqls)


if __name__ == '__main__':
        main()

        


