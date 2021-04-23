from bs4 import BeautifulSoup
import re
import codecs
from datetime import datetime
import os
from libs.browser_crawler import BrowserCrawler
import time
import pytz
from selenium import webdriver
from lxml import etree
import html
import unicodedata
import requests
from loguru import logger
_firefox_browser = None


def remove_accents(s):
    s = re.sub('\u0110', 'D', s)
    s = re.sub('\u0111', 'd', s)
    return str(unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore'))


def trim_topic(topic, max_length=10):
    topic = html.unescape(topic)
    result = ""
    i = 0
    topic_words = topic.split()
    if max_length >= len(topic_words):
        return topic
    else:
        while i < max_length:
            result = result + topic_words[i] + ' '
            i += 1
        result += "..."
        return result.strip()


def get_utc_now_date():
    return pytz.utc.localize(datetime.utcnow())


def get_timezone_from_string(timezone):
    return pytz.timezone(timezone)


def get_date_string(
        date, date_format="%d/%m/%Y %H:%M", timezone=pytz.timezone("Asia/Ho_Chi_Minh")):
    '''
    input
    -----
    timezone: tzinfo subclass

    output
    -----
    string

    '''
    return date.astimezone(timezone).strftime(date_format)


def parse_date_from_string(tagstring, webconfig):
    # Try to parse date from tagstring, using all re & pattern provided

    date_res = [
        r"(\d{1,2}:\d{1,2}.*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"(\d{1,2}:\d{1,2}:\d{1,2} \d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"(\d{1,2}:\d{1,2} \d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"(\d{1,2}:\d{1,2} \- \d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"(\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}T\d{1,2}:\d{1,2})",
        r"(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4} \d{1,2}:\d{1,2} [AP]M)",
        r"(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4} \| \d{1,2}:\d{1,2})",
        r"(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4} \d{1,2}:\d{1,2})",
        r"(\d{1,2}:\d{1,2} ngày \d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\, \d{1,2}:\d{1,2})",
        r"(\d{1,2}:\d{1,2}\, \d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"(\d{1,2}:\d{1,2}' \d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4} \d{1,2}:\d{1,2}:\d{1,2} (A|P)M)",
        r"(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4} \- \d{1,2}:\d{1,2})",
        r"(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4} \- \d{1,2}:\d{1,2} [AP]M)",
        r"(\d{1,2}:\d{1,2} \| \d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"(\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2} \d{1,2}:\d{1,2})",
        r"(\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})",
        r"(ngày \d{1,2} tháng \d{1,2} \, \d{2,4})",
        r"(NGÀY \d{1,2} THÁNG \d{1,2}, \d{2,4} \| \d{1,2}:\d{1,2})",
        r"(Ngày \d{1,2} Tháng \d{1,2}, \d{2,4} \| \d{1,2}:\d{1,2})",
        r"(Ngày \d{1,2} tháng \d{1,2} năm \d{2,4})",
        r"(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4} \d{1,2}:\d{1,2})"]

    date_patterns = [
        '%H:%M, %d/%m/%Y',
        '%H:%M:%S %d/%m/%Y',
        '%H:%M %d/%m/%Y',
        '%H:%M - %d/%m/%Y',
        '%Y-%m-%dT%H:%M',
        '%d/%m/%Y %I:%M %p',
        '%d/%m/%Y | %H:%M',
        '%d/%m/%Y %H:%M',
        '%H:%M ngày %d-%m-%Y',
        '%d/%m/%Y, %H:%M',
        '%H:%M, %d/%m/%Y',
        "%H:%M' %d/%m/%Y",
        "%m/%d/%Y %I:%M:%S %p",
        "%d/%m/%Y - %H:%M",
        "%d-%m-%Y - %I:%M %p",
        "%H:%M | %d/%m/%Y",
        "%d/%m/%Y",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "ngày %d tháng %m , %Y",
        "NGÀY %d THÁNG %m, %Y | %H:%M",
        "Ngày %d Tháng %m, %Y | %H:%M",
        "Ngày %d tháng %m năm %Y",
        "%d-%m-%Y %H:%M"]

    count = len(date_res)

    parsable = False

    timezone = webconfig.get_timezone()

    for i in range(0, count):
        date_re = date_res[i]
        date_pattern = date_patterns[i]

        flags = re.UNICODE
        filter = re.compile(date_re, flags=flags)

        searchobj = filter.search(str(tagstring))

        if searchobj:
            parsable = True
            searchstr = searchobj.group(1)
            if i == 0:
                firstcom = searchstr.find(',')
                secondcom = searchstr.find(',', firstcom + 1)
                searchstr = searchstr[:firstcom] + searchstr[secondcom:]

            try:
                result = datetime.strptime(
                    searchstr, date_pattern)
                result = timezone.localize(result).astimezone(pytz.utc)
                return result
            except Exception as ex:
                logger.exception(ex)
                logger.error(
                    "Warning: published date {} is not in {} pattern",
                    searchobj.group(1), date_pattern)
        else:
            pass

    if parsable:
        logger.info("Date found but can't parse exactly. Use current time instead")
        return get_utc_now_date()
    else:
        return False


def check_contain_filter(topic, contain_filter):
    '''
    function
    --------
    check if topic satisfiy contain_filters in format\
        "a,b,c ; x,y,z" means (a or b or c) and (x or y or z)
    :input:
        topic (string|list): string|list to search
    '''
    if isinstance(topic, list):
        content_string = [x.lower() for x in topic]
    else:
        content_string = topic.lower()
    search_string = contain_filter.lower()

    and_terms_satisfy = True
    for and_terms in search_string.split(';'):
        or_term_satisfy = False
        for or_term in and_terms.split(','):
            if or_term.strip() in content_string:
                or_term_satisfy = True
                break
        if not or_term_satisfy:
            and_terms_satisfy = False
            break

    if and_terms_satisfy:
        return True
    else:
        return False


def is_another_session_running():
    return os.path.exists("docbao.lock")


def finish_session():
    try:
        os.remove("docbao.lock")
    except Exception as ex:
        logger.exception(ex)


def new_session():
    with open_utf8_file_to_write("docbao.lock") as stream:
        stream.write("locked")


def get_independent_os_path(path_list):
    path = ""
    for item in path_list:
        path = os.path.join(path, item)
    return path


def open_utf8_file_to_read(filename):
    try:
        return codecs.open(filename, "r", "utf-8")
    except Exception as ex:
        logger.exception(ex)
        return None


def open_utf8_file_to_write(filename):
    try:
        return codecs.open(filename, "w+", "utf-8")
    except Exception as ex:
        logger.exception(ex)
        return None


def open_binary_file_to_write(filename):
    try:
        return open(filename, "wb+")
    except Exception as ex:
        logger.exception(ex)
        return None


def open_binary_file_to_read(filename):
    try:
        return open(filename, "rb")
    except Exception as ex:
        logger.exception(ex)
        return None


def read_url_source(url, webconfig, _firefox_browser=None):
    '''
    function: use browser to get url pagesource
    --------

    output:
    -------
    None if can't read url
    '''

    hdr = {
        'user-agent': 'mozilla/5.0 (x11; linux x86_64)\
            applewebkit/537.11 (khtml, like gecko) chrome/23.0.1271.64 safari/537.11',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-charset': 'utf-8;q=0.7,*;q=0.3',
        'accept-encoding': 'none',
        'accept-language': 'en-us,en;q=0.8',
        'connection': 'keep-alive'}

    use_browser = webconfig.get_use_browser()
    _display_browser = webconfig.get_display_browser()
    _fast_load = webconfig.get_browser_fast_load()
    timeout = webconfig.get_browser_timeout()
    profile_name = webconfig.get_browser_profile()
    prevent_auto_redirect = webconfig.get_prevent_auto_redirect()

    result = False
    browser = None
    # while a:
    try:
        html_source = None
        if use_browser is False:
            try:
                response = requests.get(url, headers=hdr, timeout=30)
            except Exception as ex:
                logger.exception(ex)
                logger.exception("Request timeout")
            result = response.status_code == 200
            if response.encoding == 'ISO-8859-1':
                html_source = response.content.decode('utf-8')
            else:
                html_source = response.text
        else:
            logger.info("use browser to open %{}", url)
            if _firefox_browser.get_browser() is not None:
                browser = _firefox_browser.get_browser()
            else:
                logger.info("create new instance of firefox browser")

                browser = BrowserCrawler(
                    display_browser=_display_browser,
                    fast_load=_fast_load,
                    profile_name=profile_name)
                _firefox_browser.set_browser(browser, profile_name)
                logger.info(_firefox_browser)

            logger.info("load page: {}", url)
            result = browser.load_page(url, prevent_auto_redirect, timeout, 5)
            logger.info("browser load page result {}", str(result))
            if result is True:
                try:
                    time.sleep(3)
                    html_source = browser.get_page_html()
                except Exception as ex:
                    logger.exception(ex)
                    logger.exception("get page html error")
                    result = False

        if result is True:
            return html_source
        else:
            return None
    except Exception as ex:
        logger.exception(ex)
        logger.exception("Can't open " + url)
        return None


def quit_browser():
    global _firefox_browser

    if _firefox_browser is not None:
        logger.info("found an running instance of firefox. close it")
        logger.info(_firefox_browser)
        _firefox_browser.quit()


def get_fullurl(weburl, articleurl):
    articleurl = str(articleurl)
    if re.compile("(http|https)://").search(articleurl):
        return articleurl
    else:
        if re.compile("^//").search(articleurl):
            return weburl + articleurl.replace('//', '/')
        else:
            return weburl + articleurl


def get_firefox_profile(profile_name):
    '''
    function: return profile if exists, else create new
    input
    -----
    profile_name (str): profile in name
    '''
    profile_path = get_independent_os_path(['profiles', profile_name])

    if os.path.isdir(profile_path):
        return webdriver.FirefoxProfile(profile_path)
    else:
        logger.info("profile %s doesn't exist yet")
        logger.info("i will create profile path at {}", profile_path)
        logger.info("then you need to create profile with setup_browser.py")
        logger.info("you default profile in this session")
        os.mkdir(profile_path)
        return None


def remove_html_advanced(html_string, ignore_xpath, seperator='\n'):
    html_etree = etree.HTML(html_string)
    try:
        for xpath in ignore_xpath:
            ignore_elements = html_etree.xpath(xpath)
            ignore_elements.reverse()
            for element in ignore_elements:
                parent = element.getparent()
                if parent is not None:
                    parent.remove(element)
    except Exception as ex:
        logger.exception(ex)

    html_clean_string = get_tagstring_from_etree(html_etree)
    return remove_html(html_clean_string, seperator)


def remove_html(html_string, seperator='\n'):
    return BeautifulSoup(html_string, features="lxml").get_text()


def get_tagstring_from_etree(html_tree):
    if type(html_tree) is etree._ElementUnicodeResult:
        tagstring = str(html_tree)
    else:
        tagstring = etree.tostring(html_tree, encoding='unicode')
    tagstring.replace(u'\xa0', ' ')
    tagstring = ' '.join([x.strip()
                         for x in tagstring.split(' ') if x not in ['', ' ', u'\xa0']])
    tagstring = ' '.join([x.strip()
                         for x in tagstring.split(' ') if x not in ['', ' ', u'\xa0']])

    return tagstring
