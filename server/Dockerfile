FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --retries 5 --timeout 120 -r requirements.txt
RUN playwright install --with-deps chromium
COPY app app
COPY alembic alembic
COPY alembic.ini .
ENV PYTHONPATH=/app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
