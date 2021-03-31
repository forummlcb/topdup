import psycopg2
from psycopg2 import Error
from psycopg2.extras import RealDictCursor
import logging
import os

for key in os.environ.keys():
    if key == "TOPDUP_POSTGRES_HOST":
        print(key)


DB_HOST     = os.environ.get('TOPDUP_POSTGRES_HOST')
DB_NAME     = os.environ.get('TOPDUP_POSTGRES_DATABASE')
DB_USER     = os.environ.get('TOPDUP_POSTGRES_USER')
DB_PWD      = os.environ.get('TOPDUP_POSTGRES_PASSWORD')
DB_PORT     = os.environ.get('TOPDUP_POSTGRES_PORT')

# connect to postgresql
conn = psycopg2.connect(host=DB_HOST,
                        database=DB_NAME,
                        user=DB_USER,
                        port = DB_PORT,
                        password=DB_PWD,
                        cursor_factory=RealDictCursor)

conn.autocommit = True

def getdata(sql):
    cursor = conn.cursor()
    cursor.execute(sql)
    return cursor.fetchall()

def executesql(sql):
    cursor = conn.cursor()
    cursor.execute(sql)
    conn.commit()

def executesqls(sqls):
    try:
        cursor = conn.cursor()
        for sql in sqls:
            cursor.execute(sql)
            logging.debug(sql)
        conn.commit()
    except Exception as e:
        print(e, sql)
        conn.rollback()
def cleantext(text):
    return text.replace("'",'"')

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

    