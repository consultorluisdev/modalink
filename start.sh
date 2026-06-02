#!/bin/bash
set -e

echo "🚀 Iniciando ModaLink..."

# 1. Build do frontend
echo "📦 Compilando frontend..."
cd "$(dirname "$0")/frontend/modalink-frontend"
npm run build

# 2. Copiar para o backend
echo "📋 Copiando para o backend..."
cp -r dist/* ../backend/ModaLink.Api/wwwroot/

# 3. Iniciar Docker
echo "🐳 Iniciando containers..."
cd ../backend/ModaLink.Api
docker compose up -d

echo ""
echo "✅ ModaLink rodando!"
echo "   Frontend + API: http://localhost:5020"
echo "   pgAdmin:        http://localhost:5050"
echo ""
echo "📱 Para acessar de outro dispositivo, use o IP do servidor:"
echo "   http://$(hostname -I | awk '{print $1}'):5020"
