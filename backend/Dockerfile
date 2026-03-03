FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download ML models during build so they don't delay startup
RUN python -m spacy download en_core_web_sm
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
COPY . .

EXPOSE 8000

# Use shell form of CMD so $PORT environment variable is evaluated
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
