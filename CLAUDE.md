# CLAUDE.md — Sistema Nos Studio Fluir
> Leia este arquivo SEMPRE antes de qualquer ação.
> Última atualização: 03/04/2026 | Versão: 4.3

---

## 📋 Visão Geral

**Nome:** Nos Studio Fluir
**Cliente:** Studio Fluir — Giulia Fagionato e Tássia Magnaboso
**Localização:** Uberlândia - MG
**Domínio:** nostudiofluir.com.br
**Repositório:** https://github.com/UidSoftware/NosFluir
**Desenvolvido por:** Uid Software

**O sistema é OFICIAL e está em uso pelas clientes.**
Não é mais MVP — qualquer alteração impacta produção diretamente.

---

## 🎯 Objetivo

Sistema web de gestão completo para studio de Pilates e treinamento funcional, integrando:
- **Financeiro** — contas a pagar/receber, livro caixa, folha de pagamento
- **Operacional** — alunos, funcionários, turmas, agendamentos
- **Técnico** — exercícios, fichas de treino, aulas, reposições
- **Relatórios** — financeiros, frequência, pressão arterial, evolução

---

## 🏗️ Stack

**Backend:**
- Python 3.11+ | Django 5.0+ | Django REST Framework
- PostgreSQL 16+ | JWT (SimpleJWT com blacklist)
- Paginação: `PageNumberPagination` — PAGE_SIZE = 20
- Autenticação: por **email** (não username)

**Frontend:**
- React 18 + Vite | React Router v6 | Axios | TanStack Query | Zustand
- Tailwind CSS | Recharts | PWA via `vite-plugin-pwa`
- Roda em: `nostudiofluir.com.br/sistema/`
- `base: '/sistema/'` no vite.config.js — **NÃO ALTERAR**

**Site Institucional:**
- HTML/CSS/JS puro
- Roda na raiz: `nostudiofluir.com.br/`

