#!/bin/bash
# deploy.sh — Nos Studio Fluir
# Uid Software
# Uso: ./deploy.sh [ambiente: prod|staging]
# Exemplo: ./deploy.sh prod

set -e

AMBIENTE=${1:-prod}
PROJETO="NosFluir"
REPO="https://github.com/UidSoftware/NosFluir"
DOMINIO="nostudiofluir.com.br"

echo ""
echo "🚀 =================================="
echo "   Deploy — $PROJETO"
echo "   Ambiente: $AMBIENTE"
echo "   Domínio:  $DOMINIO"
echo "=================================="
echo ""

# Verificar se está no diretório correto
if [ ! -f "docker-compose.yml" ]; then
  echo "❌ Erro: execute este script na raiz do projeto (onde está o docker-compose.yml)"
  exit 1
fi

# Verificar se .env existe
if [ ! -f ".env" ]; then
  echo "❌ Erro: arquivo .env não encontrado. Copie .env.example e configure."
  exit 1
fi

echo "📥 Atualizando código do repositório..."
git pull origin main
echo "✅ Código atualizado"
echo ""

# Build do frontend via Docker (não requer npm na VPS)
if [ -d "frontend" ]; then
  echo "🔨 Buildando frontend React via Docker..."
  docker build -t nosfluir-frontend-builder ./frontend
  docker create --name nosfluir-frontend-build nosfluir-frontend-builder
  docker cp nosfluir-frontend-build:/var/www/frontend ./frontend/dist
  docker rm nosfluir-frontend-build
  docker rmi nosfluir-frontend-builder
  echo "✅ Frontend buildado (dist/ atualizado)"
  echo ""
fi

echo "🛑 Parando containers..."
docker compose down
echo "✅ Containers parados"
echo ""

echo "🔨 Rebuilding imagens (sem cache)..."
docker compose build --no-cache
echo "✅ Imagens reconstruídas"
echo ""

echo "▶️  Subindo containers..."
docker compose up -d
echo "✅ Containers no ar"
echo ""

# Aguardar banco de dados subir (entrypoint.sh já executa migrations + collectstatic)
echo "⏳ Aguardando inicialização do backend..."
sleep 15

# Verificar saúde dos containers
echo "🩺 Verificando saúde dos containers..."
docker compose ps
echo ""

# Verificar se backend responde
echo "🌐 Testando resposta da API..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMINIO/api/" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "401" ] || [ "$HTTP_STATUS" = "403" ]; then
  echo "✅ API respondendo (HTTP $HTTP_STATUS)"
else
  echo "⚠️  API retornou HTTP $HTTP_STATUS — verifique os logs"
  echo "   Logs: docker compose logs -f backend"
fi

echo ""
echo "✅ =================================="
echo "   Deploy concluído — $PROJETO"
echo "   Sistema:  https://$DOMINIO/sistema/"
echo "   API:      https://$DOMINIO/api/"
echo "   Admin:    https://$DOMINIO/admin/"
echo "=================================="
echo ""

# Registrar histórico de deploy
echo "Deploy realizado em $(date '+%d/%m/%Y %H:%M:%S') - Ambiente: $AMBIENTE" >> deploy_history.log
echo "📋 Histórico salvo em deploy_history.log"
