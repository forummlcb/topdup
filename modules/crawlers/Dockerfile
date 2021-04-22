FROM ubuntu:18.04
FROM python:3.8-buster

EXPOSE 8080

RUN export PYTHONIOENCODING=utf8

COPY . /home

WORKDIR /home

RUN pip3 install -r requirements.txt

WORKDIR /home/src

CMD ["python3", "-u", "crawl.py"]