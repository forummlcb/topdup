import time
import schedule
import functools
from loguru import logger
from libs.utils import new_session, finish_session
from libs.utils import is_another_session_running
from libs.docbao_crawler import Docbao_Crawler
from libs.config import ConfigManager

def main():
    if not is_another_session_running(): # -> this to create a file name 'docbao.lock' to avoid running multiple crawlers at the sametime
        new_session()
        try:
            crawler = Docbao_Crawler(crawl_newspaper=True, export_to_json=True, export_jsonfile="./test.json", config_yamlfile="libs/config/test_config.yaml")
            crawler.load_data_from_file()
            crawler.run_crawler()
        except Exception as ex:
            logger.exception(ex)
        finish_session()
    else:
        logger.info("Another session is running. Exit")

if __name__ == '__main__':
    main()
