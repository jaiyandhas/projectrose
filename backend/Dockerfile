FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Use shell form of CMD so $PORT environment variable is evaluated
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
