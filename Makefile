# ─── Nos Studio Fluir — Makefile ─────────────────────────────────────────────
# Uso: make <comando>
# Requer: docker compose v2, git

.PHONY: help dev dev-down dev-logs dev-build \
        prod-build prod-up prod-down prod-logs \
        migrate createsuperuser shell \
        frontend-dev frontend-build \
        deploy lint test clean

# ─── Padrão ───────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  Nos Studio Fluir — comandos disponíveis"
	@echo ""
	@echo "  DESENVOLVIMENTO LOCAL"
	@echo "  ─────────────────────────────────────────"
	@echo "  make dev              Sobe o ambiente de desenvolvimento"
	@echo "  make dev-down         Para o ambiente de desenvolvimento"
	@echo "  make dev-logs         Logs de todos os serviços (dev)"
	@echo "  make dev-build        Rebuild das imagens (dev)"
	@echo ""
	@echo "  FRONTEND (rodar separado do Docker)"
	@echo "  ─────────────────────────────────────────"
	@echo "  make frontend-dev     npm run dev (hot reload em localhost:5173)"
	@echo "  make frontend-build   npm run build (gera dist/ para deploy)"
	@echo "  make frontend-install npm install"
	@echo ""
	@echo "  BACKEND / BANCO"
	@echo "  ─────────────────────────────────────────"
	@echo "  make migrate          Executa migrate dentro do container backend"
	@echo "  make createsuperuser  Cria superusuário Django"
	@echo "  make shell            Abre shell Django dentro do container"
	@echo "  make shell-db         Abre psql dentro do container db"
	@echo ""
	@echo "  PRODUÇÃO"
	@echo "  ─────────────────────────────────────────"
	@echo "  make prod-build       Rebuild imagens de produção (sem cache)"
	@echo "  make prod-up          Sobe produção em background"
	@echo "  make prod-down        Para produção"
	@echo "  make prod-logs        Logs de produção (follow)"
	@echo "  make deploy           Script completo de deploy (./deploy.sh)"
	@echo ""
	@echo "  UTILITÁRIOS"
	@echo "  ─────────────────────────────────────────"
	@echo "  make clean            Remove volumes dev e imagens dangling"
	@echo "  make ps               Lista containers rodando"
	@echo ""

# ─── Desenvolvimento ──────────────────────────────────────────────────────────
dev:
	docker compose -f docker-compose.dev.yml up -d
	@echo ""
	@echo "  Ambiente dev no ar:"
	@echo "  Backend:   http://localhost:8000/api/"
	@echo "  Admin:     http://localhost:8000/admin/"
	@echo "  Site:      http://localhost:8080"
	@echo "  Sistema:   npm run dev em frontend/ → http://localhost:5173/sistema/"
	@echo ""

dev-down:
	docker compose -f docker-compose.dev.yml down

dev-logs:
	docker compose -f docker-compose.dev.yml logs -f

dev-build:
	docker compose -f docker-compose.dev.yml build --no-cache && \
	docker compose -f docker-compose.dev.yml up -d

# ─── Frontend ─────────────────────────────────────────────────────────────────
frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build
	@echo "✅ Build gerado em frontend/dist/"

# ─── Backend (dentro do container de dev) ─────────────────────────────────────
migrate:
	docker compose -f docker-compose.dev.yml exec backend \
	  sh -c "python manage.py makemigrations --noinput && python manage.py migrate --noinput"

createsuperuser:
	docker compose -f docker-compose.dev.yml exec backend python manage.py createsuperuser

shell:
	docker compose -f docker-compose.dev.yml exec backend python manage.py shell

shell-db:
	docker compose -f docker-compose.dev.yml exec db \
	  psql -U studio_fluir_user -d studio_fluir

# ─── Produção ─────────────────────────────────────────────────────────────────
prod-build:
	docker compose build --no-cache

prod-up:
	docker compose up -d

prod-down:
	docker compose down

prod-logs:
	docker compose logs -f

ps:
	docker compose ps

# ─── Deploy completo ──────────────────────────────────────────────────────────
deploy:
	@chmod +x deploy.sh && ./deploy.sh prod

# ─── Utilitários ──────────────────────────────────────────────────────────────
clean:
	docker compose -f docker-compose.dev.yml down -v
	docker image prune -f
	@echo "✅ Volumes dev e imagens dangling removidos"
