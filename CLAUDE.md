# CLAUDE.md — Sistema Nos Studio Fluir
> Leia este arquivo SEMPRE antes de qualquer ação.
> Última atualização: 14/05/2026 | Versão: 14.1

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
- Cloudinary (foto de perfil) — `cloudinary==1.36.0`

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

## 📊 Models Existentes (40 models em 4 apps)

### App `financeiro` — 14 models
| Model | Tabela | Observação |
|---|---|---|
| Conta | conta | tipo: corrente/poupanca/caixa; fixtures: 3 contas iniciais |
| PlanoContas | plano_contas | classificação contábil; plc_codigo único; fixtures: 16 categorias |
| Fornecedor | fornecedor | |
| ServicoProduto | servico_produto | catálogo de **serviços** — `serv_tipo` removido; endpoint: `/api/servicos-produtos/` |
| ContasPagar | contas_pagar | `forn` nullable; `cpa_tipo`/`conta`/`plano_contas` FKs; pró-labore NÃO gera LivroCaixa |
| ContasReceber | contas_receber | `alu` nullable; `rec_tipo`/`conta`/`plano_contas` FKs; validação inteligente por tipo |
| PlanosPagamentos | planos_pagamentos | |
| AlunoPlano | aluno_plano | contrato aluno × plano |
| LivroCaixa | livro_caixa | **IMUTÁVEL** via ReadCreateViewSet; campos `conta`/`plano_contas`/`lcx_tipo_movimento`/`lcx_competencia` |
| FolhaPagamento | folha_pagamento | unique: func+mes+ano; **NÃO** gera lançamento no caixa |
| Produto | produto | estoque atual/mínimo; endpoint `/api/produtos/alertas-estoque/` |
| Pedido | pedido | número auto PED-XXXX; signal → LivroCaixa (à vista) ou ContasReceber (futuro) |
| PedidoItem | pedido_item | tipo: produto/serviço/plano; item_valor_total calculado no serializer |

### App `operacional` — 12 models
| Model | Tabela | Observação |
|---|---|---|
| Aluno | alunos | CPF único — sem campos de medidas (movidos para FichaAluno); `alu_contato_emergencia`, `alu_doencas_cronicas`, `alu_medicamentos` |
| FichaAluno | ficha_aluno | histórico de avaliações físicas com data; ordering: -fial_data |
| Profissao | profissao | catálogo |
| Funcionario | funcionario | CPF único |
| Turma | turma | max 15 alunos — `tur_modalidade` (pilates/funcional, nullable); **sem campo professor** (professor fica na Aula) |
| TurmaAlunos | turma_alunos | N:N unique: turma+aluno — **no Admin aparece como "Matrícula/Matrículas"** |
| AvisoFalta | aviso_falta | aviso de falta — calcula antecedência e `avi_gera_credito` no save(); Fase 8 |
| AgendamentoHorario | agendamento_horario | pré-cadastro do site — aceita POST sem auth; exige FK Aluno |
| AgendamentoTurmas | agendamento_turmas | pré-cadastro do site — aceita POST sem auth; exige FK Aluno |
| SlotExperimental | slot_experimental | horários disponíveis para aula experimental; PK: `slot_id`; unique: (dia_semana, hora, modalidade); `vagas_disponiveis` property; GET público |
| AgendamentoExperimental | agendamento_experimental | solicitação de aula experimental do site ou sistema; PK: `age_id`; POST público; validação de vagas no serializer; status: pendente/confirmado/realizado/cancelado/faltou |
| AulaExperimental | aula_experimental | realização da aula — anamnese + testes físicos + decisão; PK: `aexp_id`; OneToOne com AgendamentoExperimental; save() → seta age_status='realizado'; FK aluno nullable |

