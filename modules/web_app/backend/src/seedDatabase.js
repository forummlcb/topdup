import {Client} from 'pg'
import logger from 'winston'
import faker from 'faker'
import {getCrawlData} from './crawlData'

const configDatabase = {
    user: 'admin',
    host: 'localhost',
    database: 'topdup_db',
    password: 'admin',
    port: '5432'
}

const client = new Client(
    configDatabase
);

client.connect()

// Don't know why cannot seed the first user
// So I decide to do a trick that insert dummy data into the first row
const userData = [
    ['firstname', 'lastname', 'email', 'login', 'password'],
    ['Kim Phú', 'Lâm', 'lamkimphu258@gmail.com', 'lamkimphu258', 'lamkimphu258'],
    ['Minh Nhật', 'Nguyễn', 'nhat7203@gmail.com', 'nhatnguyen1810', 'nhatnguyen1810'],
    ['Thành Đạt', 'Phạm', 'datpham1910@gmail.com', 'datpham1910', 'datpham1910'],
    ['Thị Bích Ngọc', 'Mạc', 'bich.ngoc.k55b@gmail.com', 'macngoc', 'macngoc'],
    ['Tiến Trường', 'Nguyễn', 'nguyentientruong95@gmail.com', 'truongatv', 'truongatv'],
    ['Việt Dũng', 'Nguyễn', 'alexvn.edu@gmail.com', 'rxng8', 'rxng8'],
    ['Ngọc Văn', 'Nguyễn', 'van.nn1604@gmail.com', 'vannn1604', 'vannn1604'],
    ['Hiếu Cường', 'Nguyễn', 'lamnguyent7@mail.com', 'dachanh', 'dachanh'],
    ['Trần Anh Đức', 'Đỗ', 'dotrananhduc@gmail.com', 'rootofmylife', 'rootofmylife'],
    ['Nguyễn Minh Hiếu', 'Bùi', 'minhhieubuinguyen@gmail.com', 'minhhieu1', 'minhhieu1'],
    ['Quyết Thắng', 'Trần', 'diskvietnam@gmail.com', 'thangtq92', 'thangtq92'],
    ['Đức Thắng', 'Nguyễn', 'thang.nd8295@gmail.com', 'dthangnguyen', 'dthangnguyen'],
    ['Văn Cường', 'Nguyễn', 'cuongnvbkict@gmail.com', 'cuongnv', 'cuongnv'],
    ['Thiên Linh', 'Nguyễn', 'nguyenthienlinhptit@gmail.com', 'thiennlinh', 'thiennlinh'],
    ['Văn Tín', 'Phạm', 'tinphamvan123@gmail.com', 'tinspham209', 'tinspham209'],
    ['Hà Quân', 'Nguyễn', 'quan.ngha95@gmail.com', 'codexplorerepo', 'codexplorerepo'],
    ['Thùy Trang', 'Đỗ', 'trangdothuy51@gmail.com', 'trangdothuy', 'trangdothuy'],
    ['Vo', 'Huy', 'huyvo6812@gmail.com', 'sitloboi2012', 'sitloboi2012'],
    ['Lê Phương', 'Nguyễn', 'Nglephuong196@gmail.com', 'nglephuong196', 'nglephuong196'],
    ['Công Hoàng', 'Bùi', 'buiconghoang1995@gmail.com', 'buiconghoang', 'buiconghoang'],
    ['Thị Hảo', 'Lê', 'lehaohust@gmail.com', 'haolt', 'haolt'],
    ['Duy Vũ', 'Đỗ', 'vu2051996@gmail.com ', 'vict0r - pe', 'vict0r - pe'],
    ['Văn Thành', 'Phạm', 'thanhpv3380@gmail.com', 'thanhpv3380', 'thanhpv3380'],
    ['Cong Cuong', 'PHAM', 'ccuong.ph@gmail.com ', 'phamcong', 'phamcong'],
]

async function seedUser() {
    try {
        await userData.forEach(user => {
            const query = {
                text: 'insert into public."user" (firstname, lastname, email, login, password) values ($1, $2, $3, $4, $5)',
                values: user
            }

            client.query(query)
        })
    } catch (err) {
        logger.error(err)
    }
}

async function seedArticle() {
    const titles = await getCrawlData()

    try {
        titles.forEach(title => {
            const article = [title, new Date('2015-03-25'), null, faker.internet.domainName(), faker.name.findName()]
            const query = {
                text: 'insert into article (title, created_date, last_updated_date, domain, author) values ($1, $2, $3, $4, $5)',
                values: article
            }

            client.query(query)
        })
    } catch (err) {
        logger.error(err)
    }
}

async function seedSimilarityReport() {
    let articles = []
    articles = await client.query('select * from article')
    articles = articles.rows

    let similarityReports = [];

    for (let i = 0; i < articles.length; i++) {
        for (let j = 0; j < articles.length; j++) {
            if (i === j) {
                continue
            }
            similarityReports.push([articles[i].id, articles[j].id])
        }
    }

    similarityReports.forEach(similarityReport => {
        const query = {
            text: 'insert into similarity_report (source_article_id, target_article_id) values ($1, $2)',
            values: similarityReport
        }

        client.query(query)
    })
}

async function seed() {
    logger.info('SEED')
    await seedUser()
    logger.info('Seed user successfully')
    await seedArticle()
    logger.info('Seed article successfully')
    await seedSimilarityReport()
    logger.info('Seed similarity report successfully')
}

module.exports = {
    seed
}