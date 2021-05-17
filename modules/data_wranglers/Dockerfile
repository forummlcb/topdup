# Base Image
FROM python:3.8

# Set default environment variables
ENV PYTHONUNBUFFERED 1
ENV LANG C.UTF-8
ENV DEBIAN_FRONTEND=noninteractive

# Set project environment variables
# Grab these via Python's os.environ
# These are 100% optional here
ENV PYTHONPATH "${PYTHONPATH}:/var/app"

# Create and set working directory
RUN mkdir -p /var/app/modules/data_wranglers

# Add current directory code to working directory
COPY modules/data_wranglers/datalayer.py /var/app/modules/data_wranglers/datalayer.py
COPY modules/data_wranglers/docbao_processor.py /var/app/modules/data_wranglers/docbao_processor.py
COPY modules/data_wranglers/preprocessor /var/app/modules/data_wranglers/preprocessor
COPY modules/data_wranglers/plugins /var/app/modules/data_wranglers/plugins
COPY requirements.txt /var/app/modules/data_wranglers/requirements.txt

# Install system dependencies
RUN apt-get update -y
RUN apt-get install -y --no-install-recommends \
    tzdata \
    python3-setuptools \
    python3-pip \
    python3-dev \
    python3-venv \
    git \
    curl \
    && \
    apt-get install -y openjdk-11-jre-headless && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install environment dependencies
RUN pip3 install --upgrade pip

# Install project dependencies
WORKDIR /var/app/modules/data_wranglers
RUN pip3 install -r requirements.txt

# Run the API
WORKDIR /var/app
CMD ["python", "modules/data_wranglers/docbao_processor.py"]
