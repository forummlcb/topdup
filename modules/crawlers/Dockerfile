FROM ubuntu:18.04
FROM python:3.8-buster

EXPOSE 8080

RUN apt install firefox
RUN apt install xvfb
RUN export PYTHONIOENCODING=utf8

# SETTING FOR POSTGRESQL
RUN export DOCBAO_POSTGRES_HOST=
RUN export DOCBAO_POSTGRES_USERNAME=
RUN export DOCBAO_POSTGRES_PASSWORD=
RUN export DOCBAO_POSTGRES_DATABASE=
RUN export DOCBAO_POSTGRES_PORT=

COPY . /home

WORKDIR /home

RUN pip3 install -r requirements.txt

WORKDIR /home/src

CMD ["python3", "crawl.py"]