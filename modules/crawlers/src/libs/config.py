import pytz
import yaml
from loguru import logger
from libs.utils import open_utf8_file_to_read, open_utf8_file_to_write


class WebConfig:
    def __init__(self, web=None):
        if web is None:
            self._web = {"default": {}}
        else:
            self._web = web

    @logger.catch
    def get_config(self, key, default):
        if key not in self._web[self.get_webname()]:
            self.set_config(key, default)
            return default
        else:
            value = self._web[self.get_webname()][key]

            if isinstance(value, int):
                return int(value)
            else:
                return value

    def delete_config(self, key):
        try:
            del self._web[self.get_webname()][key]
            return True
        except Exception as ex:
            print(ex)
            return False

    def get_only_quality_post(self):
        return self.get_config('only_quality_post', False)

    def get_text_xpath(self):
        return self.get_config('text_xpath', './/node()[text()]')

    def get_image_box_xpath(self):
        return self.get_config('image_box_xpath', [])

    def get_image_title_xpath(self):
        return self.get_config('image_title_xpath', [])

    def get_video_box_xpath(self):
        return self.get_config('video_box_xpath', [])

    def get_video_title_xpath(self):
        return self.get_config('video_title_xpath', [])

    def get_audio_box_xpath(self):
        return self.get_config('audio_box_xpath', [])

    def get_audio_title_xpath(self):
        return self.get_config('audio_title_xpath', [])

    def get_avatar_type(self):
        return self.get_config('avatar_type', 'url')  # or 'xpath'

    def get_avatar_xpath(self):
        return self.get_config('avatar_xpath', '')

    def get_avatar_url(self):
        return self.get_config('avatar_url', '')

    def get_webname(self):
        return next(iter(self._web))

    def get_weburl(self):
        return self._web[self.get_webname()]['web_url']

    def get_crawl_url(self):
        return self._web[self.get_webname()]['crawl_url']

    def get_url_pattern_re(self):
        return self._web[self.get_webname()]['url_pattern_re']

    def get_ignore_topic_not_have_publish_date(self):
        return self.get_config('ignore_topic_not_have_publish_date', False)

    def get_prevent_auto_redirect(self):
        return self.get_config('prevent_auto_redirect', False)

    def get_crawl_type(self):
        return self.get_config('crawl_type', 'newspaper')

    def get_remove_content_html(self):
        return self.get_config('remove_content_html', True)

    def get_topics_xpath(self):
        return self.get_config('topics_xpath', '//a')

    def get_topic_type(self):
        return self.get_config('topic_type', "text")

    def get_remove_date_tag_html(self):
        return self.get_config('remove_date_tag_html', False)

    def get_date_xpath(self):
        return self.get_config('date_xpath', '')

    def get_detail_content(self):
        return self.get_config('get_detail_content', False)

    def get_sapo_xpath(self):
        return self.get_config('sapo_xpath', '')

    def get_content_xpath(self):
        return self.get_config('content_xpath', '')

    def get_remove_content_html_type(self):
        return self.get_config('remove_content_html_type', 'basic')

    def get_remove_content_html_xpaths(self):
        return self.get_config('remove_content_html_xpaths', [])

    def get_feature_image_xpath(self):
        return self.get_config('feature_image_xpath', '')

    def get_date_re(self):
        result = self._web[self.get_webname()]['date_re']
        if(not isinstance(result, list)):  # compatible with older config version
            return [result]
        else:
            return result

    def get_date_pattern(self):
        result = self._web[self.get_webname()]['date_pattern']
        if(not isinstance(result, list)):
            return [result]
        else:
            return result

    def get_date_place(self):
        return self.get_config('date_place', 'detail_page')

    def get_limit_repeat_topic(self):
        return self.get_config('skip_repeat_topic', True)

    def get_timezone(self):
        '''
        output: pytz.timezone class
        '''
        try:
            result = pytz.timezone(self.get_config('timezone', 'UTC'))
        except Exception as ex:
            print(ex)
            print("Wrong timezone format.\
                Please provide one in tz database (google it)")
            print("Choose UTC by default")
            result = pytz.timezone("UTC")
        return result

    def get_language(self):
        return self._web[self.get_webname()]['language']

    def get_id_type(self):
        return self.get_config('id_type', 'href')

    def get_skip_crawl_publish_date(self):
        return self._web[self.get_webname()]['get_publish_date_as_crawl_date']

    def get_extract_xpath(self):
        return self.get_config('extract_xpath', ["*/text()"])

    def get_use_index_number(self):
        return self.get_config('use_index_number', False)

    def get_topic_from_link(self):
        return self.get_config('get_topic_from_link', True)

    def get_output_html(self):
        return self._web[self.get_webname()]['output_html']

    def get_use_browser(self):
        return self._web[self.get_webname()]['use_browser']

    def get_display_browser(self):
        return self.get_config("display_browser", False)

    def get_browser_timeout(self):
        return self.get_config("browser_timeout", 60)

    def get_browser_fast_load(self):
        return self.get_config('browser_fast_load', True)

    def get_browser_profile(self):
        return self.get_config('browser_profile', None)

    def get_contain_filter(self):
        return self.get_config("contain", "")

    def get_maximum_url(self):
        '''
        function: get max number of link that will be crawl in this website in one call
        '''
        return self.get_config("maximum_url", 10)

    def get_tags(self):
        """get metadata to label post crawled from this webconfig"""
        return self.get_config("tags", [])

    def set_tags(self, tags):
        self.set_config("tags", tags)

    def get_minimum_topic_length(self):
        return self.get_config('minimum_topic_length', 4)

    def get_minimum_duration_between_crawls(self):
        return self.get_config('minimum_duration_between_crawls', 5)

    def set_minimum_duration_between_crawls(self, value):
        self.set_config('minimum_duration_between_crawls', value)

    def set_config(self, key, value):
        self._web[self.get_webname()][key] = value

    def export(self, filepath):
        with open_utf8_file_to_write(filepath) as stream:
            yaml.dump([self._web], stream, default_flow_style=False,
                      allow_unicode=True, sort_keys=False)

    def print_config(self):
        webname = self.get_webname()

        count = 1
        config_list = []
        print(str(count) + ' ' + webname + ':')
        config_list.append(webname)
        count = 2
        for key in self._web[webname]:
            value = self._web[webname][key]
            print(str(count) + '   - ' + key + ': ' + str(value))
            config_list.append((key, value))
            count += 1
        return config_list

    def get_config_by_index(self, index):
        count = 0
        for key in self._web[self.get_webname()]:
            if count == index:
                return (key, self._web[self.get_webname()][key])
            count += 1
        return None

    def load_config_from_file(self, filepath):
        with open_utf8_file_to_read(filepath) as stream:
            self._web = yaml.full_load(stream)[0]

    def set_webname(self, webname):
        old_name = self.get_webname()
        self._web = {webname: self._web[old_name]}


