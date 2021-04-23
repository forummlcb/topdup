# BỘ QUÉT ĐỌC BÁO CRAWLER (Version 2.1)  

### Setup environment

Open `.env.example` and create environment value based on its suggestion. Must create 3 files `.env`, `pgadmin.env`, `postgres.env`.

If you run local, you must change the value of `DOCBAO_POSTGRES_HOST` in `.env` following your internal IP address.

### To run with Docker

`docker build -t crawler .`

`docker run --rm crawler`

### To run with Docker Compose

`docker-compose build`

`docker-compose up`

`docker-compose stop`
