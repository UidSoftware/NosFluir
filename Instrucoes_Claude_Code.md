# Instruções Claude Code — Nos Studio Fluir
> Versão: 2.0
> Etapa atual: Fase 2 — Frontend React (em execução)
> Última atualização: 03/04/2026

---

## Antes de começar QUALQUER tarefa

1. Leia o `CLAUDE.md` completo — é a memória do sistema
2. Leia o `Dicionario_Dados.md` se for mexer em models ou API
3. Leia o `Regras_Negocio.md` se for mexer em lógica de negócio
4. O sistema está **em produção** — qualquer erro afeta as clientes diretamente
5. **NUNCA** criar outro `CLAUDE.md` — o existente na raiz é o único

---

## Status Atual do Projeto

```
Fase 1 — Backend base          ✅ COMPLETO E EM PRODUÇÃO
Fase 2 — Frontend React        🔄 EM ANDAMENTO (base criada, módulos em desenvolvimento)
Fase 3 — Site Institucional    ✅ COMPLETO (em produção)
Fase 4 — Sistema de Reposições ⏳ AGUARDANDO Fase 2
Fase 5 — Telas Restantes       ⏳ PLANEJADA
```

---

## Stack Frontend (definida — NÃO alterar)

```
React 18 + Vite
React Router v6          → rotas com basename '/sistema'
TanStack Query v5        → cache e requisições
Zustand                  → estado global (auth)
Axios                    → HTTP client com interceptors JWT
Tailwind CSS             → estilização
Radix UI + shadcn/ui     → componentes acessíveis
Recharts                 → gráficos
react-hook-form + zod    → formulários e validação
lucide-react             → ícones
```

**Fontes:** Sora (sans) + JetBrains Mono — carregadas via Google Fonts no `index.html`
**Tema:** dark — fundo `#151329` predominante, cor principal `#5D5CE0` (purple), accent `#01E2CD` (cyan)

---

## Estrutura de Pastas do Frontend

```
frontend/
├── index.html                         ← carrega fontes Sora + JetBrains Mono
├── vite.config.js                     ← base: '/sistema/' + PWA — NÃO ALTERAR
├── tailwind.config.js                 ← cores fluir, fontes, animações
├── postcss.config.js
├── .env.example
└── src/
    ├── main.jsx                       ← entry point, QueryClient, RouterProvider
    ├── index.css                      ← tema dark, CSS vars, scrollbar, utilitários
    ├── lib/utils.js                   ← cn(), formatCurrency(), formatDate(), formatCPF(),
    │                                     onlyNumbers(), getInitials(), STATUS_COLORS, STATUS_LABELS
    ├── services/
    │   ├── api.js                     ← Axios + interceptors JWT (refresh automático)
    │   └── auth.service.js            ← login(), logout(), getUser()
    ├── store/useAuthStore.js          ← Zustand: user, login, logout, canAccess*(), isAdmin()
    ├── hooks/
    │   ├── useApi.js                  ← useList(), useDetail(), useCreate(), useUpdate(), useDelete()
    │   └── useToast.js                ← toast() global
    ├── routes/
    │   ├── index.jsx                  ← todas as rotas (basename: '/sistema')
    │   └── ProtectedRoute.jsx
    ├── components/
    │   ├── layout/
    │   │   ├── AppLayout.jsx          ← Sidebar + Topbar + Outlet + Toaster
    │   │   ├── Sidebar.jsx            ← colapsável, permissões, NavLink ativo
    │   │   └── Topbar.jsx             ← avatar, dropdown logout
    │   ├── ui/
    │   │   ├── button.jsx             ← variantes: default, gradient, outline, ghost, destructive
    │   │   ├── card.jsx               ← Card, CardHeader, CardTitle, CardContent, CardFooter
    │   │   ├── dialog.jsx             ← Dialog, DialogContent, DialogHeader, DialogFooter
    │   │   ├── table.jsx              ← DataTable (loading + empty state)
    │   │   ├── select.jsx             ← Select Radix estilizado
    │   │   ├── primitives.jsx         ← Input, Textarea, Label, FormField, Badge, Skeleton, Spinner, EmptyState
    │   │   ├── pagination.jsx         ← Pagination com elipses
    │   │   ├── toast.jsx              ← Toaster
    │   │   └── confirm-dialog.jsx     ← ConfirmDialog genérico
    │   └── shared/
    │       ├── PageHeader.jsx         ← título + descrição + actions
    │       ├── SearchFilter.jsx       ← busca com clear
    │       └── StatusBadge.jsx        ← StatusBadge, BooleanBadge
    └── pages/
        ├── auth/LoginPage.jsx         ✅ COMPLETO
        ├── Dashboard.jsx              ✅ COMPLETO
        ├── operacional/
        │   ├── AlunosPage.jsx         ✅ COMPLETO — USE COMO REFERÊNCIA
        │   ├── FuncionariosPage.jsx   🔄 stub
        │   ├── TurmasPage.jsx         🔄 stub
        │   └── AgendamentosPage.jsx   🔄 stub
        ├── financas/
        │   ├── ContasPagarPage.jsx    🔄 stub
        │   ├── ContasReceberPage.jsx  🔄 stub
        │   ├── LivroCaixaPage.jsx     🔄 stub (somente leitura!)
        │   ├── PlanosPage.jsx         🔄 stub
        │   ├── FolhaPagamentoPage.jsx 🔄 stub (regra especial LivroCaixa)
        │   ├── FornecedoresPage.jsx   🔄 stub
        │   └── ServicosPage.jsx       🔄 stub
        ├── tecnico/
        │   ├── MinistrarAulaPage.jsx  🔄 stub (fluxo complexo — ler instruções)
        │   ├── FichasTreinoPage.jsx   🔄 stub
        │   ├── ExerciciosPage.jsx     🔄 stub
        │   └── ReposicoesPage.jsx     🔄 stub
        ├── relatorios/                🔄 5 stubs
        ├── graficos/                  🔄 3 stubs (Recharts)
        └── configuracao/              🔄 2 stubs
```