### App `tecnico` — 10 models
| Model | Tabela | Observação |
|---|---|---|
| Aparelho | aparelho | catálogo de aparelhos; `apar_modalidade`: pilates/funcional/**ambos** |
| Acessorio | acessorio | catálogo de acessórios (bola suíça, mini band, etc.) — sem modalidade |
| Exercicio | exercicios | `exe_modalidade` + FK `exe_aparelho` + FK `exe_acessorio` + `exe_variacao` |
| FichaTreino | ficha_treino | `fitr_nome` + `fitr_modalidade` (nullable) |
| FichaTreinoExercicios | ficha_treino_exercicios | N:N com ordem+séries+reps+`ftex_secao`+`exe2` (combinado opcional) |
| Aulas | aulas | 1 linha por aula coletiva; unique: tur+aul_data+aul_modalidade; `aul_nome` auto-gerado; FK `fitr`; `aul_numero_ciclo`+`aul_posicao_ciclo` calculados |
| MinistrarAula | ministrar_aula | 1 linha = 1 aluno em 1 aula; FK `aula` obrigatório (PROTECT); PAS/PAD int, FC, PSE Borg 6-20 |
| CreditoReposicao | creditos_reposicao | gerado por signal ao registrar falta; `cred_data_geracao` é read-only |
| ProgramaTurma | programa_turma | sequência ordenada de fichas por turma (ciclo); unique: (turma,prog_ordem) e (turma,fitr) |
| RegistroExercicioAluno | registro_exercicio_aluno | séries/reps/carga/obs por aluno por exercício por aula; base para evolução |

### App `usuarios` — 1 model
| Model | Tabela | Observação |
|---|---|---|
| User | users | AbstractUser, auth por email; `foto_url` URLField(500, nullable) — armazenada no Cloudinary |

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
- **Professor fica na Aula** (não na Turma) — turma tem nome, horário e modalidade
- `Turma.tur_modalidade`: define a modalidade fixa da turma — usado para auto-vincular `MinistrarAula` → `Aulas` no `perform_create`
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
ProgramaTurma → prog_id   RegistroExercicioAluno → reg_id   AvisoFalta → avi_id
AlunoPlano    → aplano_id Conta        → cont_id     PlanoContas  → plc_id
Produto       → prod_id   Pedido       → ped_id      PedidoItem   → item_id
SlotExperimental → slot_id  AgendamentoExperimental → age_id  AulaExperimental → aexp_id
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
✅ /api/avisos-falta/         ✅ /api/aluno-plano/          ✅ /api/agendamentos-turmas/
✅ /api/fichas-treino-exercicios/
✅ /api/aparelhos/           ✅ /api/acessorios/       ✅ /api/ficha-aluno/
✅ /api/ministrar-aula/      ✅ /api/aulas/
✅ /api/programa-turma/     ✅ /api/registro-exercicio-aluno/
✅ /api/usuarios/upload-foto/   (POST — multipart/form-data, campo: foto)
✅ /api/usuarios/remover-foto/  (DELETE)
✅ /api/contas/              ✅ /api/plano-contas/     ✅ /api/produtos/
✅ /api/pedidos/             ✅ /api/pedidos/{id}/confirmar/  (POST)
✅ /api/produtos/alertas-estoque/  (GET — produtos com estoque ≤ mínimo)
✅ /api/transferencia/       (POST — gera 2 lançamentos no LivroCaixa)
✅ /api/relatorios/dre/      (GET ?mes=&ano=)
✅ /api/relatorios/fluxo-caixa/  (GET ?meses=)
✅ /api/livro-caixa/          (GET + POST — ReadCreateViewSet; update/delete retornam 405)
✅ /api/relatorios/extrato/  (GET ?conta= — mes/ano opcionais; sem eles retorna todos os lançamentos)
✅ /api/faltas-sem-justificativa/  (GET ?alu=&tur=&aul_data= — MinistrarAula com miau_tipo_falta=sem_aviso, paginado)
✅ /api/slots-experimentais/      (GET público; POST/PATCH/DELETE → Admin; filtros: slot_ativo, slot_modalidade)
✅ /api/agendamento-experimental/ (POST público; GET/PATCH → Recepcionista/Admin; filtros: age_status, age_modalidade, age_data_agendada, age_origem)
✅ /api/aula-experimental/        (GET/POST/PATCH → Professor/Admin; filtros: aexp_modalidade, aexp_cadastrou_aluno)
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
| `Must supply api_key` no upload de foto | Vars Cloudinary não declaradas no `docker-compose.yml` | Adicionar `CLOUDINARY_*` na seção `environment` do backend no compose |
| `Invalid cloud_name Uid_Software` | `CLOUDINARY_CLOUD_NAME` preenchido com o nome da chave API, não do cloud | Usar o cloud name real visível no topo do painel Cloudinary (ex: `dpqy5shqz`) |
| Upload foto retorna 404 (`/api/api/usuarios/...`) | URL com prefixo `/api/` duplicado — axios já tem `/api` no baseURL | Chamar `api.post('/usuarios/upload-foto/', ...)` sem o prefixo `/api/` |
| LivroCaixa com `conta: None` e tipo errado | Lançamento criado por signal pré-Fase 10 (sem conta vinculada) | Hard-delete direto pelo shell; soft-delete do ContasPagar/RecebER de origem; recriar corretamente via shell ou UI |
| Signal dispara ao fazer `save()` num ContasPagar já pago | Signal reage a qualquer `save()`, não só mudança de status | Após corrigir, deletar o lançamento fantasma gerado; ou usar `update()` no QuerySet para evitar o signal |
| POST `/api/turma-alunos/` retorna 400 ao re-adicionar aluno removido | `unique_together = [['tur','alu']]` bloqueia mesmo com soft-delete (registro ainda existe no banco) | `TurmaAlunosViewSet.create()` detecta registro soft-deleted e restaura; serializer com `validators=[]` + validação manual excluindo deleted |
| Gráfico PSE mostra fichas diferentes na mesma linha de ciclo | Eixo X era por data — fichas distintas do mesmo ciclo apareciam como pontos consecutivos sem sentido comparativo | Eixo X agora usa `aul_posicao_ciclo` (posição da ficha no programa); tooltip mostra nome da ficha + data |
| BottomBar "Relatórios" abre o Dashboard no mobile | Path `/relatorios` não é uma rota registrada no React Router — cai no fallback do dashboard | Apontar para uma sub-rota válida ex: `/relatorios/frequencia`; `startsWith` ainda detecta ativo corretamente |
| `Badge` não importa de `@/components/ui/badge` | Esse arquivo não existe no projeto | Importar de `@/components/ui/primitives`: `import { Badge } from '@/components/ui/primitives'` |
| LivroCaixa com `conta=None` e `plano_contas=None` gerado por signal | Lançamento criado pré-Fase 10 quando os campos ainda não existiam no signal | Hard-delete do LivroCaixa + `ContasPagar.objects.update()` (sem disparar signal) + recriar LivroCaixa com campos corretos |
| LivroCaixa de Pedido sem `plano_contas` / historico "Pedido PED-XXXX" | Signal `processar_pedido` antigo não passava `plano_contas` | Signal corrigido (Fase 14.1): agora passa `plano_contas_id=5`; historico = "Recebimento: Pedido XXXX" |
| `plano_contas` errado num LivroCaixa existente | Correção direta: `LivroCaixa.objects.filter(pk=X).update(plano_contas_id=Y)` | Nunca usar `.save()` — dispara signal e pode gerar lançamento duplicado |
| `plano_contas` errado num ContasPagar pendente | Correção direta: `ContasPagar.objects.filter(pk=X).update(plano_contas_id=Y)` | Nunca usar `.save()` — dispara signal de LivroCaixa se status=pago |

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

### Fase 7.3 — Reajustes Estruturais 3.3 ✅ COMPLETO E EM PRODUÇÃO (11/04/2026)
- [x] Nova tabela `Aulas` — 1 linha por aula coletiva; unique: tur+aul_data+aul_modalidade
- [x] `aul_nome` auto-gerado no `save()` se deixado em branco
- [x] FK `aula` adicionada em `MinistrarAula` (nullable — retrocompatível)
- [x] Endpoint `/api/aulas/` com filtros: tur, func, aul_modalidade, aul_data (range: aul_data_after/before)
- [x] Serializer com contadores: `total_presentes`, `total_faltas`, `total_registros`
- [x] Página `AulasPage` — CRUD + filtros + stats de presença + modal de alunos
- [x] Sidebar Técnico: item "Aulas" adicionado
- [x] `Turma` ganha `tur_modalidade` — define modalidade fixa da turma
- [x] `MinistrarAulaViewSet.perform_create` auto-vincula ao `Aulas` via `get_or_create(tur, data, modalidade)`
- [x] `TurmasPage`: remove campo `func` (morto), adiciona `tur_modalidade` select + badge na tabela
- [x] Data migration `0018`: backfill `aula` FK em `MinistrarAula` existentes (reprocessa registros antigos)
- [x] `AulasPage`: filtros responsivos mobile (grid stack) + coluna Professor oculta em telas pequenas
- [x] `AulasPage`: botão "Nova Aula" removido — criação é automática via `MinistrarAula.perform_create`

### Fase 4 Refactor ✅ COMPLETO, VALIDADO E ENCERRADO (16/04/2026)
- [x] Hora início/fim migrada de MinistrarAula → Aulas
- [x] FK `aula` em MinistrarAula obrigatória (PROTECT)
- [x] unique_together MinistrarAula: (aula, alu)
- [x] MinistrarAulaPage: POST /api/aulas/ ao iniciar, PATCH ao finalizar
- [x] Migrations 0020–0024 aplicadas em produção
- [x] **Validado em produção com aula real** — Funcional 17:00, 15/04/2026, 3 alunos

### Fase 5 ✅ COMPLETO, VALIDADO E ENCERRADO (16/04/2026)
- [x] Model `ProgramaTurma` — sequência ordenada de fichas por turma
- [x] `Aulas`: campos `aul_numero_ciclo` e `aul_posicao_ciclo` calculados automaticamente; FK `fitr`
- [x] `AulasViewSet.perform_create`: calcula ciclo/posição com base no ProgramaTurma
- [x] `ProgramaTurmaPage`: drag & drop para montar e reordenar o ciclo de fichas
- [x] `MinistrarAulaPage`: sugestão automática da próxima ficha; envia `fitr` no POST /api/aulas/
- [x] Model `RegistroExercicioAluno` — séries/reps/carga/obs por aluno por exercício
- [x] `MinistrarAulaPage`: campos editáveis por exercício; referência da última vez (ciclo anterior)
- [x] Finalizar: POST `/api/registro-exercicio-aluno/` para cada exercício com dados
- [x] Filtros de evolução: `aul_numero_ciclo`, `aul_posicao_ciclo`, `ftex__exe`, `ministrar_aula__aula__fitr`
- [x] Migrations 0025–0026 aplicadas
- [x] 84 testes passando
- [x] **Validado em produção com aula real**

### Fase 6 — Permissões, Relatórios de Evolução e Refatorações ✅ COMPLETO E EM PRODUÇÃO (17/04/2026)
- [x] Permissões por perfil implementadas no backend — `backend/apps/core/permissions.py`
  - `IsAdministrador`, `IsProfessorOuAdmin`, `IsFinanceiroOuAdmin`, `IsRecepcionistaOuAdmin`
  - `financeiro/views.py` → `IsFinanceiroOuAdmin` (FolhaPagamento usa `IsAdminUser`)
  - `operacional/views.py` → `IsRecepcionistaOuAdmin` (AgendamentoHorario/Turmas mantém `AllowAny` no `create`)
  - `tecnico/views.py` → `IsProfessorOuAdmin`
- [x] Frontend: `PerfilRoute` no React Router — redireciona para `/dashboard` se sem acesso
- [x] ExerciciosPage: redesign card-based agrupado por modalidade (Pilates / Funcional / Sem modalidade)
- [x] TurmasPage: redesign card-based agrupado por modalidade + badge `cheia` quando 15/15 alunos
- [x] MinistrarAulaPage: drag & drop para reordenar exercícios da ficha (@dnd-kit)
  - Mobile fix: `PointerSensor` com `activationConstraint: { delay: 250, tolerance: 5 }`
- [x] AulasPage: componente `ComparativoCiclo` — compara PSE e obs com aula do ciclo anterior
- [x] RelEvolucaoCargaPage: gráfico de evolução de carga por aluno/exercício + tabela detalhada
- [x] GrafEvolucaoPsePage: gráfico PSE médio por aula (eixo X = data, uma linha por ciclo)
  - Fix: eixo X usa data da aula (não posição do ciclo) — funciona sem ProgramaTurma configurado
- [x] Sidebar: itens "Evolução de Carga" e "Evolução PSE" adicionados
- [x] Endpoints backend: `GET /api/relatorios/evolucao-carga/` e `GET /api/relatorios/evolucao-pse/`

### Fase 7 — Remodelagem UX Mobile ✅ COMPLETO E EM PRODUÇÃO (17/04/2026)
- [x] `MinistrarAulaPage` 7.1: select de Modalidade como 1º campo — filtra turmas e fichas; limpa seleção ao trocar
- [x] `MinistrarAulaPage` 7.2: cards de aluno colapsáveis — collapsed no mobile, expanded no desktop; nome colorido por modalidade (roxo/cyan); auto-expand ao marcar presença
- [x] `FichasTreinoPage` 7.3: cards por modalidade (Pilates / Funcional / Sem modalidade) — botão Nova pré-seleciona modalidade; search client-side
- [x] `BottomBar.jsx` 7.4: barra fixa no rodapé mobile com 5 ícones (Dashboard/Finanças/Operacional/Técnico/Relatórios)
- [x] `AppLayout`: sidebar oculta no mobile; drawer com overlay ao clicar ☰; `pb-20 md:pb-5` para não cobrir conteúdo
- [x] `Topbar`: botão ☰ hambúrguer visível só no mobile (`md:hidden`)

### Fase 9.2 — Refatorações UX (23/04/2026) ✅ EM PRODUÇÃO
- [x] ContasReceber: Serviço + Plano podem ser selecionados simultaneamente — valores somados com breakdown visual
- [x] ContasReceber: combobox Plano busca catálogo PlanosPagamentos (não AlunoPlano) — funciona para alunos novos
- [x] AlunosPage: layout master-detail — Card 1 (lista de nomes, LGPD) + Card 2 (detalhe ao lado)
  - Desktop: dois cards lado a lado (320px + flex); Mobile: empilhados
  - Nome selecionado destacado; clicar novamente fecha; botão X fecha
- [x] AlunosPage: Novo Aluno já inclui seleção opcional de Plano de Pagamento (cria AlunoPlano automaticamente)
- [x] AlunoForm: plano inicial opcional — ao salvar cria AlunoPlano em sequência

### Fase 8 — Sistema de Avisos de Falta ✅ COMPLETO E EM PRODUÇÃO (22/04/2026)
- [x] Model `AvisoFalta` — calcula `avi_antecedencia_horas` e `avi_gera_credito` automaticamente no `save()`
- [x] FK `aviso_falta` (OneToOne) em `CreditoReposicao`; `aula_origem` agora nullable (retrocompatível)
- [x] Signal `operacional/signals.py` — `AvisoFalta → CreditoReposicao` automático (limite 3, sem duplicata)
- [x] Signal `tecnico/signals.py` atualizado — verifica `AvisoFalta` antes de gerar crédito via `MinistrarAula`
- [x] Endpoint `/api/avisos-falta/` — filtros: `aluno`, `turma`, `avi_data_aula`, `avi_tipo`, `avi_gera_credito`
- [x] Página `AvisosPage` — `/operacional/avisos-falta` — lista + form modal + filtros
- [x] Sidebar: item "Avisos de Falta" adicionado em Operacional
- [x] `MinistrarAulaPage`: badge "Avisou" por aluno + campo "Quando o aluno avisou?" para justificada/atestado
- [x] `MinistrarAulaPage`: cria `AvisoFalta` no finalizar se não havia aviso prévio
- [x] `AlunosPage`: seção "Avisos e Créditos" no detalhe do aluno (histórico + créditos disponíveis)
- [x] Migrations 0007 (operacional) e 0027 (tecnico) aplicadas em produção
- [ ] Cenário 3 (aviso >48h): pendente decisão com clientes — não gera crédito por ora
- [ ] Uso cruzado Pilates ↔ Funcional: pendente

### Fase 8 — Foto de Perfil com Cloudinary ✅ COMPLETO E EM PRODUÇÃO (24/04/2026)
- [x] Campo `foto_url` no model User + migration `0002_foto_avatar_user_foto_url`
- [x] `cloudinary==1.36.0` em `requirements.txt` + `cloudinary.config()` em `settings.py`
- [x] Endpoints `POST /api/usuarios/upload-foto/` e `DELETE /api/usuarios/remover-foto/`
- [x] `foto_url` exposto no `UserSerializer` e `/api/me/`
- [x] Vars Cloudinary no `docker-compose.yml` (seção `environment` do backend)
- [x] Componente `Avatar.jsx` — exibe foto ou iniciais
- [x] `setUser` adicionado ao `useAuthStore`
- [x] Topbar: logo Studio Fluir centralizada + ícone sair (sem nome/avatar)
- [x] Sidebar: avatar 56px + nome + email acima do menu; hover → câmera → upload

### Fase 10 — Refatoração Financeira Completa ✅ COMPLETO E EM PRODUÇÃO (25/04/2026)

#### Parte A — Estrutura Base ✅
- [x] Model `Conta` (corrente/poupança/caixa) + fixtures: 3 contas iniciais
- [x] Model `PlanoContas` (classificação contábil) + fixtures: 16 categorias
- [x] Endpoints `/api/contas/` e `/api/plano-contas/`
- [x] Frontend: `ConfiguracaoFinanceiraPage` em `/financas/configuracao`

#### Parte B — ContasReceber Refatorada ✅
- [x] `alu` nullable; novos campos: `rec_tipo`, `plano_contas` FK, `conta` FK, `rec_nome_pagador`
- [x] Validação: tipos mensalidade/avaliacao/consultoria/personal exigem aluno
- [x] Filtro date range: `rec_data_vencimento__gte` / `__lte`
- [x] Frontend: visão mensal agrupada + modal de pagamento rápido [💰]

#### Parte C — ContasPagar Refatorada ✅
- [x] `forn` nullable; novos campos: `cpa_tipo`, `plano_contas` FK, `conta` FK, `cpa_nome_credor`
- [x] Pró-labore NÃO gera lançamento automático no LivroCaixa
- [x] Frontend: visão mensal agrupada + modal de pagamento rápido [💸]

#### Parte D — LivroCaixa Refatorado ✅
- [x] Novos campos: `conta`, `conta_destino`, `plano_contas`, `lcx_tipo_movimento`, `lcx_competencia`, `lcx_documento`
- [x] Signals atualizados: passam `conta` e `plano_contas` para novos lançamentos
- [x] Endpoint `POST /api/transferencia/`: 2 lançamentos em `transaction.atomic()`
- [x] Frontend: `TransferenciaPage` + LivroCaixaPage exibe conta/plano nos lançamentos

#### Parte E — Pedidos ✅
- [x] Model `Produto` com estoque atual/mínimo
- [x] Model `Pedido` (número auto PED-XXXX) + `PedidoItem` (produto/serviço/plano)
- [x] Signal: reduz estoque, gera LivroCaixa (à vista) ou ContasReceber (futuro)
- [x] Endpoint `/api/pedidos/{id}/confirmar/` + `/api/produtos/alertas-estoque/`
- [x] Frontend: `PedidosPage` com itens dinâmicos e confirmação de pagamento

#### Parte F — Relatórios ✅
- [x] DRE: `GET /api/relatorios/dre/?mes=&ano=` — agrupa LivroCaixa por plano de contas
- [x] Fluxo de Caixa: `GET /api/relatorios/fluxo-caixa/?meses=` — projeta pendentes
- [x] Extrato: `GET /api/relatorios/extrato/?conta=` — movimentações por conta; mes/ano opcionais (sem filtro = todos)
- [x] Frontend: `DREPage`, `FluxoCaixaPage`, `ExtratoPorContaPage`

**55 testes passando (financeiro: 55, operacional: 20, técnico: 33 — total: 108)**

### Fase 10.1 — Refatorações e Correções (26/04/2026) ✅ EM PRODUÇÃO

- [x] **Bug ConfiguracaoFinanceiraPage:** dupla extração `.results` no `useList` — Contas e PlanoContas mostravam "0 registros". Corrigido com destructuring direto: `const { data: contas, count: total, page, setPage } = useList(...)`
- [x] **Desvinculação ServicoProduto → Serviço:** campo `serv_tipo` removido do model, serializer, views, admin e tests (migration `0010`). Todas as referências "Serviço/Produto" no frontend trocadas para "Serviço"
- [x] **ProdutosPage criada:** CRUD completo + badge de estoque baixo + alerta no topo da página. Sidebar atualizada com item "Produtos" separado de "Serviços"
- [x] **Bug PedidosPage — item tipo Plano:** `getOpcoes('plano')` retornava `[]` e o JSX caía em input de texto livre. Corrigido: fetch de `PlanosPagamentos`, case adicionado ao `getOpcoes`, condição JSX corrigida

### Fase 10.2 — Geração Automática de Mensalidades + Recibo PDF (27/04/2026) ✅ EM PRODUÇÃO

#### Geração de Mensalidades
- [x] Management command `gerar_mensalidades`: percorre todos os `AlunoPlano` ativos com `aplano_dia_vencimento` definido, calcula vencimento do próximo mês (respeita meses curtos e `aplano_data_fim`), cria `ContasReceber` idempotente (não duplica se já existe para o mesmo `aplano`+mês+ano)
- [x] Aceita `--mes`/`--ano` para mês específico e `--dry-run` para simular sem gravar
- [x] Endpoint `POST /api/gerar-mensalidades/` (IsAdminUser) com suporte a `dry_run`
- [x] `ConfiguracaoFinanceiraPage`: seção "Geração de Mensalidades" — botão faz dry-run primeiro, abre modal com preview (quantas serão criadas + detalhes), confirmar executa de verdade
- [x] Cron na VPS configurado: `0 8 27 * * cd /var/www/studio-fluir && docker compose exec -T backend python manage.py gerar_mensalidades >> /var/log/nosfluir-mensalidades.log 2>&1`
- [x] Lógica de billing: `plan_tipo_plano` (mensal/trimestral/semestral) define duração do contrato — cobrança é sempre mensal; cartão parcela por conta própria

#### Recibo PDF
- [x] `reportlab>=4.2` adicionado ao `requirements.txt`
- [x] Endpoint `GET /api/pedidos/{id}/recibo/` — gera PDF com cabeçalho Studio Fluir, dados do pedido, tabela de itens, total e forma de pagamento
- [x] `PedidosPage`: botão de impressão baixa PDF autenticado via axios blob (não abre link direto — respeita JWT)

### Fase 10.3 — Minhas Contas + Correção LivroCaixa (28/04/2026) ✅ EM PRODUÇÃO

#### Tela Minhas Contas
- [x] `MinhasContasPage` em `/financas/minhas-contas` — sidebar item "Minhas Contas" (primeiro de Finanças)
- [x] Cards por conta com gradiente por tipo (corrente: azul, poupança: verde, caixa: âmbar) + saldo atual calculado
- [x] `ContaSerializer`: campo `saldo_atual` (SerializerMethodField — soma entradas/saídas do LivroCaixa para a conta)
- [x] Clicar no card seleciona a conta e carrega extrato; clicar novamente deseleciona
- [x] Navegação mês a mês `< Mês Ano >` com resumo entradas/saídas/saldo do período
- [x] Tabela de transações: data, descrição, categoria, valor +/- colorido, saldo acumulado
- [x] Botão **+ Lançamento** no cabeçalho do extrato → modal de novo lançamento direto
- [x] Modal: toggle Entrada/Saída (cor dinâmica), valor, descrição, data, forma de pgto, categoria — POST `/api/livro-caixa/`; saldo e cards atualizam automaticamente após salvar

#### Correção de dado corrompido (LivroCaixa pré-Fase 10)
- [x] `LivroCaixa ID 2` ("Pagamento: Poupança") — hard-deleted: `conta: None`, `tipo: entrada` vindo de `contas_pagar` (bug de signal pré-Fase 10)
- [x] `ContasPagar ID 2` ("Poupança") — soft-deleted: conceito errado (depósito em poupança não é conta a pagar)
- [x] `LivroCaixa ID 3` — hard-deleted: gerado pelo signal ao fazer `save()` no ContasPagar durante a correção
- [x] Criado `LivroCaixa ID 4` correto: entrada R$ 818,60 na **Poupança Mercado Pago** (data original 23/04/2026)

### Fase 11 — Melhorias e Correções (04/05/2026) — EM PRODUÇÃO (Seções 1 e 2)

#### Fix: TurmaAlunos — re-adicionar aluno removido ✅
- [x] Bug: `unique_together [['tur','alu']]` bloqueava re-add após soft-delete → `POST 400`
- [x] `TurmaAlunosViewSet.create()`: detecta registro soft-deleted e restaura (deleted_at=None, ativo=True)
- [x] `TurmaAlunosSerializer`: `validators=[]` + validação manual excluindo soft-deleteds do check de unicidade

#### Seção 1 — Pequenos e Médios ✅
- [x] **1.1 Gráfico PSE por modalidade:** parâmetro `?modalidade=` no endpoint; toggle Todos/Funcional/Pilates no frontend
- [x] **1.2 AulasPage — coluna Ficha:** exibe `fitr_nome` na tabela (hidden mobile, visível md+); "Sem ficha" em tom suave
- [x] **1.3 AlunosPage — plano compacto:** `serv_nome` adicionado ao `AlunoPlanoSerializer`; display: nome + Badge Ativo/Inativo + "dia X · R$ valor · desde data"
- [x] **Fix PSE chart:** eixo X mudado de data → `aul_posicao_ciclo` (posição da ficha no programa); tooltip mostra ficha + data + PSE + alunos; backend inclui `fitr_nome`

#### Seção 2 — Reposições: Faltas Sem Justificativa ✅
- [x] **Endpoint** `GET /api/faltas-sem-justificativa/` — `MinistrarAula` com `miau_tipo_falta=sem_aviso`; filtros `alu/tur/aul_data`; paginado; `FaltaSemJustificativaSerializer` com `alu_nome`, `tur_nome`, `aul_data`, `aul_modalidade`
- [x] **ReposicoesPage:** filtro "Sem Justificativa" alterna listagem de créditos → listagem de faltas
- [x] **Modal justificativa retroativa:** seleciona tipo (justificada/atestado) + datetime do aviso + obs → cria `AvisoFalta` (signal gera crédito se elegível) → PATCH `miau_tipo_falta='justificada'`; auditoria via `updated_by`/`updated_at`

#### Seções 3 e 4 — Pendentes
- [ ] Seção 3: Repetição automática de Contas a Pagar/Receber
- [ ] Seção 4: Carrinho de pedidos (PedidosPage)

#### Pendência técnica — Refatoração de Ciclos (a discutir)
- `aul_numero_ciclo` calculado por posição individual — pode divergir se aulas pularem posições
- Lógica correta: ciclo = quantas vezes a posição 1 apareceu antes da aula atual
- PSE chart depende de `ProgramaTurma` — turmas sem programa ficam sem dados no gráfico
- A discutir: puxar ciclo direto das Aulas (ordem cronológica), sem depender de ProgramaTurma

### Fase 11 — Melhorias e Correções ✅ COMPLETO E EM PRODUÇÃO (05/05/2026)

#### Seção 1 — Pequenos ✅
- [x] 1.1 Gráfico PSE filtrado por modalidade (toggle Funcional/Pilates/Todos)
- [x] 1.2 AulasPage exibe nome da FichaTreino usada na aula (ou "Sem ficha")
- [x] 1.3 Plano do aluno: nome compacto + dia vencimento + badge Ativo/Inativo

#### Seção 2 — Reposições: Faltas Sem Justificativa ✅
- [x] 2.1 Filtro "Sem Justificativa" na ReposicoesPage
- [x] 2.2 Endpoint `GET /api/faltas-sem-justificativa/` + listagem com aluno/turma/data
- [x] 2.3 Modal de justificativa retroativa: cria AvisoFalta → signal → CreditoReposicao automático

#### Seção 3 — Repetição Automática ✅
- [x] 3.1 Campo repetição nos forms de ContasPagar e ContasReceber (checkbox + qtd + periodicidade)
- [x] 3.2 Backend: `_add_months()` + `perform_create` cria N cópias em `transaction.atomic()`; campo `repeticao` (write_only DictField) nos serializers
- [x] 3.3 Preview das próximas datas exibido no form antes de salvar

#### Seção 4 — Carrinho de Pedidos ✅
- [x] 4.1 PedidosPage reescrita: lista de pedidos (ListView) + visão de carrinho (CartView)
- [x] 4.2 Catálogo com tabs Produtos/Serviços/Planos e busca client-side
- [x] 4.3 CarrinhoItem com +/- quantidade e total dinâmico; estado local em useState
- [x] 4.4 Mobile: barra inferior fixa com total + drawer deslizante com carrinho completo
- [x] 4.5 Parcelas no pagamento futuro: campo `ped_num_parcelas` (IntegerField, default=1) + migration `0012`
  - Signal cria N ContasReceber mensais (ROUND_DOWN + resto na última; ex: `Pedido PED-0001 1/3`)
  - Carrinho: input "N parcelas" aparece inline ao marcar Futuro; desmarcar reseta para 1

**117 testes passando (financeiro: 55, operacional: 20, técnico: 33)**

### Fase 12 — Reorganização de Menu e UX ✅ COMPLETO E EM PRODUÇÃO (06/05/2026)

#### Item 1 — Configuração ✅
- [x] Aparelhos e Acessórios removidos do menu Configuração (redundantes — já acessíveis dentro de Exercícios); rotas mantidas

#### Item 2 — Menu Pagamentos ✅
- [x] Novo grupo **Pagamentos** (ícone ShoppingBag) criado após Finanças
- [x] Movidos para Pagamentos: Planos de Pagamento, Pedidos, Produtos, Serviços
- [x] Novas rotas `/pagamentos/planos|pedidos|produtos|servicos`
- [x] Redirects automáticos de `/financas/planos|pedidos|produtos|servicos` → novos paths

#### Item 3 — Minhas Contas absorve Configuração e Transferência ✅
- [x] Botão "Nova Conta" no header → modal com form de criação inline
- [x] Botão "Transferir entre contas" abaixo dos cards (aparece com ≥2 contas) → modal com form de transferência
- [x] Configuração e Transferência removidos do menu Finanças (rotas mantidas)

#### Item 4 — Gerar Mensalidades → Contas a Receber ✅
- [x] Botão "⚡ Gerar Mensalidades" no header de ContasReceberPage (ao lado de "Nova Conta")
- [x] Dry-run automático ao clicar → modal de confirmação com preview → após gerar refetch da lista
- [x] Removido de PlanosPage e ConfiguracaoFinanceiraPage

#### Correções e melhorias do dia ✅
- [x] **Livro Caixa — Auditoria Global:** totais via `/livro-caixa/totais/` (agregado DB, respeita filtros); coluna saldo_atual removida da tabela (sem sentido multi-conta); cards sempre corretos
- [x] **PDF DRE:** `GET /api/relatorios/dre/pdf/` — download autenticado via axios blob
- [x] **PDF Fluxo de Caixa:** `GET /api/relatorios/fluxo-caixa/pdf/` — tabela mensal com cores
- [x] **Categoria obrigatória** no lançamento manual (MinhasContasPage bloqueia sem plano_contas)
- [x] **Livro Caixa removido de Finanças** — fica apenas em Relatórios
- [x] **RelLivroCaixaPage:** filtros Tipo + Conta adicionados; coluna Conta na tabela; totais corretos

**117 testes passando (financeiro: 55, operacional: 20, técnico: 33)**

### Fase 13 — Agendamento e Aula Experimental ✅ COMPLETO E EM PRODUÇÃO (13/05/2026)

#### Backend — App `operacional` (migrations 0009 e 0010)
- [x] Model `SlotExperimental` — horários recorrentes (dia_semana + hora + modalidade + vagas); `vagas_disponiveis` property; unique: (dia, hora, modalidade)
- [x] Model `AgendamentoExperimental` — FK `slot` **nullable** (0010); status: pendente/confirmado/realizado/cancelado/faltou; POST público
- [x] Model `AulaExperimental` — anamnese + testes físicos + decisão; OneToOne com AgendamentoExperimental; `save()` seta `age_status='realizado'` automaticamente
- [x] Permissões: GET slots público; POST agendamento público; GET/PATCH agendamento = Recepcionista/Admin; aula = Professor/Admin
- [x] 117 testes passando (sem regressão)

#### PKs dos novos models:
```
SlotExperimental         → slot_id
AgendamentoExperimental  → age_id
AulaExperimental         → aexp_id
```

#### FKs no payload (sem sufixo `_id`):
```
slot, agendamento, func, aluno
```

#### Frontend Sistema
- [x] **AgendamentosPage** (`/operacional/agendamentos`) — 3 abas:
  - **Horários** e **Turmas** — solicitações do site (read + delete)
  - **Grade de Horários** — grid visual Seg–Sex × 06h–21h; clique `+` numa célula → mini form (modalidade + vagas) → cria `SlotExperimental`; badge no slot → toggle ativo/inativo; lápis → editar vagas / remover
  - Botão **"Novo Agendamento Experimental"** no header → abre formulário com calendário
- [x] **ExperimentalPage** (`/tecnico/experimental`) — item em Técnico antes de "Aulas":
  - Lista com filtros (status, modalidade, data); clicar no nome → painel de detalhes
  - Ações: confirmar, cancelar, faltou, iniciar/ver aula experimental
  - Formulário completo de **AulaExperimental**: anamnese (profissão, doenças, lesões, objetivo) + testes físicos (agachamento, flexibilidade, equilíbrio, coordenação) + decisão (cadastrar como aluno ou encerrar)
  - Modal de cadastro de **Aluno pré-preenchido** ao decidir "cadastrar" (cria Aluno → vincula na AulaExperimental)
- [x] **Calendário visual** de slots nos dois formulários de Novo Agendamento:
  - Grid semanas × dias (Seg–Sex); dias com slots ativos têm bolinha; clique no dia → mostra horários disponíveis como botões (hora + badge modalidade + vagas)
  - Seleciona horário → preenche automaticamente data, hora, slot_id e modalidade
  - Data usa horário **local** (não UTC) — sem deslocamento de fuso Brasil

#### Site Institucional (`agendamento.html`)
- [x] Calendário visual idêntico ao sistema, carregado de `/api/slots-experimentais/?slot_ativo=true`
- [x] Clica no dia → mostra horários disponíveis; clica no horário → confirma e submete via POST para `/api/agendamento-experimental/`
- [x] Se slot for "Ambos", aparece select de modalidade
- [x] Fallback WhatsApp se API falhar
- [x] CSS: `.cal__grid`, `.cal__horario-btn`, `.cal__horario-tag` para cada modalidade

### Fase 14 — Melhorias UX, Dashboard e Correções ✅ COMPLETO E EM PRODUÇÃO (14/05/2026)

- [x] **Instrucoes_Claude_Code_Fase13.md** — documentação retroativa criada
- [x] **Fix layout mobile/tablet** — `ContasReceberPage` e `ContasPagarPage`: layout 2 linhas no mobile (nome + badge status na linha 1; data + valor + ações na linha 2); descrição oculta até `lg` no tablet
- [x] **Dashboard redesign** — 2 seções separadas por perfil:
  - **Financeiro**: Saldo Total, A Pagar, A Receber, Resultado do Mês + gráfico barras 3 meses + listas pendentes + alertas estoque
  - **Técnico/Operacional**: Total Alunos, Turmas, Aulas Hoje, Créditos + lista aulas do dia + experimentais pendentes
  - Saudação personalizada (Bom dia/Boa tarde/Boa noite + primeiro nome)
- [x] **Fix BottomBar mobile** — botão Relatórios apontava para `/relatorios` (rota inexistente → fallback dashboard); corrigido para `/relatorios/frequencia`

#### Em aberto — LivroCaixa ID=1 / ContasPagar ID=1 sem conta/plano_contas
- [ ] `LivroCaixa ID=1` ("Pagamento: Aluguel", R$ 600, 23/04/2026) — `conta=None`, `plano_contas=None` (criado pré-Fase 10)
- [ ] `ContasPagar ID=1` ("Aluguel", R$ 600, pago, venc 25/04/2026) — idem
- **Ação:** confirmar com clientes qual conta foi usada → hard-delete LivroCaixa ID=1 + `update()` no ContasPagar + recriar LivroCaixa com campos corretos
- **Ver:** `Instrucoes_Claude_Code_Fase14.md` → seção "Em Aberto" para passos detalhados

### Fase 14.1 — Correções de Dados e UX Financeiro ✅ EM PRODUÇÃO (14/05/2026)

#### Correções de dados históricos (via Django shell, `QuerySet.update()`)
- [x] `LivroCaixa ID=4` ("Deposito Poupanca Mercado Pago") — `plano_contas` setado para ID=6 (Rendimento Poupança)
- [x] `LivroCaixa ID=5` ("Confrinho") — `plano_contas` corrigido de ID=15 (despesa!) para ID=7 (Outros Recebimentos); saldo inicial pré-sistema
- [x] `LivroCaixa ID=13` ("Pedido PED-0004") — `plano_contas` setado para ID=5 (Venda de Produtos); historico padronizado para "Recebimento: Pedido PED-0004"
- [x] `ContasPagar ID=3` ("Parcela final das meias") — `plano_contas` corrigido de ID=12 (Serviços Terceiros) para ID=10 (Material/Equipamento); `cpa_tipo='material'` estava inconsistente com o plano

#### Fix signal `processar_pedido` (`financeiro/signals.py`)
- [x] LivroCaixa criado com `plano_contas_id=5` (Venda de Produtos) — antes ficava `None` → "Sem Classificação" no DRE
- [x] ContasReceber (pagamento futuro) criado com `plano_contas_id=5` — quando pago, LivroCaixa herda o plano corretamente
- [x] Histórico à vista padronizado: `f'Recebimento: Pedido {ped_numero}'` (era `f'Pedido {ped_numero}'`)

#### UX — ContasReceberPage
- [x] **Ordenação por status** dentro de cada grupo mensal: Vencida → Pendente → Recebida → Futuro → Cancelada; sort secundário por data crescente dentro de cada status
- [x] **Plano de Contas filtra só receitas** (`plc_tipo.startsWith('receita')`)
- [x] **Auto-preenche Plano de Contas** ao selecionar Tipo de Receita (mapeamento `TIPO_PARA_PLANO`); usuário pode sobrescrever manualmente

#### UX — ContasPagarPage
- [x] **Campo Serviço removido** do formulário — `ServicoProduto` é o catálogo de vendas do studio, sem relação com despesas a pagar
- [x] **Campo Tipo de Despesa (`cpa_tipo`) removido** do formulário e dos filtros — redundante com `plano_contas`; badge na lista agora mostra `plano_contas_nome`
- [x] **Plano de Contas filtra só despesas** (`plc_tipo.startsWith('despesa')`)

#### UX — Relatório Contas a Pagar
- [x] Coluna **Conta** adicionada na tabela (`conta_nome` do serializer)

### Regras importantes descobertas na Fase 14.1:
- `cpa_tipo` (ContasPagar) era redundante com `plano_contas` → removido da UI; campo ainda existe no model/DB mas não é mais preenchido via UI
- `rec_tipo` (ContasReceber) **NÃO é redundante** — tem lógica de negócio: `TIPOS_COM_ALUNO` define se campo aluno é obrigatório; validação no backend também depende desse campo
- `plano_contas` em ContasPagar: usar `QuerySet.update()` para corrigir sem disparar signal de LivroCaixa
- `processar_pedido` signal: sempre passar `plano_contas_id=5` pois pedidos são receita de venda

### Pendências técnicas restantes:
- [ ] Uso cruzado de crédito (Pilates ↔ Funcional) não implementado no backend
- [ ] Crédito expirado — sem job automático para atualizar status
- [ ] Agendamentos do site exigem Aluno pré-existente — design a revisar com clientes
- [ ] Refatoração de ciclos: lógica mais simples sem depender de ProgramaTurma
- [ ] LivroCaixa ID=1 / ContasPagar ID=1 — corrigir conta/plano_contas (aguardando confirmação das clientes)

---

## 📞 Contato do Cliente

**Giulia Fagionato** — giuliaruffino015@gmail.com
**Tássia Magnaboso** — tassiamagnabosco@hotmail.com

---

**🚀 Bora codar! Good luck, Claude Code!**

> ⚠️ **SISTEMA EM PRODUÇÃO — atualizar este arquivo a cada mudança relevante.**
