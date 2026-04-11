# CLAUDE.md — Sistema Nos Studio Fluir
> Leia este arquivo SEMPRE antes de qualquer ação.
> Última atualização: 10/04/2026 | Versão: 7.4

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
- HTML/CSS/JS puro — multi-página com componentes compartilhados via fetch
- Roda na raiz: `nostudiofluir.com.br/`

**Infra:**
- VPS Ubuntu 24.04 | Docker Compose v2 (`docker compose`, sem hífen)
- Nginx 1.25 (SSL Let's Encrypt) | Gunicorn (3 workers)
- `entrypoint.sh` executa migrate usuarios → migrate → collectstatic → gunicorn (**sem** makemigrations — migrations sempre commitadas do dev)
- Repo na VPS aponta para `UidSoftware/NosFluir`
- Projeto na VPS: `/var/www/studio-fluir/`
- Deploy do frontend via Docker multi-stage (não requer npm na VPS) — `deploy.sh` cuida disso

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
├── testes.md                          ← plano de testes v2.0 (52 testes)
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
│       │   └── mixins.py              ← BaseModel, AuditMixin (soft delete), ReadCreateViewSet
│       ├── usuarios/
│       ├── financeiro/
│       │   ├── signals.py             ← lançamentos automáticos LivroCaixa (com transaction.atomic)
│       │   └── tests.py               ← 22 testes
│       ├── operacional/
│       │   └── tests.py               ← 20 testes
│       └── tecnico/
│           ├── signals.py             ← geração/uso de créditos de reposição
│           └── tests.py               ← 33 testes
├── frontend/
│   ├── src/
│   ├── public/
│   ├── vite.config.js                 ← base: '/sistema/' + PWA
│   └── package.json
├── site-institucional/
│   ├── index.html / sobre.html / servicos.html / agendamento.html / contato.html
│   └── components/header.html, footer.html
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
3. **Soft Delete:** NUNCA `objeto.delete()` — `AuditMixin.perform_destroy` seta `deleted_at` + `deleted_by` automaticamente em todos os ViewSets
4. **CPF/CNPJ:** String (preserva zeros à esquerda) — validador normaliza para dígitos apenas
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

## 📊 Models Existentes (33 models em 4 apps)

### App `financeiro` — 7 models
| Model | Tabela | Observação |
|---|---|---|
| Fornecedor | fornecedor | |
| ServicoProduto | servico_produto | endpoint: `/api/servicos-produtos/` |
| ContasPagar | contas_pagar | signal → LivroCaixa ao pagar (com select_for_update) |
| ContasReceber | contas_receber | signal → LivroCaixa ao receber (com select_for_update) |
| PlanosPagamentos | planos_pagamentos | |
| LivroCaixa | livro_caixa | **IMUTÁVEL** via ReadCreateViewSet (405 em update/delete) |
| FolhaPagamento | folha_pagamento | unique: func+mes+ano; **NÃO** gera lançamento no caixa |

### App `operacional` — 8 models
| Model | Tabela | Observação |
|---|---|---|
| Aluno | alunos | CPF único — sem campos de medidas (movidos para FichaAluno); `alu_contato_emergencia`, `alu_doencas_cronicas`, `alu_medicamentos` |
| FichaAluno | ficha_aluno | histórico de avaliações físicas com data; ordering: -fial_data |
| Profissao | profissao | catálogo |
| Funcionario | funcionario | CPF único |
| Turma | turma | max 15 alunos — **sem campo professor** (professor fica na Aula) |
| TurmaAlunos | turma_alunos | N:N unique: turma+aluno — **no Admin aparece como "Matrícula/Matrículas"** |
| AgendamentoHorario | agendamento_horario | pré-cadastro do site — aceita POST sem auth; exige FK Aluno |
| AgendamentoTurmas | agendamento_turmas | pré-cadastro do site — aceita POST sem auth; exige FK Aluno |

### App `tecnico` — 8 models
| Model | Tabela | Observação |
|---|---|---|
| Aparelho | aparelho | catálogo de aparelhos; `apar_modalidade`: pilates/funcional/**ambos** |
| Acessorio | acessorio | catálogo de acessórios (bola suíça, mini band, etc.) — sem modalidade |
| Exercicio | exercicios | `exe_modalidade` + FK `exe_aparelho` + FK `exe_acessorio` + `exe_variacao` |
| FichaTreino | ficha_treino | `fitr_nome` + `fitr_modalidade` (nullable) |
| FichaTreinoExercicios | ficha_treino_exercicios | N:N com ordem+séries+reps+`ftex_secao`+`exe2` (combinado opcional) |
| Aulas | aulas | 1 linha por aula coletiva; unique: tur+aul_data+aul_modalidade; `aul_nome` auto-gerado |
| MinistrarAula | ministrar_aula | 1 linha = 1 aluno em 1 aula; FK `aula` (nullable); PAS/PAD int, FC, PSE Borg 6-20 |
| CreditoReposicao | creditos_reposicao | gerado por signal ao registrar falta; `cred_data_geracao` é read-only |

### App `usuarios` — 1 model
| Model | Tabela | Observação |
|---|---|---|
| User | users | AbstractUser, auth por email |

---

## 🔐 Perfis de Acesso

> ⚠️ **Estado atual:** todos os endpoints usam apenas `IsAuthenticated` — sem restrição por grupo.
> Exceção: `UserViewSet` usa `IsAdminUser` (403 para não-admin).
> Grupos Django criados em 10/04/2026 (Admin/Professor/Financeiro/Recepcionista) — permissões por perfil no **backend pendentes**.

| Perfil | Acesso planejado |
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
| Aviso entre 48h e 1h antes da aula | ✅ Sim (`justificada`) |
| Atestado médico (qualquer prazo) | ✅ Sim (`atestado`) — pula regra de antecedência |
| Aviso com mais de 48h antes | ⚠️ Pendente — perguntar às clientes (`cenario3`) |
| Aviso com menos de 1h / sem aviso | ❌ Não (`sem_aviso`) |

### Regras do crédito:
- **Validade:** 30 dias corridos a partir da data de aquisição (calculado automaticamente no `save()`)
- **Limite:** máximo 3 créditos simultâneos por aluno
- **Prioridade:** crédito mais próximo de expirar é consumido primeiro (FIFO)
- **Faltou na reposição:** perde o crédito definitivamente
- **Uso cruzado** (Pilates ↔ Funcional): máximo 1x por mês — **pendente de implementação no backend**

### Model `CreditoReposicao`:
```python
STATUS: 'disponivel' | 'usado' | 'expirado'
Campos: aluno (FK), aula_origem (FK), aula_reposicao (FK nullable),
        cred_data_geracao (read-only), cred_data_expiracao (+30 dias auto),
        cred_usado (boolean), cred_status
```

### Endpoint créditos por aluno:
```
GET /api/creditos/aluno/{alu_id}/   → créditos disponíveis ordenados por expiração (FIFO) — paginado
GET /api/creditos/?alu=X&cred_status=disponivel  → filtro padrão
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
- LivroCaixa: update/delete retornam **405** (ReadCreateViewSet) — não 403
- ContasPagar pago → signal cria lançamento **saída** automático com `transaction.atomic()` + `select_for_update()`
- ContasReceber recebido → signal cria lançamento **entrada** automático com `transaction.atomic()` + `select_for_update()`
- FolhaPagamento: **NÃO** gera lançamento automático — marcar como "pago" NÃO registra no caixa

### Técnico:
- Pressão arterial: **PAS e PAD como inteiros separados** — `miau_pas_inicio`, `miau_pad_inicio`, `miau_pas_final`, `miau_pad_final` (em mmHg)
- PSE: **Escala de Borg 6-20** — `miau_pse` (validação: MinValueValidator(6), MaxValueValidator(20))
- FC: `miau_fc_inicio`, `miau_fc_final` (inteiros em bpm)
- Mesmo exercício com aparelhos diferentes = registros independentes
- **Professor fica na Aula** (não na Turma) — turma tem só nome e horário
- `FichaTreino`: `fitr_id`, `fitr_nome`, `fitr_modalidade` (nullable)
- `FichaTreinoExercicios`: `exe` (FK obrigatório) + `exe2` (FK nullable = combinado) — compartilham séries/reps
- `Exercicio`: `exe_modalidade` obrigatório; `exe_aparelho` FK → Aparelho (nullable); `exe_acessorio` FK → Acessorio (nullable)
- `Aparelho.apar_modalidade`: 'pilates' | 'funcional' | **'ambos'** — filtrar por modalidade inclui 'ambos'
- `FichaAluno`: histórico de avaliações físicas — endpoint `/api/ficha-aluno/?aluno={id}`

### Serializers — campo `id` obrigatório (CRÍTICO):
```python
# TODOS os serializers devem expor campo id → source='pk'
# O frontend usa r.id em todos os selects, edições e deleções
class MeuSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    # ...
    fields = ['id', 'meu_id', ...]
```
> Se criar um novo serializer sem `id`, **selects e operações CRUD vão quebrar** no frontend.

### Campos read-only obrigatórios (CRÍTICO):
```python
# Sempre incluir em read_only_fields para evitar manipulação via API:
# - cred_data_geracao, cred_data_expiracao (CreditoReposicao)
# - lica_data_lancamento, lica_saldo_anterior, lica_saldo_atual (LivroCaixa)
# - pag_valor_total (ContasPagar — calculado automaticamente)
# - rec_valor_total (ContasReceber — calculado automaticamente)
```

### AuditMixin — comportamento completo:
```python
# perform_create → created_by=user (None para AnonymousUser)
# perform_update → updated_by=user
# perform_destroy → soft delete: deleted_at=now(), deleted_by=user
# NUNCA reverter o tratamento de AnonymousUser — quebraria agendamentos do site
```

### Paginação (CRÍTICO para o frontend):
```javascript
// SEMPRE usar .results — nunca .data direto (inclusive em /api/creditos/aluno/{id}/)
const dados = response.data.results
const total = response.data.count
```

### Select com FK — padrão obrigatório (Radix UI v2.2.6):
```jsx
// CORRETO — sempre com item sentinela __none__ + placeholder no SelectValue
// IMPORTANTE: sentinela NÃO deve ter disabled — Radix não renderiza texto de itens disabled
// IMPORTANTE: usar o PK nomeado do serializer (ex: f.func_id, t.tur_id), NUNCA f.id genérico
<Select value={watch('campo_id') || '__none__'} onValueChange={v => setValue('campo_id', v)}>
  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
  <SelectContent>
    <SelectItem value="__none__" className="text-muted-foreground italic">
      Selecionar...
    </SelectItem>
    {items?.map(i => <SelectItem key={i.model_id} value={String(i.model_id)}>{i.nome}</SelectItem>)}
  </SelectContent>
</Select>

// CORRETO — tratar sentinela __none__ no onSubmit antes de parseInt
const idVal = data.campo_id && data.campo_id !== '__none__' ? parseInt(data.campo_id) : null
if (!idVal) { toast({ title: 'Campo obrigatório', variant: 'destructive' }); return }
```

### Select de filtro (useState) — padrão obrigatório:
```jsx
// CORRETO — usar 'all' como sentinela, nunca ''
const [filtro, setFiltro] = useState('all')
setFilters(v && v !== 'all' ? { campo: v } : {})
```

### PKs dos models — referência rápida (CRÍTICO para o frontend):
```
Aluno       → alu_id      Funcionario  → func_id     Turma        → tur_id
TurmaAlunos → tual_id     Fornecedor   → forn_id     ServicoProduto → serv_id
ContasPagar → pag_id      ContasReceber → rec_id     Planos       → plan_id
FolhaPag    → fopa_id     Profissao    → prof_id     Exercicio    → exe_id
FichaTreino → fitr_id     FichaTreinoEx → ftex_id    MinistrarAula → miau_id
Credito     → cred_id     FichaAluno   → fial_id     Aparelho     → apar_id
Acessorio   → acess_id    Aulas        → aul_id      User         → id (padrão Django)
```

### FKs no payload (CRÍTICO — sem sufixo `_id`):
```python
# Campos FK no model Django → nome sem _id no payload da API:
alu    (não alu_id)    func   (não func_id)    tur    (não tur_id)
forn   (não forn_id)   serv   (não serv_id)    fitr   (não fitr_id)
exe    (não exe_id)    exe2   (não exe2_id)     cred   (não cred_id)
prof   (não prof_id)   aluno  (não aluno_id)   — FichaAluno usa `aluno`
```

### Endpoints da API (CRÍTICO):
```
Todos os endpoints ficam direto em /api/ — sem prefixo de app:
✅ /api/alunos/              ✅ /api/turmas/           ✅ /api/exercicios/
✅ /api/creditos/            ✅ /api/fichas-treino/    ✅ /api/folha-pagamento/
✅ /api/servicos-produtos/   ✅ /api/fornecedores/
✅ /api/logout/              ✅ /api/me/               ✅ /api/agendamentos-horario/
✅ /api/agendamentos-turmas/ ✅ /api/fichas-treino-exercicios/
✅ /api/aparelhos/           ✅ /api/acessorios/       ✅ /api/ficha-aluno/
✅ /api/ministrar-aula/      ✅ /api/aulas/
❌ /api/operacional/alunos/  ❌ /api/tecnico/exercicios/  ← ERRADO
❌ /api/servicos/            ← ERRADO (correto: /api/servicos-produtos/)
```

---

## 🚀 Comandos Principais

```bash
# ── Desenvolvimento local (via Makefile) ──────────────────────────────────────
make dev              # sobe db + backend + nginx-dev (site em :8080)
make frontend-dev     # npm run dev → sistema em localhost:5173/sistema/
make migrate          # executa migrations dentro do container
make createsuperuser  # cria superusuário Django
make dev-down         # para tudo

# ── Rodar testes ──────────────────────────────────────────────────────────────
docker exec nosfluir-backend-1 python manage.py test apps.financeiro apps.operacional apps.tecnico --verbosity=2

# ── Deploy na VPS ─────────────────────────────────────────────────────────────
# Na VPS: /var/www/studio-fluir/
git pull origin main
./deploy.sh prod      # git pull + build frontend + docker compose up -d

# Rebuild somente do backend (sem mexer no frontend):
docker compose build backend && docker compose up -d backend

# Atualizar somente o site institucional (é volume — sem rebuild):
git pull origin main && docker compose restart nginx
```

---

## ⚠️ O que NÃO fazer

- ❌ Float/Double para dinheiro
- ❌ `objeto.delete()` — usar soft delete via API (DELETE chama `AuditMixin.perform_destroy`)
- ❌ Editar/deletar LivroCaixa
- ❌ Lançamento automático para FolhaPagamento
- ❌ CPF/CNPJ como número (perde zeros à esquerda)
- ❌ Migrations fora do container
- ❌ Comitar `.env`
- ❌ Alterar `base: '/sistema/'` no vite.config.js
- ❌ `response.data` em listagens — sempre `response.data.results`
- ❌ Criar outro CLAUDE.md — este é o único
- ❌ `SelectItem value=""` — Radix UI reserva `""` para limpar seleção; usar `value="__none__"` como sentinel
- ❌ `SelectItem value="__none__" disabled` — Radix não renderiza texto de itens disabled; sentinela deve ser sem `disabled`
- ❌ Serializer sem campo `id` — todos devem ter `id = serializers.IntegerField(source='pk', read_only=True)`
- ❌ `filterset_fields` referenciando campo que não existe no model — causa 500 em toda listagem
- ❌ Professor no model Turma — professor fica no model Aula (`func` FK Funcionario)
- ❌ Usar `.id` genérico no frontend para PKs — usar o PK nomeado (`alu_id`, `func_id`, `tur_id`, etc.)
- ❌ Usar `forn_id`, `alu_id` como nome do campo FK no payload — usar `forn`, `alu`, `func` (sem `_id`)
- ❌ `bulk_create` em models que herdam `BaseModel` — `save()` não é chamado, campos auto-calculados ficam NULL
- ❌ `makemigrations` no `entrypoint.sh` — gera ghost migrations na VPS que divergem do git; migrations sempre commitadas do dev

---

## 🐛 Troubleshooting

| Erro | Causa | Solução |
|---|---|---|
| "decimal places not allowed" | Float em vez de Decimal | `Decimal('150.00')` |
| "duplicate key violates unique" | Registro duplicado | Verificar `unique_together` |
| Lançamento duplicado LivroCaixa | Signal chamado 2x | Signals já checam existência com `select_for_update` — não remover |
| 405 no update/delete LivroCaixa | ReadCreateViewSet por design | Criar estorno (POST) |
| Frontend 404 em /sistema/ | base não configurado | Verificar `base: '/sistema/'` no vite |
| Login não funciona | Tentando auth por username | Verificar `USERNAME_FIELD = 'email'` no model User |
| 403 CSRF no admin | Sistema atrás de Nginx sem proxy headers | `CSRF_TRUSTED_ORIGINS`, `SECURE_PROXY_SSL_HEADER`, `USE_X_FORWARDED_HOST` — já configurados |
| `restart` não aplica mudanças de código | Código está na imagem Docker, não em volume | Sempre usar `docker compose build backend && docker compose up -d backend` |
| Login sistema: "não encontrado" | `/api/usuarios/me/` não existe | Endpoint correto é `/api/me/` |
| `entrypoint.sh: permission denied` | Arquivo sem bit de execução | `chmod +x backend/entrypoint.sh` e commitar |
| Menu sidebar mostra só Dashboard | `UserSerializer` sem `is_superuser`/`groups` | Já corrigido — serializer inclui ambos |
| Usuário vê só Dashboard (Finanças/Operacional/Técnico sumindo) | Usuário não está em nenhum grupo Django — `canAccess()` retorna false | Acessar `/admin/` → Auth → Groups → criar grupo `Administrador` → Users → adicionar usuário ao grupo → logout/login |
| nginx: "host not found in upstream" no boot | nginx sobe antes do backend | `depends_on: service_healthy` + healthcheck — já configurado |
| PWA serve versão antiga após deploy | Service Worker em cache | `skipWaiting/clientsClaim` + `controllerchange` em main.jsx — já configurado |
| Select mostra todos os nomes concatenados | Radix Select v2.2.6 — nenhum item bate com o `value` | `value={watch('campo') \|\| '__none__'}` + sentinela sem `disabled` + `id` no serializer |
| Endpoints retornando 404 (API) | Prefixos errados no frontend | Todos direto em `/api/` — sem prefixo de app |
| GET /api/turmas/ retorna 500 | `filterset_fields` com campo removido do model | Remover campo do `filterset_fields` — já corrigido |
| Agendamento do site retorna 500 | `AuditMixin` passava `AnonymousUser` como `created_by` | `AuditMixin` agora usa `None` para usuário não autenticado — já corrigido |
| Selects não carregam / r.id undefined | Serializer sem campo `id` | Adicionar `id = serializers.IntegerField(source='pk', read_only=True)` + incluir em `fields` |
| Select usa `f.id` mas retorna undefined | Frontend usando `.id` genérico em vez do PK nomeado | Usar `f.func_id`, `t.tur_id`, `a.alu_id` etc. conforme tabela de PKs acima |
| "Matrícula" no Admin não existe no código | `TurmaAlunos` usa `verbose_name = 'Matrícula'` | São a mesma coisa: Admin=Matrícula, código=TurmaAlunos, banco=turma_alunos, API=/api/turma-alunos/, PK=tual_id |
| update.mutate com id errado (403/404) | `update.mutate({ id: r.id })` — campo `.id` não existe no DRF padrão | Usar o PK nomeado: `{ id: r.func_id }`, `{ id: r.alu_id }` etc. |
| Saldo LivroCaixa errado após pagamentos simultâneos | Race condition no signal sem transação | Já corrigido — signals usam `select_for_update()` + `transaction.atomic()` |
| MinistrarAula mostra "Aluno 1", "Aluno 2" em vez do nome | `ta.aluno_nome` não existe — campo correto é `ta.alu_nome` | Corrigido 07/04/2026 |
| Card de exercícios da ficha retorna 404 | Endpoint errado: `/api/ficha-exercicios/` | Correto: `/api/fichas-treino-exercicios/` |
| Exercícios da ficha não filtram por ficha | Query param `fitr_id` não existe no filterset | Correto: `?fitr=X` (sem sufixo `_id`) |
| `apar_nome` undefined no frontend | Serializer sem `select_related('exe_aparelho')` no ViewSet | Adicionar `select_related` para evitar N+1 e retornar o campo |
| `acess_nome` undefined no frontend | Idem para acessório | `select_related('exe_acessorio')` no ExercicioViewSet |
| Aparelho não aparece no select de exercício | `aparelhosPorModalidade()` filtra por modalidade — 'ambos' é incluído | Verificar se `apar_modalidade === 'ambos'` está no filtro |
| Componente JSX retorna dois elementos sem wrapper | JSX exige um único root — `<form>` + `<Dialog>` juntos quebra | Envolver em `<>...</>` (fragment) |
| Deploy VPS sem alterações visíveis | Commit local não foi `git push` antes do deploy | Sempre `git push` antes de `./deploy.sh prod` |
| `exe_acessorio` no payload como string texto | Campo era CharField, agora é FK integer | Enviar `exe_acessorio: parseInt(id)` ou `null` — não mais string |
| Endpoint `/api/aulas/` retorna 404 | Renomeado na Fase 3.2 | Correto: `/api/ministrar-aula/` |
| `aul_pressao_inicio` retorna 404/erro | Campo removido na Fase 3.2 | Usar `miau_pas_inicio` + `miau_pad_inicio` (inteiros) |
| `aul_intensidade_esforco` não existe | Renomeado para `miau_pse` (Borg 6-20) | Enviar `miau_pse` com valor entre 6 e 20 |
| `RenameModel` não renomeia tabela DB | Django não renomeia quando `db_table` é customizado | Sempre combinar com `AlterModelTable` na migration |
| Migration falha com "relation already exists" ao criar tabela com nome antigo | `RenameModel` renomeia a tabela mas PostgreSQL mantém constraints/indexes/sequence com prefixo antigo | Usar `RunSQL` para renomear todos os constraints/indexes/sequence antes de criar a nova tabela |
| Ghost migration gerada na VPS (ex: `0015_alter_ministraraula_options`) | `entrypoint.sh` rodava `makemigrations` em todo boot — gerava migration que não existe no git | `makemigrations` removido do entrypoint; se ocorrer: `RunSQL DELETE FROM django_migrations WHERE app='X' AND name='Y'` |

---

## ✅ Status das Fases

### Fase 1 — Backend ✅ COMPLETO E EM PRODUÇÃO (03/04/2026)
- [x] 29 models em 4 apps (usuarios, financeiro, operacional, tecnico)
- [x] API REST completa — serializers, viewsets, filtros, paginação PAGE_SIZE=20
- [x] JWT — autenticação por email, blacklist, refresh rotation
- [x] Signals — ContasPagar/ContasReceber → LivroCaixa automático
- [x] Django Admin — todos os models registrados e funcional
- [x] Docker + Nginx configurados (SSL Let's Encrypt, proxy reverso)
- [x] BaseModel, AuditMixin, ReadCreateViewSet (LivroCaixa imutável)
- [x] Deploy na VPS — sistema rodando

### Fase 2 — Frontend React ✅ COMPLETO E EM PRODUÇÃO (04/04/2026)
- [x] Login, Dashboard, Alunos, Funcionários, Turmas, Agendamentos
- [x] Finanças: Livro Caixa, Contas a Pagar/Receber, Planos, Folha, Fornecedores, Serviços
- [x] Técnico: Exercícios, Fichas de Treino, Ministrar Aula, Reposições
- [x] Relatórios: Frequência, Pressão Arterial, Contas a Pagar/Receber, Livro Caixa
- [x] Gráficos: Financeiro, Alunos, Frequência
- [x] Configuração: Usuários, Profissões
- [x] PWA, Sidebar colapsável, Toaster, ConfirmDialog, paginação, permissões

#### Fase 2.7 — Auditoria e correção de inconsistências ✅ (06/04/2026)
- [x] Todos os PKs nomeados corrigidos no frontend (alu_id, func_id, tur_id, etc.)
- [x] Todos os nomes de campos FK corrigidos no payload (alu, func, forn — sem _id)
- [x] Todos os nomes de campos do model corrigidos (lica_historico, lica_tipo_lancamento, etc.)
- [x] Campos obrigatórios ausentes adicionados (pag_data_emissao, rec_data_emissao, serv_tipo, plan_tipo_plano)
- [x] Campos inexistentes removidos (aluno_id e fitr_descricao em FichasTreinoPage)
- [x] 21 arquivos frontend corrigidos — todas as telas funcionais

### Fase 3 — Site Institucional ✅ COMPLETO E EM PRODUÇÃO (04/04/2026)
- [x] Multi-página: index, sobre, serviços, agendamento, contato
- [x] Componentes compartilhados: header.html + footer.html via fetch
- [x] Identidade visual com fontes e fotos reais (Giulia + Tássia)
- [x] Formulário de agendamento → POST /api/agendamentos-horario/ (sem auth)
- [ ] Google Maps (aguardando cliente)
- [ ] Endereço, e-mail, horário reais (aguardando cliente)
- [ ] Links reais das redes sociais (aguardando cliente)

### Fase 4 — Sistema de Reposições ✅ COMPLETO E EM PRODUÇÃO (06/04/2026)
- [x] Model CreditoReposicao com status, expiração automática (+30 dias), FIFO
- [x] Signal `gerar_credito_reposicao` — justificada/atestado, limite 3, sem duplicata
- [x] Signal `marcar_credito_usado` — marca crédito ao registrar reposição
- [x] Endpoints: `/api/creditos/`, `/api/creditos/aluno/{id}/` (paginado)
- [x] Frontend: página Reposições, validação de crédito em MinistrarAulaPage
- [ ] Uso cruzado Pilates ↔ Funcional (pendente reunião)
- [ ] cenario3 (+48h) — pendente reunião com clientes

### Fase 5 — Telas e Funcionalidades Restantes ✅ COMPLETO E EM PRODUÇÃO (06/04/2026)
- [x] Turma refatorada: professor removido da Turma, adicionado na Aula (FK `func` nullable)
- [x] MinistrarAulaPage: Select obrigatório "Professor ministrando" — professor registrado por aula
- [x] Todos os serializers com campo `id` (source='pk') — compatibilidade com seletores do frontend
- [x] AuditMixin corrigido para endpoints AllowAny (created_by=None para anônimo)
- [x] 52 testes automatizados — financeiro, operacional, técnico

### Fase 5.2 — UX Mobile: Sidebar e Submenus ✅ EM PRODUÇÃO (08/04/2026)
- [x] Sidebar inicia recolhida (`collapsed=true`) — não atrapalha dashboard no celular
- [x] Todos os submenus (incluindo Finanças) iniciam fechados (`openMenus={}`)

### Fase 5.1 — Melhorias MinistrarAulaPage ✅ EM PRODUÇÃO (07/04/2026)
- [x] Ícones nos botões de presença: `CheckCircle` / `XCircle` / `RefreshCw` (lucide-react) com `title` tooltip
- [x] Grid compacto `md:grid-cols-3` — P.A. Inicial, P.A. Final e Intensidade na mesma linha no desktop
- [x] Nome real do aluno corrigido: `ta.alu_nome` (bug: estava `ta.aluno_nome` — caia no fallback "Aluno X")
- [x] Card colapsável de exercícios da ficha — expandido por padrão, mostra ordem/nome/aparelho/séries/obs
- [x] Estado local durante aula — nada vai ao banco antes de "Finalizar Aula" (já estava implementado)
- [x] Bugs corrigidos: endpoint `/api/ficha-exercicios/` → `/api/fichas-treino-exercicios/`; filtro `fitr_id` → `fitr`
- [x] 10 novos testes (TB036–TB041c) — total: 66 testes passando

### Fase 6 — Auditoria Backend e Hardening ✅ (06/04/2026)
- [x] Soft delete implementado — `AuditMixin.perform_destroy` seta `deleted_at`/`deleted_by` em todos os ViewSets
- [x] Race condition no LivroCaixa corrigida — `transaction.atomic()` + `select_for_update()` nos signals e na view
- [x] `cred_data_geracao` protegido como `read_only` no serializer
- [x] `FichaTreinoExerciciosSerializer` com `created_at`/`updated_at`
- [x] `AulaViewSet` com filtro por `func` (professor)
- [x] `CreditoReposicaoViewSet.por_aluno` paginado
- [x] `UserViewSet` com `filter_backends` configurado
- [x] Banco vs models auditado — 100% consistente, sem campos órfãos

### Fase 7 — Reajustes Estruturais 3.1 ✅ COMPLETO E EM PRODUÇÃO (10/04/2026)
> Especificação: `Instrucoes_Claude_Code_Fase3.md` — Sub-fase 3.1
- [x] Medidas corporais removidas do `Aluno` — migradas para `FichaAluno`
- [x] Nova tabela `FichaAluno` — histórico de avaliações com data
- [x] Nova tabela `Aparelho` — catálogo com modalidade (pilates/funcional/ambos)
- [x] Nova tabela `Acessorio` — catálogo (bola suíça, mini band, etc.) — iniciativa própria além do spec
- [x] `Exercicio` refatorado: `exe_modalidade` obrigatório, FK `exe_aparelho`, FK `exe_acessorio`, `exe_variacao`
- [x] `FichaTreino`: campo `fitr_modalidade` adicionado
- [x] `FichaTreinoExercicios`: campo `ftex_secao` + campo `exe2` (combinados — além do spec)
- [x] Quick-add inline de Aparelho e Acessório no form de exercício (além do spec)
- [x] Páginas Configuração → Aparelhos e Configuração → Acessórios
- [x] FichasTreinoPage: agrupamento visual por seção + suporte a combinados
- [x] MinistrarAulaPage: exibe combinados "Exe1 + Exe2" + agrupamento por seção (Potência, Força...) + usa apar_nome
- [x] AlunosPage: seção "Avaliações Físicas" com histórico de FichaAluno
- [x] 70 testes passando (financeiro: 22, operacional: 20, técnico: 28)

### Fase 7.2 — Reajustes Estruturais 3.2 ✅ COMPLETO E EM PRODUÇÃO (10/04/2026)
- [x] Model `Aula` → `MinistrarAula`, tabela `aulas` → `ministrar_aula`, prefixo `aul_` → `miau_`
- [x] PAS e PAD separados como inteiros (miau_pas_inicio/pad_inicio/pas_final/pad_final em mmHg)
- [x] FC Inicial e Final (miau_fc_inicio, miau_fc_final em bpm)
- [x] PSE: Escala de Borg 6-20 (miau_pse com MinValueValidator(6), MaxValueValidator(20))
- [x] Campo miau_observacoes (texto livre por aluno)
- [x] tipo_presenca: 'regular' → 'presente' (data migration)
- [x] Endpoint renomeado: `/api/aulas/` → `/api/ministrar-aula/`
- [x] Frontend atualizado: MinistrarAulaPage, RelPressaoPage, RelFrequenciaPage, GrafFrequenciaPage
- [x] CreditoReposicao FKs atualizadas → MinistrarAula
- [x] Signals atualizados para MinistrarAula
- [x] 75 testes passando (financeiro: 22, operacional: 20, técnico: 33 — 5 novos PSE/FC/obs)

### Fase 7.2.1 — Campos de saúde e emergência no Aluno ✅ EM PRODUÇÃO (10/04/2026)
- [x] `alu_contato_emergencia` (CharField max_length=20, nullable) — telefone de emergência
- [x] `alu_doencas_cronicas` (TextField, nullable) — doenças crônicas
- [x] `alu_medicamentos` (TextField, nullable) — medicamentos em uso
- [x] Formulário e detalhe do Aluno atualizados no frontend
- [x] 75 testes passando (sem regressão)

### Fase 7.3 — Reajustes Estruturais 3.3 ✅ COMPLETO E EM PRODUÇÃO (10/04/2026)
- [x] Nova tabela `Aulas` — 1 linha por aula coletiva; unique: tur+aul_data+aul_modalidade
- [x] `aul_nome` auto-gerado no `save()` se deixado em branco
- [x] FK `aula` adicionada em `MinistrarAula` (nullable — retrocompatível)
- [x] Endpoint `/api/aulas/` com filtros: tur, func, aul_modalidade, aul_data
- [x] Serializer com contadores: `total_presentes`, `total_faltas`, `total_registros`
- [x] Página `AulasPage` — CRUD + filtros por modalidade e turma + stats de presença
- [x] Sidebar Técnico: item "Aulas" adicionado

### Pendências técnicas restantes:
- [x] Fase 7.2 — renomear Aula → MinistrarAula + campos PAS/PAD/FC/PSE Borg ✅
- [x] Fase 7.3 — nova tabela Aulas ✅
- [ ] Permissões por perfil (Professor/Financeiro/Recepcionista) não implementadas
- [ ] Uso cruzado de crédito (Pilates ↔ Funcional) não implementado no backend
- [ ] Crédito expirado — sem job automático para atualizar status
- [ ] Agendamentos do site exigem Aluno pré-existente — design a revisar com clientes

---

## 📞 Contato do Cliente

**Giulia Fagionato** — giuliaruffino015@gmail.com
**Tássia Magnaboso** — tassiamagnabosco@hotmail.com

---

**🚀 Bora codar! Good luck, Claude Code!**

> ⚠️ **SISTEMA EM PRODUÇÃO — atualizar este arquivo a cada mudança relevante.**