---

## Menu do Sistema (Sidebar)

```
Dashboard
Finanças         → Livro Caixa · Contas a Pagar · Contas a Receber
                   Planos · Folha de Pagamento · Fornecedores · Serviços/Produtos
Operacional      → Alunos · Funcionários · Turmas · Agendamentos
Técnico          → Ministrar Aula · Fichas de Treino · Exercícios · Reposições
Relatórios       → Frequência · Pressão Arterial · Contas a Pagar
                   Contas a Receber · Livro Caixa
Gráficos         → Financeiro · Alunos · Frequência
Configuração     → Usuários · Profissões
```

---

## Perfis de Acesso

| Perfil | Financeiro | Técnico | Operacional | Configuração |
|---|---|---|---|---|
| Administrador | ✅ | ✅ | ✅ | ✅ |
| Professor | ❌ | ✅ | ✅ leitura | ❌ |
| Financeiro | ✅ | ❌ | ❌ | ❌ |
| Recepcionista | ❌ | ❌ | ✅ | ❌ |

```javascript
const { isAdmin, canAccessFinanceiro, canAccessTecnico, canAccessOperacional } = useAuthStore()
```

---

## Regras de Código — Frontend

### Hooks de API — SEMPRE usar `useApi.js`

```javascript
import { useList, useCreate, useUpdate, useDelete } from '@/hooks/useApi'

const { data, isLoading, page, setPage, totalPages, count, setFilters } =
  useList('chave', '/endpoint/')

const create = useCreate('chave', '/endpoint/', { onSuccess: () => fecharModal() })
const update = useUpdate('chave', '/endpoint/')
const del    = useDelete('chave', '/endpoint/')
```

### Paginação — SEMPRE `.results`

```javascript
const { data } = useList(...)   // data já é .results internamente ✅
// Se usar useQuery manual:
const items = query.data?.results ?? []  // ✅
```

### Axios — NUNCA criar nova instância

```javascript
import api from '@/services/api'   // ✅
import axios from 'axios'           // ❌
```

### Toast

