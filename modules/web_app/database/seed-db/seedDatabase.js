const { Client } = require("pg");
const logger = require("winston");
const faker = require("faker");
const { getCrawlData } = require("./crawlData");
const { random } = require("faker");

const configDatabase = {
  user: "admin",
  host: "3.1.100.54",
  database: "topdup_db",
  password: "uyL7WgydqKNkNMWe",
  port: "5432"
};

const client = new Client(configDatabase);

client.connect();

// Don't know why cannot seed the first user
// So I decide to do a trick that insert dummy data into the first row
const userData = [
  ["firstname", "lastname", "email", "login", "password"],
  ["Kim Phú", "Lâm", "lamkimphu258@gmail.com", "lamkimphu258", "lamkimphu258"],
  ["Minh Nhật", "Nguyễn", "nhat7203@gmail.com", "nhatnguyen1810", "nhatnguyen1810"],
  ["Thành Đạt", "Phạm", "datpham1910@gmail.com", "datpham1910", "datpham1910"],
  ["Thị Bích Ngọc", "Mạc", "bich.ngoc.k55b@gmail.com", "macngoc", "macngoc"],
  ["Tiến Trường", "Nguyễn", "nguyentientruong95@gmail.com", "truongatv", "truongatv"],
  ["Việt Dũng", "Nguyễn", "alexvn.edu@gmail.com", "rxng8", "rxng8"],
  ["Ngọc Văn", "Nguyễn", "van.nn1604@gmail.com", "vannn1604", "vannn1604"],
  ["Hiếu Cường", "Nguyễn", "lamnguyent7@mail.com", "dachanh", "dachanh"],
  ["Trần Anh Đức", "Đỗ", "dotrananhduc@gmail.com", "rootofmylife", "rootofmylife"],
  ["Nguyễn Minh Hiếu", "Bùi", "minhhieubuinguyen@gmail.com", "minhhieu1", "minhhieu1"],
  ["Quyết Thắng", "Trần", "diskvietnam@gmail.com", "thangtq92", "thangtq92"],
  ["Đức Thắng", "Nguyễn", "thang.nd8295@gmail.com", "dthangnguyen", "dthangnguyen"],
  ["Văn Cường", "Nguyễn", "cuongnvbkict@gmail.com", "cuongnv", "cuongnv"],
  ["Thiên Linh", "Nguyễn", "nguyenthienlinhptit@gmail.com", "thiennlinh", "thiennlinh"],
  ["Văn Tín", "Phạm", "tinphamvan123@gmail.com", "tinspham209", "tinspham209"],
  ["Hà Quân", "Nguyễn", "quan.ngha95@gmail.com", "codexplorerepo", "codexplorerepo"],
  ["Thùy Trang", "Đỗ", "trangdothuy51@gmail.com", "trangdothuy", "trangdothuy"],
  ["Vo", "Huy", "huyvo6812@gmail.com", "sitloboi2012", "sitloboi2012"],
  ["Lê Phương", "Nguyễn", "Nglephuong196@gmail.com", "nglephuong196", "nglephuong196"],
  ["Công Hoàng", "Bùi", "buiconghoang1995@gmail.com", "buiconghoang", "buiconghoang"],
  ["Thị Hảo", "Lê", "lehaohust@gmail.com", "haolt", "haolt"],
  ["Duy Vũ", "Đỗ", "vu2051996@gmail.com ", "vict0r - pe", "vict0r - pe"],
  ["Văn Thành", "Phạm", "thanhpv3380@gmail.com", "thanhpv3380", "thanhpv3380"],
  ["Cong Cuong", "PHAM", "ccuong.ph@gmail.com ", "phamcong", "phamcong"]
];

async function seedUser() {
  try {
    await userData.forEach(user => {
      const query = {
        text: 'insert into public."user" (firstname, lastname, email, login, password, is_verified) values ($1, $2, $3, $4, $5, $6)',
        values: [...user, true]
      };

      client.query(query);
    });
  } catch (err) {
    logger.error(err);
  }
}

