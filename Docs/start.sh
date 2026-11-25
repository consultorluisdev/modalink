#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Iniciando ModaLink..."

# 1. Build do frontend
echo "📦 Compilando frontend..."
cd "$ROOT/frontend/modalink-frontend"
npm run build

# 2. Copiar para o backend
echo "📋 Copiando para o backend..."
rm -rf "$ROOT/backend/ModaLink.Api/wwwroot"
mkdir -p "$ROOT/backend/ModaLink.Api/wwwroot"
cp -r dist/* "$ROOT/backend/ModaLink.Api/wwwroot/"

# 3. Rebuildar e iniciar Docker
echo "🐳 Rebuildando e iniciando containers..."
cd "$ROOT"
docker compose --env-file .env -f docker/docker-compose.yml up -d --build

echo ""
echo "✅ ModaLink rodando!"
echo "   Frontend + API: http://localhost:5020"
echo "   pgAdmin:        http://localhost:5050"
echo ""
echo "📱 Para acessar de outro dispositivo, use o IP do servidor:"
echo "   http://$(hostname -I | awk '{print $1}'):5020"
