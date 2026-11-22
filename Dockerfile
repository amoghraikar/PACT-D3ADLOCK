# Unified Full-Stack Dockerfile for PACT on Render (Frontend + Backend)
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    API_URL=http://127.0.0.1:8000

# Install system dependencies and Node.js 20
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Backend Python dependencies
COPY apps/api/requirements.txt ./apps/api/requirements.txt
RUN pip install --no-cache-dir -r ./apps/api/requirements.txt

# Install Frontend Node dependencies (including devDependencies required for build)
COPY apps/web/package.json apps/web/package-lock.json* ./apps/web/
RUN cd apps/web && npm ci --include=dev

# Copy full application source trees
COPY apps/api/ ./apps/api/
COPY apps/web/ ./apps/web/
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Build Next.js Production Bundle
RUN cd apps/web && npm run build

# Set runtime environment
ENV NODE_ENV=production

EXPOSE 3000

CMD ["/app/start.sh"]
