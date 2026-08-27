FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 VERSINE_DB=/app/data/progress.db

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server/ ./server/
COPY web/ ./web/

EXPOSE 8000
WORKDIR /app/server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