async function seedArticle() {
  const titles = await getCrawlData();

  try {
    titles.forEach(title => {
      const article = [title, new Date(), null, faker.internet.domainName(), faker.name.findName()];
      const query = {
        text: "insert into article (title, created_date, last_updated_date, domain, author) values ($1, $2, $3, $4, $5)",
        values: article
      };

      client.query(query);
    });
  } catch (err) {
    logger.error(err);
  }
}

async function getVotesData(limit_pairs = 2000, limit_rows = 1000) {
  const userIdQuery = `SELECT id FROM public."user";`;
  let userIdx = [];
  try {
    res = await client.query(userIdQuery);
    res.rows.forEach(row => {
      userIdx.push(row["id"]);
    });
  } catch (err) {
    console.log(err);
  }

  // Take all pairs of article, and randomize number of votes.
  const query = {
    text: `SELECT A1.id as id1, A2.id as id2
            FROM public."article" A1
            JOIN public."article" A2 
            ON A1.id != A2.id
            LIMIT $1`,
    values: [limit_pairs]
  };

  let randomVotes = [];
  try {
    res = await client.query(query);
    nbRows = res.rows.length;
    maxPairs = nbRows > limit_pairs ? limit_pairs : nbRows;
    console.log("Nb rows:", res.rows.length);
    console.log("Get " + res.rows.length + " pairs of articles, generated " + limit_rows + " number of voting instances.");
    for (i = 0; i < limit_rows; i++) {
      // random number of row in the retunred result
      const row_id = Math.floor(Math.random() * Math.floor(maxPairs - 1));
      console.log("row_id: ", row_id);
      row = res.rows[row_id];

      if (row) {
        // Random integer (vote for which article)
        const r = Math.random() < 0.5;

        // Get user id
        const uid = Math.floor(Math.random() * Math.floor(userIdx.length - 1));
        randomVotes.push({
          voted_option: 1 + Math.floor(Math.random() * 4),
          created_date: new Date(),
          article_a_id: row["id1"],
          article_b_id: row["id2"],
          user_id: userIdx[uid]
        });
      }
    }
  } catch (err) {
    console.log(err);
  }

  console.log(randomVotes.length);
  return randomVotes;
}

async function seedVote() {
  const votes = await getVotesData(8000, 400);

  try {
    votes
      .forEach(({ voted_option, created_date, article_a_id, article_b_id, user_id }) => {
        const data = [voted_option, created_date, article_a_id, article_b_id, user_id];
        const query = {
          text: 'insert into public."vote" (voted_option, created_date, article_a_id, article_b_id, user_id) values ($1, $2, $3, $4, $5)',
          values: data
        };

        client.query(query);
      })
      .catch(err => {
        logger.error(err);
      });
  } catch (err) {
    logger.error(err);
  }
}

async function seedSimilarityReport() {
  let articles = [];
  articles = await client.query("select * from article");
  articles = articles.rows;

  let similarityReports = [];

  for (let i = 0; i < articles.length; i++) {
    for (let j = 0; j < articles.length; j++) {
      if (i === j) {
        continue;
      }
      similarityReports.push([
        articles[i].id,
        articles[j].id,
        parseFloat(Math.random().toFixed(3)),
        new Date(+new Date() - Math.floor(Math.random() * 10000000000))
      ]);
    }
  }

  for (const similarityReport of similarityReports) {
    const query = {
      text: "insert into similarity_report (article_a_id, article_b_id, sim_score, updated_date) values ($1, $2, $3, $4)",
      values: similarityReport
    };

    await client.query(query);

    console.log("Please wait. Seeding record for similarity report table...", similarityReport[0], similarityReport[1]);
  }

  await client.end();
}

async function seed() {
  // logger.info("SEED");
  // await seedUser();
  // logger.info("Seed user successfully");
  // await seedArticle();
  // logger.info("Seed article successfully");
  // await seedVote();
  logger.info("Seed vote successfully");
  await seedSimilarityReport();
  logger.info("Seed similarity report successfully");
}

seed().then(() => console.log("Seed database successfully."));
