# syntax=docker/dockerfile:1

# --- 1. Compilation de l'interface ------------------------------------------
FROM node:22-alpine AS web
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html tsconfig*.json vite.config.ts eslint.config.js ./
COPY public ./public
COPY src ./src
RUN npx vite build

# --- 2. Serveur d'exécution -------------------------------------------------
FROM python:3.14-slim AS runtime

LABEL org.opencontainers.image.title="Scopeo" \
      org.opencontainers.image.description="Cadrage et diagnostic réglementaire RGPD, NIS2, DORA et CRA" \
      org.opencontainers.image.licenses="MIT"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    SCOPEO_DATA_DIR=/data

WORKDIR /app/server
COPY server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY server/app ./app
COPY --from=web /build/dist /app/dist

RUN useradd --system --uid 10001 erm \
 && mkdir -p /data \
 && chown -R erm /data
USER erm

VOLUME ["/data"]
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
