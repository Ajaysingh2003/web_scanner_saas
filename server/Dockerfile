FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
COPY app app
COPY alembic alembic
COPY alembic.ini .
RUN pip install --no-cache-dir --retries 5 --timeout 120 -r requirements.txt
ENV PYTHONPATH=/app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
