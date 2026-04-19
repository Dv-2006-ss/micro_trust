FROM python:3.11-slim

# Set work directory
WORKDIR /app

# Install dependencies for Tesseract and standard build tools
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Ensure standard output
ENV PYTHONUNBUFFERED=1
ENV TESSERACT_PATH=/usr/bin/tesseract

# Command to run on start
CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
