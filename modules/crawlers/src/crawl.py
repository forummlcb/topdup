###############################################
# Program: Doc bao theo tu khoa (keyword-based online journalism reader)
# Author: hailoc12
# Version: 1.1.0
# Date: 09/01/2018
# Repository: http://github.com/hailoc12/docbao
# File: crawl.py
################################################

from libs.utils import new_session, print_exception, finish_session
from libs.utils import is_another_session_running
from libs.docbao_crawler import Docbao_Crawler


if not is_another_session_running():
    new_session()
    try:
        crawler = Docbao_Crawler(crawl_newspaper=True, export_to_postgres=True)
        crawler.load_data_from_file()
        crawler.multiprocess_crawl()
        # crawler.save_data_to_file()
    except Exception as ex:
        print(ex)
        print_exception()
    finish_session()
else:
    print("Another session is running. Exit")