# class that manage config defined in /input/config.txt
class ConfigManager:
    _filename = ""
    _config = {}

    def __init__(self, config_filename):
        self._filename = config_filename

    def load_data(self, crawl_newspaper=True):
        stream = open_utf8_file_to_read(self._filename)
        self._config = yaml.full_load(stream)
        stream.close()

        newspaper_list = []

        if not crawl_newspaper:
            self.replace_crawl_list([])
        else:
            # crawl newspaper last to init browser with random profiles first
            newspaper_list = self.get_newspaper_list()
            self.replace_crawl_list([])

        # append newspaper list
        if crawl_newspaper:
            for newspaper in newspaper_list:
                self.add_newspaper(newspaper, beginning=True)

    def save_data(self, crawl_newspaper=True):
        new_crawl_list =\
            [WebConfig(x) for x in self._config['crawling_list'] if
                WebConfig(x).get_config('remove_me', False) is not True]
        self.replace_crawl_list(new_crawl_list)

        if crawl_newspaper:  # only save configs if crawl_newspaper
            with open_utf8_file_to_write(self._filename) as stream:
                yaml.dump(self._config, stream, default_flow_style=False,
                          allow_unicode=True, sort_keys=False)

    def get_timeout(self, default=1000):
        if "timeout" in self._config:
            return int(self._config['timeout'])
        else:
            return default

    def get_use_CDN(self, default=False):
        return self.get_config('use_CDN', default)

    def get_minimum_word(self):
        return int(self._config['minimum_topic_length'])

    def get_config_dict(self):
        return self._config

    def get_config(self, config_string, default_value):
        if config_string not in self._config:
            self._config[config_string] = default_value
            return default_value
        else:
            try:
                return int(self._config[config_string])
            except Exception as ex:
                print(ex)
                return self._config[config_string]

    def set_config(self, config_string, value):
        self._config[config_string] = value

    def print_crawl_list(self):
        logger.info("Websites in crawling list:")
        newspaper_list = self.get_newspaper_list()
        index = 0
        for newspaper in newspaper_list:
            index += 1
            logger.info("{}. {}", str(index), newspaper.get_webname())

    def get_maximum_topic_display_length(self):
        return int(self.get_config('maximum_topic_display_length', 20))

    def get_maximum_day_difference(self):
        return int(self._config['days_to_crawl'])

    def get_display_timezone(self):
        '''
        output: pytz.timezone class
        '''
        try:
            result = pytz.timezone(self._config['display_timezone'])
        except Exception as ex:
            logger.exception(ex)
            logger.exception("Wrong timezone format.\
                Please provide one in tz database (google it)")
            logger.exception("Choose UTC by default")
            result = pytz.timezone("UTC")
        return result

    def get_newspaper_list(self):
        return [WebConfig(web) for web in self._config['crawling_list']]

    def add_newspaper(self, webconfig, beginning=False):

        found = False
        webname = webconfig.get_webname()

        # update old config if there is one
        for i in range(0, len(self._config['crawling_list'])):
            web = self._config['crawling_list'][i]
            if WebConfig(web).get_webname() == webname:
                self._config['crawling_list'][i] = webconfig._web
                found = True

        # if not, add new config
        if not found:
            if not beginning:
                self._config['crawling_list'].append(webconfig._web)
            else:
                self._config['crawling_list'].insert(0, webconfig._web)

    def replace_crawl_list(self, newspaper_list):
        self._config['crawling_list'] = []
        for webconfig in newspaper_list:
            self.add_newspaper(webconfig)

    def print_config(self):
        '''
        note
        ====
        - print all properties without crawling list
        return
        ======
        list of (key, value) that is printed on screen
        '''
        config_list = []
        index = 0
        for key in self._config:
            value = self._config[key]
            if key != 'crawling_list':
                config_list.append((key, value))
                index += 1
                print("%s. %s: %s" % (str(index), key, str(value)))
        return config_list

    def get_newspaper_count(self):
        return len(self._config['crawling_list'])

    def get_waiting_time_between_crawl(self):
        # wait n second before continuing to crawl to avoid blocked
        return int(self._config['waiting_time_between_each_crawl'])

    def get_crawling_interval(self):
        return int(self._config['crawling_interval'])

    # minimum articles published / minute for a keyword to be consider fast growing
    def get_minimum_publish_speed(self):
        return int(self._config['minimum_publish_speed'])

    def get_maximum_url_to_visit_each_turn(self):
        return int(self._config['maximum_url_to_visit_each_turn'])
