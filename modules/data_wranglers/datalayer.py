import psycopg2
from psycopg2 import Error
from psycopg2.extras import RealDictCursor
import logging


dbserver = '100.65.24.20'
dbname = 'topdup_articles'
dbuser = 'admin'
dbpwd = 'GZZhT9f8G3zsGRhs'

# connect to postgresql
conn = psycopg2.connect(host=dbserver,
                        database=dbname,
                        user=dbuser,
                        port = "5432",
                        password=dbpwd,
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


    