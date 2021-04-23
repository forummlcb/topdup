###############################################
# Program: Doc bao theo tu khoa (keyword-based online journalism reader)
# Author: hailoc12
# Version: 1.1.0
# Date: 09/01/2018
# Repository: http://github.com/hailoc12/docbao
# File: crawl.py
################################################

import time
import schedule
import functools
from loguru import logger
from libs.utils import new_session, finish_session
from libs.utils import is_another_session_running
from libs.docbao_crawler import Docbao_Crawler


def print_elapsed_time(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_timestamp = time.time()
        logger.info('LOG: running crawler "%s"' % func.__name__)
        result = func(*args, **kwargs)
        logger.info('LOG: "%s" crawler completed in %d seconds' %
                    (func.__name__, time.time() - start_timestamp))
        return result

    return wrapper

# Run job every 12 hours


@print_elapsed_time
def main():
    if not is_another_session_running():
        new_session()
        try:
            crawler = Docbao_Crawler(crawl_newspaper=True, export_to_postgres=True)
            crawler.load_data_from_file()
            crawler.run_crawler()
        except Exception as ex:
            logger.exception(ex)
        finish_session()
    else:
        logger.info("Another session is running. Exit")


schedule.every(12).hours.do(main)

schedule.run_all()