```javascript
import { toast } from '@/hooks/useToast'
toast({ title: 'Salvo!', variant: 'success' })
toast({ title: 'Erro', description: '...', variant: 'destructive' })
```

### Formulários

```javascript
const { register, handleSubmit, formState: { errors }, setValue, watch, reset } =
  useForm({ defaultValues: { ... } })

// Campos vazios → null antes de enviar
const cleaned = Object.fromEntries(
  Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
)

// CPF/CNPJ → somente números
data.alu_documento = onlyNumbers(data.alu_documento)
```

### Alias — sempre `@/`

```javascript
import { Button } from '@/components/ui/button'  // ✅
import { Button } from '../../...'               // ❌
```

---

## Padrão visual — Página CRUD

Seguir exatamente este padrão. Ver `AlunosPage.jsx` como referência:

```
PageHeader (título + botão "Novo")
Card > CardContent
  SearchFilter (busca + filtros)
  DataTable (colunas + ações)
  Pagination

Dialog criar/editar
  DialogHeader > DialogTitle
  form > FormField + Input
  DialogFooter > Cancelar + Salvar

Dialog detalhe (somente leitura)
ConfirmDialog (exclusão)
```

Coluna de ações padrão:
```jsx
render: (r) => (
  <div className="flex items-center gap-1 justify-end">
    <Button variant="ghost" size="icon-sm" onClick={() => openDetail(r)}>
      <Eye className="w-3.5 h-3.5" />
    </Button>
    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(r)}>
      <Pencil className="w-3.5 h-3.5" />
    </Button>
    <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.id)}
      className="text-red-400 hover:text-red-300">
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  </div>
)
```

---

## Endpoints da API

```
# Auth
POST /api/token/              → login
POST /api/token/refresh/      → refresh
POST /api/token/blacklist/    → logout
GET  /api/usuarios/me/        → usuário logado

# Operacional
/api/operacional/alunos/
/api/operacional/funcionarios/
/api/operacional/turmas/
/api/operacional/turma-alunos/
/api/operacional/profissoes/
/api/operacional/agendamentos-horario/
/api/operacional/agendamentos-turmas/

# Financeiro
/api/financeiro/contas-pagar/
/api/financeiro/contas-receber/
/api/financeiro/livro-caixa/        ← GET e POST apenas (ReadCreateMixin)
/api/financeiro/planos-pagamentos/
/api/financeiro/folha-pagamento/
/api/financeiro/fornecedores/
/api/financeiro/servicos-produtos/

# Técnico
/api/tecnico/aulas/
/api/tecnico/exercicios/
/api/tecnico/fichas-treino/
/api/tecnico/ficha-treino-exercicios/
/api/tecnico/creditos-reposicao/
POST /api/tecnico/creditos-reposicao/usar/
```

> Confirmar nomes exatos no Swagger: https://nostudiofluir.com.br/api/docs/

---

## Instruções por módulo

### FuncionariosPage
CRUD igual Alunos. Campos: `func_nome`, `func_documento` (CPF), `func_telefone`, `func_endereco`, `func_formacao`, `func_salario` (Decimal), `prof_id` (Select → GET /api/operacional/profissoes/).

### TurmasPage
CRUD padrão. Campos: `tur_nome`, `tur_horario`, `func_id` (Select de funcionários).
Ação extra: "Gerenciar Alunos" → modal com lista de matriculados + adicionar/remover. Validar máximo 15 alunos.

### AgendamentosPage
Duas abas: Horários e Turmas. Somente leitura + exclusão (cadastro vem do site).

### FornecedoresPage / ServicosPage
CRUD simples. CNPJ com máscara. `serv_ativo` com Switch/Checkbox.

### ContasPagarPage
CRUD + filtro de status. Ao marcar `pago`: `pag_data_pagamento` obrigatório. Badge de status. Alerta para vencidas.

### ContasReceberPage
Igual ContasPagar. Calcular `rec_valor_total` em tempo real: `(qtd × unit) - desconto`.

