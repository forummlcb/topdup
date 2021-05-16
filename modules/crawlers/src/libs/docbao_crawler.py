from loguru import logger
from libs.data import ArticleManager
from libs.config import ConfigManager
from libs.browser_crawler import BrowserWrapper
from libs.postgresql_client import PostgresClient


class Docbao_Crawler():

    _crawl_newspaper = True

    def __init__(self, crawl_newspaper=True, export_to_postgres=False):
        self._crawl_newspaper = crawl_newspaper
        self._export_to_postgres = export_to_postgres

        self._config_manager = ConfigManager('./libs/config/config.yaml')

        self._data_manager =\
            ArticleManager(self._config_manager)  # article database object

    def load_data_from_file(self):
        # Load data from file
        self._config_manager.load_data(crawl_newspaper=self._crawl_newspaper)
        self._config_manager.print_crawl_list()

    def run_crawler(self):
        logger.info("Start crawling...")
        crawl_queue = self._config_manager.get_newspaper_list()
        data_manager = self._data_manager

        browser = BrowserWrapper()
        crawled_articles = []

        try:
            for webconfig in crawl_queue:

                crawl_type = webconfig.get_crawl_type()
                if crawl_type == "newspaper":
                    logger.info("Crawling newspaper {}", webconfig.get_webname())
                    data_manager.add_articles_from_newspaper(webconfig, browser)

            if len(data_manager._new_article.items()) > 0:
                for article_id, article in data_manager._new_article.items():
                    crawled_articles.append(article)

            if browser is not None:
                browser.quit()
        except Exception as ex:
            logger.exception(ex)
            if browser is not None:
                browser.quit()
        except KeyboardInterrupt as ki:
            if browser is not None:
                browser.quit()
            logger.exception(ki)

        logger.info("Finish crawling")

        rb_articles = []

        if len(crawled_articles) > 0:
            for crawl_item in crawled_articles:
                article = crawl_item
                if article.get_id() not in data_manager._data:
                    data_manager._data[article.get_id()] = article
                    rb_articles.append(article)
                    logger.info("{}: {}", article.get_newspaper(), article.get_topic())

        if self._export_to_postgres:
            try:
                # push to Postgres
                postgres = PostgresClient()
                for article in rb_articles:
                    postgres.push_article(article)
            except Exception as ex:
                logger.exception(ex)

        logger.info("FINISH ADD TO POSTGRE DATABASE...")
