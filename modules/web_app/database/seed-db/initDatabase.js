const {Client} = require('pg')
const logger = require('winston')

const configDatabase = {
  user: "admin",
  host: "localhost",
  database: "topdup_local",
  password: "admin",
  port: "5432"
}

const client = new Client(
  configDatabase
);

client.connect()

async function wipeDatabase() {
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE')
    logger.info('Drop schema public successfully')
    await client.query('CREATE SCHEMA IF NOT EXISTS public')
    logger.info('Create schema public successfully')
    await client.query('GRANT ALL ON SCHEMA public TO admin')
    logger.info('Grant schema public successfully')
    await client.query('GRANT ALL ON SCHEMA public TO public')
    logger.info('Grant schema public successfully')
  } catch (err) {
    logger.error(err)
  }
}

async function initDatabase() {
  try {
    await createUserTable()
    logger.info("Create user table successfully")
    await createDocumentTable()
    logger.info('Create document table successfully')
    await createVoteTable()
    logger.info('Create vote table successfully')
    await createSimilarDocsTable()
    logger.info('Create similar docs table successfully')
  } catch (err) {
    logger.error(err)
  }
}

function createUserTable() {
  const query = `
        create table if not exists public."user"
        (
            id        SERIAL PRIMARY KEY,
            firstname varchar(50) not null,
            lastname  varchar(50),
            email     varchar(50) not null,
            login     varchar(50),
            password  varchar(200),
            is_verified boolean not null, 
            secret_code varchar(50),
            thumbnail varchar(200),
            timestamp timestamp default current_timestamp,
            account_type varchar(20)
        )
    `
  client.query(query)
}

function createDocumentTable() {
  const query = `
        create table if not exists public."document"
        (
            id                  varchar(100) PRIMARY KEY,
            created             time,
            updated             time,
            text                text NOT NULL,
            index               varchar(100) NOT NULL,
            vector_id           varchar(100),
            datasource          varchar(255),
            topdup_article_id   varchar(100),
            text_original       text,
            unique(topdup_article_id)
        )
    `

  client.query(query)
}

function createVoteTable() {
  const query = `
      create table if not exists public."vote"
      (
          id                SERIAL PRIMARY KEY,
          voted_option      integer not null,
          created_date      date not null,
          article_a_id      varchar(100) not null,
          article_b_id      varchar(100) not null,
          user_id           integer not null,
          constraint fk_user foreign key (user_id) references public.user(id),
          constraint fk_article1 foreign key (article_a_id) references document(topdup_article_id),
          constraint fk_article2 foreign key (article_b_id) references document(topdup_article_id)
      )
    `

  client.query(query)
}

function createSimilarDocsTable() {
  const query = `
        create table if not exists public."similar_docs"
        (
            sim_id              text PRIMARY KEY,
            sim_score           text,
            title_A             text,
            title_B             text,
            publish_date_A      text,
            publish_date_B      text,
            url_A               text,
            url_B               text,
            domain_A            text,
            domain_B            text,
            document_id_A       text,
            document_id_B       text
        )
    `

  client.query(query, (err, res) => client.end())
}

async function init() {
  try {
    logger.info("WIPE DATABASE:")
    await wipeDatabase()

    logger.info("INIT DATABASE:")
    await initDatabase()
  } catch (err) {
    logger.error(err)
  }
}

init().then(() => console.log('Init database successfully.'))