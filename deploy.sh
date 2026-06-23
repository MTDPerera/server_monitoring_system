#!/bin/bash
set -e

echo "==> Pulling latest code..."
git pull origin develop

echo "==> Building and starting services..."
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Done. Dashboard is running (migrations run automatically on startup)."
