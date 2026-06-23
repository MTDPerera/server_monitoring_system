#!/bin/bash
set -e

echo "==> Pulling latest code..."
git pull origin develop

echo "==> Building and starting services..."
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Running database migrations..."
docker compose -f docker-compose.prod.yml exec app node_modules/.bin/prisma migrate deploy

echo "==> Done. Dashboard is running."
