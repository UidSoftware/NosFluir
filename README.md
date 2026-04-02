# Nos Studio Fluir — Sistema de Gestão

Sistema web completo de gestão para studio de Pilates e treinamento funcional, desenvolvido pela **Uid Software** para o Studio Fluir (Uberlândia - MG).

---

## Tecnologias

| Camada | Stack |
|---|---|
| **Backend** | Python 3.11+ · Django 5.0+ · Django REST Framework · SimpleJWT |
| **Frontend** | React 18 · Vite · Tailwind CSS · TanStack Query · Zustand · PWA |
| **Banco** | PostgreSQL 16+ |
| **Infra** | Docker · Docker Compose · Nginx 1.25 · Gunicorn · VPS Ubuntu 24.04 |
| **SSL** | Let's Encrypt (auto-renovação) |

---

## Pré-requisitos

- Docker e Docker Compose instalados
- Domínio apontando para o IP da VPS
- Acesso SSH à VPS

---

## Como rodar localmente

```bash
git clone https://github.com/UidSoftware/NosFluirSis
cd NosFluirSis

# Copiar e configurar variáveis de ambiente
cp .env.example .env
# editar .env com suas credenciais locais

# Subir ambiente completo
docker-compose up -d

# Criar superusuário (primeiro acesso)
docker-compose exec backend python manage.py createsuperuser

# Acessar
# Backend API:  http://localhost/api/
# Frontend:     http://localhost/sistema/
# Admin Django: http://localhost/admin/
# Swagger:      http://localhost/api/docs/
```

---

## Estrutura do Projeto

```
NosFluirSis/
├── CLAUDE.md                    ← memória do projeto (leia antes de codar)
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── entrypoint.sh            ← migrate + collectstatic + gunicorn
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── apps/
│       ├── core/                ← mixins de auditoria e imutabilidade
│       ├── usuarios/            ← auth por email + JWT
│       ├── financeiro/          ← contas, livro caixa, folha
│       ├── operacional/         ← alunos, funcionários, turmas
│       └── tecnico/             ← aulas, fichas, exercícios, reposições
├── frontend/
│   ├── src/
│   ├── vite.config.js           ← base: '/sistema/' (NÃO ALTERAR)
│   └── package.json
├── site-institucional/          ← HTML/CSS/JS puro
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
├── .env.example
└── docs/
    ├── Dicionario_Dados.md
    ├── Regras_Negocio.md
    ├── Instrucoes_Claude_Code.md
    └── testes.md
```

---

## Arquitetura de URLs

| URL | Conteúdo |
|---|---|
| `nostudiofluir.com.br/` | Site institucional |
| `nostudiofluir.com.br/sistema/` | Sistema React (frontend) |
| `nostudiofluir.com.br/api/` | API REST Django |
| `nostudiofluir.com.br/admin/` | Django Admin |
| `nostudiofluir.com.br/api/docs/` | Swagger / OpenAPI |
| `nostudiofluir.com.br/api/redoc/` | ReDoc |

---

## Perfis de Acesso

| Perfil | Permissões |
|---|---|
| **Administrador** | Acesso total sem restrição |
| **Professor** | Turmas, ministrar aulas, fichas de treino — sem financeiro |
| **Financeiro** | Módulo financeiro completo — sem técnico |
| **Recepcionista** | Cadastros, agendamentos, turmas — sem financeiro |

---

## Módulos do Sistema

**Financeiro:**
- Contas a Pagar e a Receber com lançamento automático no Livro Caixa
- Livro Caixa imutável (auditoria completa)
- Folha de Pagamento
- Planos de Pagamento recorrentes

**Operacional:**
- Cadastro de Alunos com dados antropométricos
- Cadastro de Funcionários e Profissões
- Gestão de Turmas (máx. 15 alunos)
- Pré-agendamentos via site institucional

**Técnico:**
- Biblioteca de Exercícios por aparelho
- Fichas de Treino compostas
- Ministrar Aulas com coleta de pressão arterial
- Sistema de Créditos de Reposição

**Relatórios:**
- Frequência de Alunos
- Pressão Arterial Aferida
- Relatórios Financeiros (Contas a Pagar, Receber, Livro Caixa)

---

## Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|---|---|---|
| `DATABASE_URL` | Conexão com PostgreSQL | `postgres://user:pass@db:5432/fluir` |
| `SECRET_KEY` | Chave secreta Django | gerar com `openssl rand -hex 32` |
| `DEBUG` | Modo debug | `False` (produção) |
| `ALLOWED_HOSTS` | Hosts permitidos | `nostudiofluir.com.br` |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | Validade do access token | `60` |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | Validade do refresh token | `7` |
| `VITE_API_URL` | URL da API para o frontend | `https://nostudiofluir.com.br/api` |

---

## Deploy

```bash
# Deploy completo em produção
./deploy.sh prod

# Ou manualmente:
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py collectstatic --noinput
```

---

## Status das Fases

| Fase | Descrição | Status |
|---|---|---|
| Fase 1 | Backend base (API, auth, models, Docker) | ✅ Completo |
| Fase 2 | Frontend React (PWA) | ✅ Completo — em produção |
| Fase 3 | Site Institucional | ✅ Completo — em produção |
| Fase 4 | Sistema de Reposições | 🔄 Em andamento |
| Fase 5 | Telas restantes + Relatórios | ⏳ Planejado |

---

## Documentação técnica

Ver pasta `docs/` na raiz do projeto:
- `Dicionario_Dados.md` — estrutura de todas as tabelas
- `Regras_Negocio.md` — regras de negócio numeradas
- `Instrucoes_Claude_Code.md` — guia operacional para desenvolvimento
- `testes.md` — plano de testes

---

*Desenvolvido por [Uid Software](https://uidsoftware.com.br) — 2026*
*Cliente: Studio Fluir — Uberlândia, MG*