### LivroCaixaPage ⚠️
**NUNCA** botão editar/excluir. Filtros de data e tipo. Saldo no topo. Entradas verde, saídas vermelho. Pode criar lançamento manual (POST).

### FolhaPagamentoPage ⚠️
`fopa_valor_liquido` calculado automaticamente. Ao marcar `pago`, exibir alerta:
> "Lembre-se de criar o lançamento manual no Livro Caixa após confirmar."
Botão "Registrar no Caixa" abre modal com `lica_origem_tipo='folha_pagamento'` e `lica_origem_id` preenchido.

### PlanosPage
CRUD. Select de aluno (busca) e serviço. `plan_dia_vencimento` (1-31).

### ExerciciosPage
CRUD simples. Select `exe_aparelho`: solo / reformer / cadillac / chair / barrel.

### FichasTreinoPage
Lista de fichas + exercícios da ficha selecionada. Adicionar exercício: Select + ordem + séries + reps + observações. Botões reordenar.

### MinistrarAulaPage ⚠️ (mais complexo)
Seguir este fluxo:
```
1. Selecionar Turma → carrega alunos automaticamente
2. Selecionar Ficha de Treino (opcional) + Data (padrão: hoje)
3. Para cada aluno:
   - Presença: regular / falta / reposição
   - Se falta: tipo (sem_aviso / justificada / atestado / cenario3)
   - Se reposição: buscar crédito disponível → mostrar qual será consumido
   - Pressão inicial: regex ^\d{2,3}/\d{2}$
4. Botão "Iniciar Aula" → salva hora_inicio
5. Ao finalizar:
   - Pressão final por aluno
   - Intensidade (0-10) por aluno
6. Botão "Finalizar Aula" → salva hora_final
```

### ReposicoesPage
Lista créditos com filtros. StatusBadge: disponível (roxo) / usado (cinza) / expirado (vermelho). Alerta se expiração < 7 dias.

### Relatórios
Todos: filtros de período no topo + tabela + totalizadores no rodapé.

### Gráficos (Recharts)
```javascript
const CHART_COLORS = ['#5D5CE0', '#01E2CD', '#f59e0b', '#ef4444', '#10b981']
```
- Financeiro: LineChart entradas vs saídas / BarChart top fornecedores
- Alunos: BarChart por turma / PieChart por faixa etária
- Frequência: BarChart presença vs falta / LineChart evolução mensal

### ProfissoesPage
CRUD simples. Apenas `prof_nome`.

### UsuariosPage
CRUD. Campos: nome, email, grupos (checkboxes), is_active. Senha obrigatória no cadastro, opcional na edição.

---

## Variáveis de Ambiente

```bash
VITE_API_URL=https://nostudiofluir.com.br/api   # produção
VITE_API_URL=http://localhost:8000/api           # dev local
```

---

## Comandos

```bash
npm install
npm run dev       # http://localhost:5173/sistema/
npm run build     # gera dist/ para deploy
```

---

## Checklist antes de marcar ✅

- [ ] CRUD funcional
- [ ] Busca e filtros com `setFilters`
- [ ] Paginação via `useList` (`.results`)
- [ ] Validação com `react-hook-form`
- [ ] `ConfirmDialog` antes de excluir
- [ ] Toast em todas as ações
- [ ] Loading (Skeleton/Spinner)
- [ ] `EmptyState` quando vazio
- [ ] Responsivo em mobile
- [ ] `formatCurrency`, `formatDate`, `formatCPF` aplicados
- [ ] `StatusBadge` nas colunas de status
- [ ] Campos vazios → `null` antes de enviar

---

## Se Travar

1. `AlunosPage.jsx` é a referência para CRUDs
2. Swagger: https://nostudiofluir.com.br/api/docs/
3. Releia CLAUDE.md / Dicionario_Dados.md / Regras_Negocio.md
4. Pare e avise com contexto (o que tentou, o que deu erro)
5. Nunca invente comportamento. Nunca altere regras de negócio sem confirmação.

---

*Uid Software — Sistema Nos Studio Fluir — Produção*
*Instruções Claude Code v2.0 — 03/04/2026*
