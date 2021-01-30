const cheerio = require('cheerio')
const axios = require('axios')
const logger = require('winston')

const source = {
  'https://tinhte.vn/ios/': ['a h3.title', 'h3.title a'],
  'https://tinhte.vn/rpi/': ['a h3.title', 'h3.title a'],
  'https://tinhte.vn/dien-gia-dung/': ['a h3.title', 'h3.title a'],
  'https://tinhte.vn/bphone/': ['a h3.title', 'h3.title a'],
  'https://topdev.vn/blog/category/lap-trinh/ai-machine-learning/': ['h3.entry-title a'],
  'https://topdev.vn/blog/category/lap-trinh/frontend/': ['h3.entry-title a'],
  'https://topdev.vn/blog/category/lap-trinh/backend/': ['h3.entry-title a'],
  'https://topdev.vn/blog/category/lap-trinh/mobile/': ['h3.entry-title a'],
  'https://topdev.vn/blog/category/lap-trinh/product/': ['h3.entry-title a'],
  'https://topdev.vn/blog/category/lap-trinh/devops/': ['h3.entry-title a'],
  'https://topdev.vn/blog/category/lap-trinh/fullstack/': ['h3.entry-title a'],
  'https://viblo.asia/newest': ['h3.word-break a'],
  'https://viblo.asia/newest?page=2': ['h3.word-break a'],
  'https://viblo.asia/newest?page=3': ['h3.word-break a'],
  'https://viblo.asia/newest?page=4': ['h3.word-break a'],
}

async function getArticleTitleFrom(url, selectors) {
  let articleTitle = []

  await axios({
    method: 'get',
    url: url,
  })
    .then(function (response) {

      const $ = cheerio.load(response.data)

      selectors.forEach(selector => {
        let titles = $(selector)
        for (let i = 0; i < titles.length; i++) {
          if (titles[i].children[0].data) {
            articleTitle.push(titles[i].children[0].data)
          }
        }
      })
    })

  return articleTitle
}

async function getCrawlData() {
  let result = []
  for (const [key, value] of Object.entries(source)) {
    const message = `Crawl title of article from ${key} successfully`
    logger.info(message)
    result = result.concat(await getArticleTitleFrom(key, value))
  }
  return result
}

module.exports = {
  getCrawlData
}