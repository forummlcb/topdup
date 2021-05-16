from libs.utils import open_utf8_file_to_write
from libs.utils import check_contain_filter, get_utc_now_date, get_fullurl
from libs.utils import read_url_source, remove_accents, remove_html
from libs.utils import get_tagstring_from_etree, parse_date_from_string, get_date_string
from libs.utils import trim_topic

import re                     # regular expression to extract data from article
import json
import time
from loguru import logger
from datetime import datetime
from lxml import etree
import pytz
import uuid
import random

# GLOBAL VARIABLES


count_duyet = 0
count_bo = 0
count_lay = 0


# class represents a single article
class Article:
    def __init__(
            self, article_id,
            href, topic, date, newspaper, language,
            sapo, content, feature_image, avatar,
            post_type, author_id=None, author_fullname='', tags=[]):
        self._id = article_id
        self._href = href
        self._topic = topic.strip()
        self._date = date  # date is stored in UTC timezone
        self._newspaper = newspaper
        self._creation_date = pytz.utc.localize(datetime.utcnow())  # set utc now time
        self._keywords = []
        self._tokenized = False
        self._language = language
        self._sapo = sapo.strip()
        self._content = content
        self._feature_image = feature_image  # feature_image is an array  [url]
        self._avatar = avatar
        self._post_type = post_type  # 0= newspaper, 1=facebook
        self._tags = tags

        if author_id:
            non_unicode_author_id = remove_accents(author_id)
            self._author_id = non_unicode_author_id.strip().replace(' ', '_')
        else:
            self._author_id = None

        self._author_fullname = author_fullname

    def get_id(self):
        return self._id

    def get_tags(self):
        return self._tags

    def get_author_fullname(self):
        return self._author_fullname

    def get_author_id(self):
        return self._author_id

    def get_avatar(self):
        return self._avatar

    def get_post_type(self):
        return self._post_type

    def get_href(self):
        return self._href

    def get_date(self):
        if type(self._date) != bool:
            return self._date
        else:
            return get_utc_now_date()

    def get_topic(self):
        return self._topic

    def get_newspaper(self):
        return self._newspaper

    def get_category(self):
        return self._category

    def get_sapo(self):
        return self._sapo

    def get_content(self):
        return self._content

    def get_full_content(self):
        return self.get_topic() +\
            ' ' + self.get_sapo() + ' ' + self.get_content_as_string()

    def get_semi_full_content(self):
        return self.get_topic() + ' ' + self.get_sapo()

    def get_feature_image(self):
        return self._feature_image

    def get_all_image(self):
        '''
        Get both feature_image and content_image of article
        '''
        feature_image = self.get_feature_image()
        if feature_image:
            if feature_image[0] != '':
                # if not copy(), edit to image_list means edit to self._feature_image
                image_list = feature_image.copy()
            else:
                image_list = []
        else:
            image_list = []
        try:
            first_image = True
            for image in self.get_content():
                if image['type'] == 'image':
                    core_url = image['link']
                    # first image in content is feature_image
                    if not first_image:
                        image_list.append(core_url)
                    else:
                        first_image = False
        except Exception as ex:
            logger.exception(ex)
            pass
        return image_list

    def get_creation_date(self):
        return self._creation_date

    def get_keywords(self):
        return self._keywords

    def get_language(self):
        return self._language

    def get_date_string(self, timezone, strformat="%d-%m-%y %H:%M"):
        return self.get_date().astimezone(timezone).strftime(strformat)

    def get_creation_date_string(self, timezone, strformat="%d-%m-%y %H:%M"):
        return self._creation_date.astimezone(timezone).strftime(strformat)

    def is_tokenized(self):
        return self._tokenized

    def set_tokenized(self, value):
        self._tokenized = value

    def get_content_as_string(self, delimiter=' '):
        text_list = [x['content'].strip()
                     for x in self.get_content() if x['type'] == 'text']
        content = delimiter.join(text_list).strip()
        return content

    def get_content_as_html(self, delimiter=' '):
        html = []
        for item in self.get_content():
            if item['type'] == 'text':
                html.append(item['content'].strip())
            elif item['type'] == 'image':
                html.append('<img class="aligncenter" src="%s">\
                    <p style="text-align: center;">%s</p> </img>' %
                            (item['link'], item['content']))
        html = delimiter.join(html).strip()
        return html

    def tokenize(self, keyword_manager):
        '''
        function: tokenize topic or content (if not null)
        '''
        text = self.get_topic()
        self._keywords = keyword_manager.get_topic_keyword_list(
            text, self.get_language())
        self._tokenized = True

    def is_quality_content(self, min_word=50, min_long_image=1, min_image=3):
        '''
        Check if this article is long and have many images
        '''
        content = self.get_content_as_string()
        images = self.get_all_image()

        if (len(content.split()) >= min_word and len(images) >= min_long_image) or\
                len(images) >= min_image:
            return True
        else:
            return False