**Infra:**
- VPS Ubuntu 24.04 | Docker Compose v2 (`docker compose`, sem hífen)
- Nginx 1.25 (SSL Let's Encrypt) | Gunicorn (3 workers)
- `entrypoint.sh` executa makemigrations → migrate usuarios → migrate → collectstatic → gunicorn
- Repo na VPS aponta para `UidSoftware/NosFluir` (substituiu o antigo `UidSoftware/NosFluirSis`)

---

## 🌐 Arquitetura de Domínio

```
nostudiofluir.com.br/           → Site institucional (HTML/CSS/JS)
nostudiofluir.com.br/sistema/   → Sistema React (frontend)
nostudiofluir.com.br/api/       → Backend Django REST
nostudiofluir.com.br/admin/     → Django Admin
nostudiofluir.com.br/api/docs/  → Swagger
nostudiofluir.com.br/api/redoc/ → ReDoc
```

---

## 📂 Estrutura de Diretórios

```
NosFluir/
├── CLAUDE.md                          ← este arquivo — raiz do projeto
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── apps/
│       ├── core/
│       │   └── mixins.py              ← AuditMixin, ReadCreateMixin
│       ├── usuarios/
│       ├── financeiro/
│       │   └── signals.py             ← lançamentos automáticos LivroCaixa
│       ├── operacional/
│       └── tecnico/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── vite.config.js                 ← base: '/sistema/' + PWA
│   └── package.json
├── site-institucional/
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
├── .env                               ← NÃO COMITAR
└── .env.example
```

---

## 🗄️ Modelagem — Princípios Obrigatórios

1. **Dinheiro:** SEMPRE `DECIMAL(10,2)` — NUNCA Float/Double
2. **Auditoria:** todos os models herdam `BaseModel` (abstract):
   - `created_at`, `updated_at`, `deleted_at`
   - `created_by`, `updated_by`, `deleted_by`
3. **Soft Delete:** NUNCA `objeto.delete()` — sempre setar `deleted_at` + `deleted_by`
4. **CPF/CNPJ:** String (preserva zeros à esquerda)
5. **ENUMs:** usar choices do Django

### Convenção de nomenclatura:
```python
# Model: PascalCase singular
class CreditoReposicao(BaseModel): pass

# Campos: prefixo da tabela + nome
cred_status = models.CharField(...)
aul_pressao_inicio = models.CharField(...)

# Exceção: campos de auditoria (sem prefixo)
created_at = models.DateTimeField(...)
```

---

## 📊 Models Existentes (29 models em 4 apps)

### App `financeiro` — 7 models
| Model | Tabela | Observação |
|---|---|---|
| Fornecedor | fornecedor | |
| ServicoProduto | servico_produto | |
| ContasPagar | contas_pagar | signal → LivroCaixa ao pagar |
| ContasReceber | contas_receber | signal → LivroCaixa ao receber |
| PlanosPagamentos | planos_pagamentos | |
| LivroCaixa | livro_caixa | **IMUTÁVEL** via ReadCreateMixin |
| FolhaPagamento | folha_pagamento | unique: func+mes+ano |

### App `operacional` — 7 models
| Model | Tabela | Observação |
|---|---|---|
| Aluno | alunos | CPF único |
| Profissao | profissao | catálogo |
| Funcionario | funcionario | CPF único |
| Turma | turma | max 15 alunos |
| TurmaAlunos | turma_alunos | N:N unique: turma+aluno |
| AgendamentoHorario | agendamento_horario | pré-cadastro do site |
| AgendamentoTurmas | agendamento_turmas | pré-cadastro do site |

### App `tecnico` — 5 models
| Model | Tabela | Observação |
|---|---|---|
| Exercicio | exercicios | aparelhos: solo/reformer/cadillac/chair/barrel |
| FichaTreino | ficha_treino | |
| FichaTreinoExercicios | ficha_treino_exercicios | N:N com ordem+séries+reps |
| Aula | aulas | 1 linha = 1 aluno em 1 aula. unique: turma+aluno+data+hora_inicio |
| CreditoReposicao | creditos_reposicao | **NOVO — Fase 4** |

### App `usuarios` — 1 model
| Model | Tabela | Observação |
|---|---|---|
| User | users | AbstractUser, auth por email |

---

## 🔐 Perfis de Acesso (4 grupos Django)

| Perfil | Acesso |
|---|---|
| **Administrador** | Tudo sem restrição |
| **Professor** | Suas turmas, ministrar aula, fichas — sem financeiro |
| **Financeiro** | Módulo financeiro completo — sem técnico |
| **Recepcionista** | Cadastros, agendamentos, turmas — sem financeiro |

---

## 🪙 Sistema de Créditos de Reposição — Regras Definitivas

### Tipos de falta:
| Situação | Gera crédito? |
|---|---|
| Aviso entre 48h e 1h antes da aula | ✅ Sim |
| Atestado médico (qualquer prazo) | ✅ Sim — pula regra de antecedência |
| Aviso com mais de 48h antes | ⚠️ Pendente — perguntar às clientes |
| Aviso com menos de 1h / sem aviso | ❌ Não |

### Regras do crédito:
- **Validade:** 30 dias corridos a partir da data de aquisição
- **Limite:** máximo 3 créditos simultâneos por aluno
- **Prioridade:** crédito mais próximo de expirar é consumido primeiro (FIFO)
- **Faltou na reposição:** perde o crédito definitivamente
- **Uso cruzado** (Pilates ↔ Funcional): máximo 1x por mês

### Model `CreditoReposicao`:
```python
STATUS: 'disponivel' | 'usado' | 'expirado'
Campos: aluno (FK), aula_origem (FK), aula_reposicao (FK nullable),
        cred_data_geracao, cred_data_expiracao (+30 dias auto),
        cred_usado (boolean), cred_status
```

### Pendências de reunião:
- Aviso com mais de 48h antes → gera crédito ou não?
- Mistura de níveis na aula de reposição → como o professor conduz?

---

## 📝 Regras de Negócio Críticas

### Financeiro:
- `ContasPagar: valor_total = qtd × valor_unitario` (sem desconto)
- `ContasReceber: valor_total = (qtd × valor_unitario) - desconto`
- `valor_liquido = salario_base - descontos`
- LivroCaixa: **NUNCA** editar/deletar — criar estorno se necessário
- ContasPagar pago → signal cria lançamento **saída** automático
- ContasReceber recebido → signal cria lançamento **entrada** automático
- FolhaPagamento: **NÃO** gera lançamento automático

### Técnico:
- Pressão arterial: formato "120/80" — regex `^\d{2,3}/\d{2}$`
- Intensidade de esforço: 0-10
- Mesmo exercício com aparelhos diferentes = registros independentes

### Paginação (CRÍTICO para o frontend):
```javascript
// SEMPRE usar .results — nunca .data direto
const dados = response.data.results
const total = response.data.count
```

---

## 🚀 Comandos Principais

```bash
# Desenvolvimento local
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# Docker (produção) — usar docker compose v2 (sem hífen)
docker compose build
docker compose up -d
docker compose logs -f backend
docker compose down

# Para aplicar mudanças de código (rebuild obrigatório — código é copiado na imagem):
docker compose build backend && docker compose up -d backend

# Frontend
cd frontend
npm install
npm run dev        # desenvolvimento
npm run build      # gerar dist/ para deploy
```

---

## ⚠️ O que NÃO fazer

- ❌ Float/Double para dinheiro
- ❌ `objeto.delete()` — usar soft delete
- ❌ Editar/deletar LivroCaixa
- ❌ Lançamento automático para FolhaPagamento
- ❌ CPF/CNPJ como número (perde zeros à esquerda)
- ❌ Migrations fora do container
- ❌ Comitar `.env`
- ❌ Alterar `base: '/sistema/'` no vite.config.js
- ❌ `response.data` em listagens — sempre `response.data.results`
- ❌ Criar outro CLAUDE.md — este é o único

---

## 🐛 Troubleshooting

| Erro | Causa | Solução |
|---|---|---|
| "decimal places not allowed" | Float em vez de Decimal | `Decimal('150.00')` |
| "duplicate key violates unique" | Registro duplicado | Verificar `unique_together` |
| Lançamento duplicado LivroCaixa | Signal chamado 2x | Signals já checam existência — não remover |
| 403 no update/delete LivroCaixa | ReadCreateMixin por design | Criar estorno |
| Frontend 404 em /sistema/ | base não configurado | Verificar `base: '/sistema/'` no vite |
| Login não funciona | Tentando auth por username | Verificar `USERNAME_FIELD = 'email'` no model User |
| Django admin "credenciais incorretas" | EmailBackend não aceitava kwarg `username` | EmailBackend aceita `email or username` — já corrigido |
| 403 CSRF no admin | Sistema atrás de Nginx sem proxy headers | `CSRF_TRUSTED_ORIGINS`, `SECURE_PROXY_SSL_HEADER`, `USE_X_FORWARDED_HOST` — já configurados |
| `restart` não aplica mudanças de código | Código está na imagem Docker, não em volume | Sempre usar `docker compose build backend && docker compose up -d backend` |
| `App does not have migrations` | Diretório `migrations/` não existia | Criar `migrations/__init__.py` em cada app e commitar |

---

## ✅ Status das Fases

### Fase 1 — Backend ✅ COMPLETO E EM PRODUÇÃO (03/04/2026)
- [x] 29 models em 4 apps (usuarios, financeiro, operacional, tecnico)
- [x] API REST completa — serializers, viewsets, filtros, paginação PAGE_SIZE=20
- [x] JWT — autenticação por email, blacklist, refresh rotation
- [x] Signals — ContasPagar/ContasReceber → LivroCaixa automático
- [x] Django Admin — todos os models registrados e funcional
- [x] Docker — Dockerfile, entrypoint.sh, docker-compose.yml
- [x] Nginx configurado (SSL Let's Encrypt, proxy reverso)
- [x] BaseModel, AuditMixin, ReadCreateViewSet (LivroCaixa imutável)
- [x] EmailBackend corrigido (aceita `email` e `username` kwargs)
- [x] CSRF + proxy SSL configurados para admin atrás de Nginx
- [x] Deploy realizado na VPS — banco recriado do zero (22 tabelas), sistema rodando
- [x] VPS aponta para repo `UidSoftware/NosFluir` (removido o antigo `NosFluirSis`)

### Fase 2 — Frontend React ✅ COMPLETO (em produção)
- [x] Login, Dashboard, Alunos, Turmas, Ministrar Aula, Financeiro, Livro Caixa, PWA

### Fase 3 — Site Institucional ✅ COMPLETO (em produção)
- [x] Home, Quem Somos, Serviços, Artigos, Agendamento, Contato
- [ ] Instagram/YouTube feed real (pendente credenciais)
- [ ] Endereço físico para Google Maps
- [ ] Número WhatsApp real (substituir 5534999999999)

### Fase 4 — Sistema de Reposições 🔄 EM ANDAMENTO
- [x] Model CreditoReposicao criado
- [x] Signal `gerar_credito_reposicao` — cria crédito ao registrar falta justificada/atestado (limite 3, sem duplicata)
- [x] Signal `marcar_credito_usado` — marca crédito como usado ao registrar aula de reposição
- [ ] Endpoints de créditos e solicitações
- [ ] Telas frontend (professor aprova, admin visualiza)
- [ ] Pendência: reunião — aviso +48h (cenario3) gera crédito ou não?
- [ ] Pendência: reunião — mistura de níveis na aula de reposição

### Fase 5 — Telas Restantes ⏳ PLANEJADA
- Funcionários, Folha de Pagamento, Planos, Fichas de Treino, Relatórios completos, Configurações

---

## 📞 Contato do Cliente

**Giulia Fagionato** — giuliaruffino015@gmail.com
**Tássia Magnaboso** — tassiamagnabosco@hotmail.com

---

**🚀 Bora codar! Good luck, Claude Code!**

> ⚠️ **SISTEMA EM PRODUÇÃO — atualizar este arquivo a cada mudança relevante.**
