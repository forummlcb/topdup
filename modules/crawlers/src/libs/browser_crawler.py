from selenium import webdriver
from selenium.webdriver.firefox.options import Options
import random
import os
from time import sleep
from loguru import logger


def get_independent_os_path(path_list):
    path = ""
    for item in path_list:
        path = os.path.join(path, item)
    return path

# firefox functions


def get_firefox_profile(profile_name):
    '''
    function: return profile if exists, else create new
    input
    -----
    profile_name (str): profile in name
    '''
    base_dir = os.environ['DOCBAO_BASE_DIR']
    profile_path = get_independent_os_path(
        [base_dir, 'src', 'backend', 'profiles', profile_name])

    if os.path.isdir(profile_path):
        return webdriver.FirefoxProfile(profile_path)
    else:
        print("profile %s doesn't exist yet")
        print("you need to create %s profile with setup_browser.py")
        print("you default profile in this session")
        os.mkdir(profile_path)
        return None


def save_firefox_profile(profile_name, profile_temp_path):
    """Save temp profile back to profile"""
    """
        @Args:
            - profile_name: name of profile folder
            - profile_temp_path: path to temp profile folder
        @Return:
            - True: success
            - False: fail
    """
    if profile_name:
        try:
            base_dir = os.environ['DOCBAO_BASE_DIR']
            profile_path = get_independent_os_path(
                [base_dir, 'src', 'backend', 'profiles', profile_name])
            os.system("cp -R " + profile_temp_path + "/* " + profile_path)
        except Exception as ex:
            print(ex)
            return False
        return True
    else:
        return True


class BrowserWrapper:
    # Wrap browser variable so it can be passed as reference variable
    _browser = None
    _profile = ''

    def set_browser(self, new_browser, profile):
        self._browser = new_browser
        self._profile = profile

    def get_browser(self):
        return self._browser

    def get_profile(self):
        return self._profile

    def quit(self):
        if self._browser is not None:
            self._browser.quit()


class BrowserCrawler:
    # Function: this class use Firefox browser to fetch all rendered html of a page
    _driver = None
    _has_error = False
    _quited = False
    _diplay = None

    def __init__(
            self, timeout=60, display_browser=False, fast_load=True, profile_name=None):
        '''
        input
        -----

        timeout: timeout to load page
        display_browser: not run browser in headless mode
        fast_load: use ads block plugins, turn off css to load page faster
        profile (str): provide a profile name. Need to set up profile first
        '''
        # Create a headless Firefox browser to crawl

        options = Options()
        if display_browser is False:
            options.add_argument("--headless")

        if profile_name is None or profile_name == "":
            profile = webdriver.FirefoxProfile()
            self._profile = None
        else:
            profile = get_firefox_profile(profile_name)
            self._profile = profile_name
            print("Firefox profile: %s" % profile_name)

        if fast_load is True:
            profile.set_preference('permissions.default.stylesheet', 2)
            # Disable images
            profile.set_preference('permissions.default.image', 2)
            # Disable notification
            profile.set_preference('permissions.default.desktop-notification', 2)
            # Disable Flash
            profile.set_preference('dom.ipc.plugins.enabled.libflashplayer.so', 'false')
            # Adblock Extension
            base_dir = os.environ['DOCBAO_BASE_DIR']
            profile.exp = get_independent_os_path(
                [base_dir, 'src', 'backend', 'input', "adblock.xpi"])
            profile.add_extension(extension=profile.exp)

        self._driver = webdriver.Firefox(
            firefox_options=options, firefox_profile=profile)

        # Firefox copy file from profile path to this temp path
        self._profile_temp_path = self._driver.firefox_profile.path

        self._driver.set_page_load_timeout(timeout)
        self._quited = False

    def load_page(self, url, prevent_auto_redirect=False, wait=5, entropy=3):
        # Function: load page with url
        # Input:
        # - wait: time waiting for page to load
        # - entropy: small random add to waiting time

        wait = int(wait + random.random() * entropy)

        self._has_error = False
        # while a:
        try:
            self._driver.get(url)
            if prevent_auto_redirect:
                sleep(3)
                print('reload url to prevent auto redirect')
                self._driver.get(url)
            return True
        except Exception as ex:
            logger.exception(ex)
            logger.exception("Timeout")
            self._has_error = True
            return False

    def get_title(self):
        # Function: return page title
        return self._driver.title

    def get_page_html(self):
        # Return all html of an web
        return self._driver.page_source

    def has_error(self):
        return self._has_error

    def has_quited(self):
        return self._quited

    def quit(self):

        if not save_firefox_profile(self._profile, self._profile_temp_path):
            print(f"Can't save profile {self._profile}")
        # save profile to old profile

        self._driver.quit()
        self._quited = True