# class represents article database


class ArticleManager:
    _data = dict()  # a dict of (href: article)
    _new_article = dict()
    _sorted_article_list = None

    def __init__(self, config_manager):
        self._config_manager = config_manager
        self._id_iterator = 0

    def update_last_run(self):
        self._last_run = get_utc_now_date()

    def create_article_uuid(self):
        return str(uuid.uuid4())

    def get_sorted_article_list(self, only_newspaper=False):
        if only_newspaper:
            article_list = [x for x in list(
                self._data.values()) if x.get_post_type() == 0]
        else:
            article_list = list(self._data.values())

        article_list.sort(key=lambda x: x.get_date(), reverse=True)

        return article_list

    def get_article(self, article_id):
        if article_id in self._data:
            return self._data[article_id]
        else:
            return None

    def get_article_by_id(self, id):
        for key in self._data:
            if self._data[key]._id == id:
                return self._data[key]
        return None

    def search_in_database(
            self, search_string, search_content=True, tag_filter=None, max_number=None):
        """
        Get articles in database that satisfy search_string
        :param:
            search_string:\
                "a,b,c; x,y,z" -> return article that contain (a or b or c) and\
                    (x or y or z)
            search_content:\
                search in both content and topic. False mean search in topic only
            tag_filter:\
                "a,b,c;x,y,z" -> article must have tag satisfy (a or b or c) and\
                    (x or y or z)
        :return:
            list of articles or None
        """
        result = []
        for id, article in self._data.items():  # search in all database
            if search_content:  # create search_string for this article
                text_list = [x['content']
                             for x in article.get_content() if x['type'] == 'text']
                text_list.append(article.get_topic())
                text_list.append(article.get_sapo())
                content_string = ' '.join(text_list).lower()
            else:
                content_string = article.get_topic().lower()
            search_string = search_string.lower()
            if check_contain_filter(content_string, search_string):
                if tag_filter:
                    if check_contain_filter(article.get_tags(), tag_filter):
                        result.append(article)
                else:
                    result.append(article)
        if result:
            sorted_result = sorted(result, key=lambda x: x.get_date(), reverse=True)
            if max_number:
                return sorted_result[0: max_number]
            else:
                return sorted_result
        else:
            return None

    def get_topic_of_an_url(
            self, url, webconfig,
            detail_page_html_tree=None, browser=None, extract_xpath=''):
        '''
        function
        --------
        try to find topic on the page url args point to

        algorithm
        -------
        try to find tag / class that are defined in config.txt

        output
        -------
        topic in string
        '''
        topic_type = webconfig.get_topic_type()

        if detail_page_html_tree is None:
            # try:
            html = read_url_source(url, webconfig, browser)
            if html is None:
                return None

            # except:
            #    return None

        if webconfig.get_output_html():
            logger.info(html)  # for test

        detail_page_html_tree = etree.HTML(html)

        if "text" in topic_type:
            topic_xpath = webconfig.get_topics_xpath()
            topic = detail_page_html_tree.xpath(topic_xpath)[0].text

            if topic is not None:
                topic = str(topic).strip()
                return (topic, detail_page_html_tree)
            else:
                return (False, detail_page_html_tree)
        else:
            tagstring = get_tagstring_from_etree(detail_page_html_tree)
            topic = remove_html(tagstring)
            return (topic, detail_page_html_tree)

    def get_time_of_an_url(
            self, url, webconfig,
            detail_page_html_tree, browser=None, index=0, date_xpath=""):
        '''
        function
        --------
        try to find published date on the page url args point to

        algorithm
        -------
        use date_xpath to get html tag and\
            try all date pattern to parse html tag to date

        '''
        use_index_number = webconfig.get_use_index_number()

        if detail_page_html_tree is None:
            try:
                html = read_url_source(url, webconfig, browser)
                if html is None:
                    return None
                else:
                    detail_page_html_tree = etree.HTML(html)
            except Exception as ex:
                logger.exception(ex)
                logger.error("Can't open detail page to get time")
                return None

        if webconfig.get_output_html():
            logger.info(html)

        a = True
        while a:
            # try:
            result = detail_page_html_tree.xpath(date_xpath)
            if isinstance(result, list):
                if len(result) > 0:
                    if use_index_number is True:
                        result = result[index]
                    else:
                        result = result[0]
                else:
                    logger.info("date_xpath return no result")
                    ignore_topic_not_have_publish_date =\
                        webconfig.get_ignore_topic_not_have_publish_date()
                    if ignore_topic_not_have_publish_date:
                        return False
                    else:
                        logger.info("use current time instead")
                        return\
                            (
                                pytz.utc.localize(datetime.utcnow()),
                                detail_page_html_tree)
            a = False

        tagstring = get_tagstring_from_etree(result)
        logger.info(tagstring)
        remove_date_tag_html = webconfig.get_remove_date_tag_html()
        if remove_date_tag_html:
            tagstring = remove_html(tagstring)
        logger.info("html tag that contain date: %s" % tagstring)

        result = parse_date_from_string(tagstring, webconfig)
        if result is not False:
            return (result, detail_page_html_tree)
        else:
            return False

    def is_repeat_topic_of_same_newspaper(self, topic, webconfig):
        my_newspaper = webconfig.get_webname()
        for key in self._data:
            article = self._data[key]
            first_topic = article.get_topic().strip()
            second_topic = topic.strip()
            if first_topic[-4:] == 'icon':
                first_topic = first_topic[:-4]
            if second_topic[-4:] == 'icon':
                second_topic = second_topic[:-4]
            if first_topic[-2:] == ' .':
                first_topic = first_topic[:-2]
            if second_topic[-2:] == ' .':
                second_topic = second_topic[:-2]

            if (first_topic == second_topic) and\
                    (my_newspaper.strip() == article.get_newspaper().strip()):
                return True

        for key in self._new_article:
            article = self._new_article[key]
            first_topic = article.get_topic().strip()
            second_topic = topic.strip()
            if first_topic[-4:] == 'icon':
                first_topic = first_topic[:-4]
            if second_topic[-4:] == 'icon':
                second_topic = second_topic[:-4]
            if first_topic[-2:] == ' .':
                first_topic = first_topic[:-2]
            if second_topic[-2:] == ' .':
                second_topic == second_topic[:-2]
            if (first_topic == second_topic) and\
                    (my_newspaper.strip() == article.get_newspaper().strip()):
                return True

        return False

    def investigate_if_link_is_valid_article(
            self, link, webconfig, home_html_tree, browser, xpath_index, topic_index):
        '''
        function
        --------
        check if atag link point to an article

        algorithm
        --------
        an article will be valid if:
        - href dont' contain any webname in blacklist
        - have published date
        input
        -----
        - link: lxml element
        - home_html_tree: homepage etree
        - xpath_index: index of topic_xpath, date_xpath, content_xpath...to be used
        - topic_index: index of topic to be used (use to extract data\
            in situation that topic and\
                date lies in them same\
                    page like Facebook Page)
        return:
        (topic, publish_date, sapo, content, feature_image_url) or\
            None if link is not an article
        false if browser can't open url
        '''
        id_type = webconfig.get_id_type()

        if "href" in id_type:
            detail_page_html_tree = None
            fullurl = get_fullurl(webconfig.get_weburl(), link.get('href'))
        else:  # don't have detail page
            fullurl = ''
            detail_page_html_tree = home_html_tree
            # expect that date_place is not detail_page

        date_place = webconfig.get_date_place()
        topic_type = webconfig.get_topic_type()
        get_detail_content = webconfig.get_detail_content()
        extract_xpath = webconfig.get_extract_xpath()[xpath_index]
        date_xpath = webconfig.get_date_xpath()[xpath_index]
        contain_filter = webconfig.get_contain_filter()

        topic = ""
        has_visit = False

        if webconfig.get_topic_from_link():
            a = True
            while a:
                if "text" in topic_type:
                    result = link.xpath(extract_xpath)

                    if (isinstance(result, list)) and len(result) > 0:
                        topic = str(result[0]).strip()
                        max_length =\
                            self._config_manager.get_maximum_topic_display_length()
                        logger.info("Topic found: {}", trim_topic(topic, max_length))
                    else:
                        logger.info("Ignore. Extract result none."
                                    "This link is not an article")
                        return (None, has_visit)
                else:
                    topic = remove_html(get_tagstring_from_etree(link)).strip()
                    topic = topic.replace('/r', '')
                    logger.info("Topic found: {}", topic)
                a = False
        else:
            # try to crawl topic
            (result, detail_page_html_tree) =\
                self.get_topic_of_an_url(
                    fullurl,
                    webconfig,
                    detail_page_html_tree=detail_page_html_tree,
                    browser=browser,
                    extract_xpath=extract_xpath)
            has_visit = True
            if result is not None:
                if result is not False:
                    (topic, detail_page_html_tree) = result
                    logger.info("Topic found: {}", trim_topic(topic, 10))
                else:
                    logger.info("Ignore. Can't find topic. This link is not an article")
                    return (False, has_visit)
            else:
                logger.info("Can't open {}", fullurl)
                return (None, has_visit)

        # check minimun topic length
        minimum_topic_length = webconfig.get_minimum_topic_length()
        if len(topic.strip().split()) < minimum_topic_length:
            logger.info("Ignore. Topic don't satisfy minimum length")
            return (False, has_visit)

        # check contain filter
        if not check_contain_filter(topic, contain_filter):
            logger.info("Ignore. Topic don't satisfy contain filter")
            return (False, has_visit)

        # check repeat topic
        repeat_topic = webconfig.get_limit_repeat_topic()
        if repeat_topic:
            if self.is_repeat_topic_of_same_newspaper(topic, webconfig):
                logger.info("Ignore. This is repeated topic")
                return (False, has_visit)

        if webconfig.get_skip_crawl_publish_date():
            newsdate = pytz.utc.localize(datetime.utcnow())
            logger.info("Published at: {} UTC", newsdate.strftime("%d-%m-%y %H:%M"))
        else:
            # try to find published date
            if "detail_page" in date_place:
                result = self.get_time_of_an_url(
                    fullurl,
                    webconfig,
                    detail_page_html_tree=detail_page_html_tree,
                    browser=browser,
                    index=topic_index,
                    date_xpath=date_xpath)

                has_visit = True
            else:
                result = self.get_time_of_an_url(
                    fullurl,
                    webconfig,
                    detail_page_html_tree=home_html_tree,
                    browser=browser,
                    index=topic_index,
                    date_xpath=date_xpath)

        if result is not None:  # found an article
            if result is not False:
                newsdate, detail_page_html_tree = result
                if self.is_not_outdated(newsdate) or\
                        webconfig.get_skip_crawl_publish_date():
                    logger.info(
                        "Topic publish date (in newspaper timezone): {}",
                        get_date_string(
                            newsdate, "%d/%m/%Y %H:%M", webconfig.get_timezone()))
                    # get detail content
                    sapo = ''
                    content = []
                    avatar_url = ''
                    feature_image_fullurl = ''

                    try:
                        if get_detail_content:
                            content_xpath = webconfig.get_content_xpath()[xpath_index]

                            feature_image_xpath = webconfig.get_feature_image_xpath()[
                                xpath_index]
                            avatar_xpath = webconfig.get_avatar_xpath()

                            # get sapo
                            try:
                                sapo_xpath = webconfig.get_sapo_xpath()[xpath_index]
                                sapo = detail_page_html_tree.xpath(sapo_xpath)[0]
                                if not isinstance(sapo, str):
                                    sapo = remove_html(get_tagstring_from_etree(
                                        sapo)).strip()
                                else:
                                    sapo = str(sapo).strip()
                            except Exception as ex:
                                logger.exception(ex)

                            logger.info("sapo: {}", sapo)

                            # get detail contents: text, image, video, audio...
                            content_etree = ''

                            try:
                                content_etree =\
                                    detail_page_html_tree.xpath(content_xpath)[0]
                            except Exception as ex:
                                logger.exception(ex)

                            # remove unneeded from content etree
                            ignore_xpaths = webconfig.get_remove_content_html_xpaths()
                            try:
                                for xpath in ignore_xpaths:
                                    ignore_elements = content_etree.xpath(xpath)
                                    ignore_elements.reverse()
                                    for element in ignore_elements:
                                        parent = element.getparent()
                                        if parent is not None:
                                            parent.remove(element)
                            except Exception as ex:
                                logger.exception(ex)

                            # clean all span tag
                            for element in content_etree.iter():
                                if element.tag == 'span':
                                    element_text = remove_html(
                                        str(get_tagstring_from_etree(element)), ' ')
                                    parent = element.getparent()

                                    if element_text is not None:
                                        if parent is not None:
                                            if parent.text is None:
                                                parent.text = element_text
                                            else:
                                                parent.text = parent.text + element_text
                                    if parent is not None:
                                        parent.remove(element)

                            # xpath to extract all imagebox element
                            image_box_xpaths = webconfig.get_image_box_xpath()
                            image_title_xpaths =\
                                webconfig.get_image_title_xpath()

                            # xpath to extract all videobox element
                            video_box_xpaths = webconfig.get_video_box_xpath()
                            video_title_xpaths =\
                                webconfig.get_video_title_xpath()

                            # xpath to extract all audiobox element
                            audio_box_xpaths = webconfig.get_audio_box_xpath()
                            audio_title_xpaths =\
                                webconfig.get_audio_title_xpath()

                            content = []

                            text_xpaths = webconfig.get_text_xpath()
                            if text_xpaths == '':
                                text_xpaths = []
                            elif isinstance(text_xpaths, str):
                                text_xpaths = [text_xpaths]

                            text_elements = []
                            try:
                                for text_xpath in text_xpaths:
                                    elements = content_etree.xpath(text_xpath)
                                    text_elements.extend(elements)
                            except Exception as ex:
                                logger.exception(ex)

                            # extract all content elements

                            # image
                            image_boxes = []  # elements
                            image_titles = []  # elements

                            if image_box_xpaths == '':
                                image_box_xpaths = []

                            for image_index in range(0, len(image_box_xpaths)):
                                image_box_xpath = image_box_xpaths[image_index]
                                try:
                                    if image_box_xpath != '':
                                        boxes = content_etree.xpath(image_box_xpath)
                                    for box in boxes:
                                        if box not in image_boxes:
                                            image_boxes.append(box)

                                    try:
                                        for box in boxes:
                                            # get image_title from image box
                                            image_title_xpath =\
                                                image_title_xpaths[image_index]
                                            image_title = box.xpath(
                                                image_title_xpath)[0]
                                            image_titles.append(image_title)
                                    except Exception as ex:
                                        logger.exception(ex)
                                        logger.error(
                                            "Can't extract title box from image box")
                                        pass

                                except Exception as ex:
                                    logger.exception(ex)

                            # video
                            video_boxes = []
                            video_titles = []
                            if video_box_xpaths == '':
                                video_box_xpaths = []

                            for video_index in range(0, len(video_box_xpaths)):
                                video_box_xpath = video_box_xpaths[video_index]
                                try:
                                    if video_box_xpath != '':
                                        boxes = content_etree.xpath(video_box_xpath)
                                    for box in boxes:
                                        if box not in video_boxes:
                                            video_boxes.append(box)

                                    for box in boxes:
                                        # get video_title from video box
                                        video_title_xpath =\
                                            video_title_xpaths[video_index]
                                        video_title = box.xpath(video_title_xpath)[0]
                                        video_titles.append(video_title)

                                except Exception as ex:
                                    logger.exception(ex)

                            # audio
                            audio_boxes = []
                            audio_titles = []

                            if audio_box_xpaths == '':
                                audio_box_xpaths = []

                            for audio_index in range(0, len(audio_box_xpaths)):
                                audio_box_xpath = audio_box_xpaths[audio_index]
                                try:
                                    if audio_box_xpath != '':
                                        boxes = content_etree.xpath(audio_box_xpath)
                                    for box in boxes:
                                        if box not in audio_boxes:
                                            audio_boxes.append(box)

                                    for box in boxes:
                                        # get audio_title from audio box
                                        audio_title_xpath =\
                                            audio_title_xpaths[audio_index]
                                        audio_title = box.xpath(audio_title_xpath)[0]
                                        audio_titles.append(audio_title)

                                except Exception as ex:
                                    logger.exception(ex)

                            # remove DOM
                            for element in content_etree.iter():
                                if element in text_elements:
                                    if element not in image_titles and\
                                        element not in video_titles and\
                                            element not in audio_titles:
                                        # TODO: remove_html don't remove b, i, em, u
                                        text_content = remove_html(
                                            str(
                                                get_tagstring_from_etree(
                                                    element)), ' ').strip()
                                        content.append(
                                            {'type': 'text', 'content': text_content})

                                elif element in image_boxes:  # catch image box
                                    # get image_url
                                    try:
                                        image_list = element.xpath('.//img')
                                        if image_list:  # image box is real
                                            image_url = element.xpath(
                                                './/img')[0].xpath('./@src')[0]
                                            image_url = get_fullurl(
                                                webconfig.get_weburl(), str(image_url))
                                        else:  # image box is image
                                            image_url = element.xpath('./@src')[0]
                                            image_url = get_fullurl(
                                                webconfig.get_weburl(), str(image_url))
                                    except Exception as ex:
                                        logger.exception(ex)
                                        image_url = ''
                                        logger.error("Can't extract image url")

                                    image_title = ''

                                    for image_title_xpath in image_title_xpaths:
                                        try:
                                            image_title = remove_html(
                                                str(
                                                    get_tagstring_from_etree(
                                                        element.xpath(
                                                            image_title_xpath)[0])))
                                            break
                                        except Exception as ex:
                                            logger.exception(ex)

                                    content.append(
                                        {
                                            'type': 'image',
                                            'link': image_url,
                                            'content': image_title})

                                elif element in video_boxes:  # catch video box
                                    # get video_url
                                    video_url = element.xpath(
                                        './/video')[0].xpath('./@src')[0]
                                    video_url = get_fullurl(
                                        webconfig.get_weburl(), str(video_url))

                                    video_title = ''

                                    for video_title_xpath in video_title_xpaths:
                                        try:
                                            video_title = str(element.xpath(
                                                video_title_xpath)[0].xpath('./text()'))
                                            break
                                        except Exception as ex:
                                            logger.exception(ex)

                                    content.append(
                                        {
                                            'type': 'video',
                                            'link': video_url,
                                            'content': video_title})

                                elif element in audio_boxes:  # catch audio box
                                    # get audio_url
                                    audio_url = element.xpath(
                                        './/audio')[0].xpath('./@src')[0]
                                    audio_url = get_fullurl(
                                        webconfig.get_weburl(), str(audio_url))

                                    audio_title = ''

                                    for audio_title_xpath in audio_title_xpaths:
                                        try:
                                            audio_title = str(element.xpath(
                                                audio_title_xpath)[0].xpath('./text()'))
                                            break
                                        except Exception as ex:
                                            logger.exception(ex)

                                    content.append(
                                        {
                                            'type': 'audio',
                                            'link': audio_url,
                                            'content': audio_title})

                            # logger.info("content: ")
                            # for item in content:
                            #     if item['type'] == 'text':
                            #         logger.info(item['content'])
                            #     elif item['type'] == 'video' or\
                            #             item['type'] == 'audio' or\
                            #             item['type'] == 'image':
                            #         item['link'] = item['link'].replace(' ', '')
                            #         logger.info((item['link'], item['content']))

                            image_url = content_etree.xpath(feature_image_xpath)
                            if len(image_url) > 0:
                                image_url = str(image_url[0])
                                feature_image_fullurl = get_fullurl(
                                    webconfig.get_weburl(), str(image_url))
                                feature_image_fullurl = feature_image_fullurl.replace(
                                    ' ', '')
                                feature_image = [feature_image_fullurl]
                            else:
                                image_url = ''
                                feature_image = []

                            logger.info("feature image: {}", feature_image_fullurl)

                            # get avatar/logo
                            avatar_type = webconfig.get_avatar_type()
                            avatar_xpath = webconfig.get_avatar_xpath()
                            avatar_url = webconfig.get_avatar_url()

                            if avatar_type == 'xpath':
                                try:
                                    avatar_url = str(
                                        detail_page_html_tree.xpath(avatar_xpath)[0])
                                except Exception as ex:
                                    logger.exception(ex)

                            logger.info("avatar url: {}", avatar_url)

                    except Exception as ex:
                        logger.exception(ex)
                        logger.error(
                            "Ignore."
                            "Can't extract detail content.\
                                    This might not be an article")

                        return (False, has_visit)

                    return\
                        ((topic,
                          newsdate,
                          sapo,
                          content,
                          feature_image,
                          avatar_url),
                         has_visit)
                else:
                    logger.info("Ignore. This article is outdated")
                    return (False, has_visit)
            else:
                logger.info("Ignore."
                            "This href don't have published date."
                            "It is not an article.")
                return (False, has_visit)
        else:
            return (None, has_visit)

    def is_in_database(self, href):
        return href in self._data

    def add_article(self, new_article):
        self._new_article[new_article.get_id()] = new_article

    def add_articles_from_newspaper(self, webconfig, browser):
        '''
        function: crawl articles from a specific website
        input:
            - webconfig: config of this newspaper
            - browser: browser that is used to crawl this newspaper
        '''
        # cdn_manager = CDNManager(self._config_manager)
        # get web config properites
        webname = webconfig.get_webname()
        weburl = webconfig.get_weburl()
        crawl_url = webconfig.get_crawl_url()
        web_language = webconfig.get_language()
        topics_xpath = webconfig.get_topics_xpath()
        id_type = webconfig.get_id_type()
        only_quality_post = webconfig.get_only_quality_post()
        tags = webconfig.get_tags()

        count_visit = 0  # to limit number of url to visit in each turn
        count_lay = 0

        logger.info("Crawling newspaper: {}", webname)

        a = True
        while a is True:
            count_visit += 1
            html = read_url_source(crawl_url, webconfig, browser)

            if html is not None:
                logger.info("Getting data, please wait...")
                html_tree = etree.HTML(html)

                for xpath_index in range(0, len(topics_xpath)):
                    # logger.info(topics_xpath[xpath_index])
                    topics_list = html_tree.xpath(topics_xpath[xpath_index])

                    for topic_index in range(0, len(topics_list)):
                        link = topics_list[topic_index]
                        # loc ket qua
                        if "href" in id_type:
                            fullurl = get_fullurl(weburl, str(link.get("href")))
                            logger.info("Processing page: %s" % fullurl)

                        else:
                            fullurl = remove_html(get_tagstring_from_etree(link))
                            logger.info("Processing topic")

                        if not self.is_in_database(fullurl):
                            # check if fullurl satisfies url pattern
                            filter = re.compile(
                                webconfig.get_url_pattern_re(), re.IGNORECASE)
                            if ('href' in id_type) and (filter.match(fullurl) is None):
                                logger.info("Ignore. This url is from another site")
                            else:
                                (result, has_visit_page) =\
                                    self.investigate_if_link_is_valid_article(
                                        link,
                                        webconfig,
                                        html_tree,
                                        browser,
                                        xpath_index,
                                        topic_index)
                                if has_visit_page:
                                    count_visit += 1

                                logger.info(count_visit)

                                if result is not None:  # no errors happend
                                    if result is not False:  # valid url
                                        (topic, publish_date, sapo, content,
                                            feature_image, avatar_url) = result
                                        if topic[-4:] == 'icon':
                                            topic = topic[:-4]
                                        if topic[-1:] == '.':
                                            topic = topic[:-1]
                                        topic = topic.strip()
                                        tpo_index = topic.find('TPO - ')
                                        if tpo_index != -1:
                                            topic = topic[:tpo_index]
                                        next_id = self.create_article_uuid()

                                        if 'href' not in id_type:
                                            href = webconfig.get_crawl_url()
                                        else:
                                            href = fullurl

                                        new_article = Article(
                                            article_id=next_id,
                                            topic=topic,
                                            date=publish_date,
                                            newspaper=webname,
                                            href=href,
                                            language=web_language,
                                            sapo=sapo,
                                            content=content,
                                            feature_image=feature_image,
                                            avatar=avatar_url,
                                            post_type=0,
                                            author_id=webname,
                                            author_fullname=webname,
                                            tags=tags)
                                        if only_quality_post:
                                            if new_article.is_quality_content():
                                                self.add_article(new_article)
                                                count_lay += 1
                                                logger.info("Crawled articles: %s" %
                                                            str(count_lay))
                                            else:
                                                logger.info(
                                                    "Ignore. Not a quality post")
                                        else:
                                            self.add_article(new_article)
                                            count_lay += 1
                                            logger.info("Crawled articles: %s" %
                                                        str(count_lay))

                                        if has_visit_page:
                                            # wait for n second before continue crawl
                                            waiting_time =\
                                                self._config_manager\
                                                    .get_waiting_time_between_crawl()
                                            logger.info("Waiting %s seconds" %
                                                        str(waiting_time))
                                            time.sleep(
                                                waiting_time + random.random() * 3)
                                else:  # timeout or smt else happended
                                    logger.error(
                                        "Some errors happen. Check this link later")
                        else:
                            logger.info("This article has been in database")
            else:
                logger.error("Can't open: %s" % webname)
            a = False

    def reset_data(self):
        self._data = dict()

    def is_not_outdated(self, date):
        diff = (pytz.utc.localize(datetime.utcnow()) - date).days
        return (diff >= 0 and diff <= self._config_manager.get_maximum_day_difference())

    def is_article_topic_too_short(self, article):
        return\
            len(article.get_topic().split()) < self._config_manager.get_minimum_word()

    def remove_article(self, article):
        self._data.pop(article.get_id())

    def count_database(self):
        return len(self._data)

    def count_tokenized_articles_contain_keyword(self, keyword):
        count = 0
        for href in self._data:
            article = self._data[href]
            if (article.is_tokenized is True) and\
                    (keyword in article.get_topic().lower()):
                count += 1
        return count

    def count_articles_contain_keyword(self, keyword):
        count = 0
        for href in self._data:
            article = self._data[href]
            if keyword in article.get_topic().lower():
                count += 1
        return count

    def compress_database(self, _keyword_manager):
        remove = []
        for url, article in self._data.items():
            if not self.is_not_outdated(article.get_date()):
                remove.append(article)
        for article in remove:
            _keyword_manager.build_keyword_list_after_remove_article(article)
            self.remove_article(article)

    def reset_tokenize_status(self):
        for href, article in self._data.items():
            article._tokenized = False

    def get_articles(self, number=None):
        """
        Return latest articles list
        :input:
            number: number of articles to get. None = all
        :output:
            list of articles
            else: None
        """
        sorted_article_list = self.get_sorted_article_list()

        if not number:
            number = len(sorted_article_list)
        return sorted_article_list[:number]

    def get_articles_as_json(self, number=None):
        """
        Return latest articles list in json format
        :input:
            number: number of articles to get. None = all
        :output:
            json string
            else: None
        """
        json_article_list = []
        count = 0
        sorted_article_list = self.get_sorted_article_list(only_newspaper=True)
        logger.info("Number of articles: %s" % str(len(sorted_article_list)))

        if not number:
            number = len(sorted_article_list)

        for index in range(0, number):
            article = sorted_article_list[index]
            count += 1
            update_time = int(
                (get_utc_now_date() - article.get_date()).total_seconds() / 60)
            update_time_string = ""

            # publish date on newspaper may be on future (because wrongly typed)
            if update_time < 0:
                continue

            if update_time > 1440:  # more than 24 hours
                update_time = int(update_time / 1440)
                update_time_string = str(update_time) + " ngày trước"
            else:
                if update_time > 60:
                    update_time = int(update_time / 60)
                    update_time_string = str(update_time) + " giờ trước"
                else:
                    update_time_string = str(update_time) + " phút trước"
            max_length = self._config_manager.get_maximum_topic_display_length()

            json_article_list.append(
                {
                    'stt': str(count),
                    'topic': trim_topic(article.get_topic(), max_length),
                    'href': article.get_href(),
                    'newspaper': article.get_newspaper(),
                    'update_time': update_time_string,
                    'publish_time': article.get_date_string(
                        self._config_manager.get_display_timezone()),
                    'sapo': article.get_sapo(),
                    'id': article.get_id(),
                    'feature_image': article.get_all_image()
                })
        return json_article_list

    def export_to_json(self, number=None):
        json_article_list = self.get_articles_as_json(number)
        logger.info("Ready to write to file")
        with open_utf8_file_to_write('./article_data.json') as stream:
            json.dump({'article_list': json_article_list}, stream)
        logger.info("OK")
