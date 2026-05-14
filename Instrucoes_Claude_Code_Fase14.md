# Instrucoes_Claude_Code_Fase14.md
# Nos Studio Fluir — Uid Software
# Fase 14 — Melhorias UX, Dashboard e Correções (14/05/2026)

## ⚠️ ATENÇÃO — SISTEMA EM PRODUÇÃO

Testar cada item antes de avançar.
```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro apps.operacional apps.tecnico --verbosity=2
```

---

## O que foi feito nesta fase

### Item 1 — Instrucoes_Claude_Code_Fase13.md ✅

Arquivo de documentação retroativa da Fase 13 criado.
Segue o mesmo padrão dos demais arquivos de instrução (checklist, models, endpoints, regras).

---

### Item 2 — Fix Layout Mobile/Tablet: Contas a Pagar e Receber ✅

**Problema:** nomes truncavam a ~6 caracteres no mobile porque data + valor + badge
consumiam ~239px dos ~336px disponíveis.

**Arquivos alterados:**
- `frontend/src/pages/financas/ContasReceberPage.jsx` — componente `LinhaRec`
- `frontend/src/pages/financas/ContasPagarPage.jsx` — componente `LinhaPag`

**Solução:**

**Mobile (< md):** 2 linhas por item
```
Linha 1: ● Nome Completo do Aluno        [Recebida]
Linha 2:   04/05/2026 · R$ 220,00         ✏️ 🗑️
```

**Tablet (md–lg):** descrição oculta até `lg` (`hidden lg:block`)
- Libera ~130px para o nome no tablet

**Desktop (≥ lg):** sem alteração.

**Padrão JSX:**
```jsx
<div className="py-2.5 px-3 ...">
  {/* Mobile: 2 linhas */}
  <div className="md:hidden">
    <div className="flex items-center gap-2">
      <dot /> <span className="font-medium flex-1 min-w-0 truncate">{nome}</span>
      <Badge shrink-0>{status}</Badge>
    </div>
    <div className="flex items-center gap-2 mt-1 pl-4">
      <span text-xs>{data}</span>
      <span font-semibold>{valor}</span>
      <div className="ml-auto">{acoes}</div>
    </div>
  </div>

  {/* Tablet/Desktop: 1 linha */}
  <div className="hidden md:flex items-center gap-2">
    <dot />
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <span truncate>{nome}</span>
      <Badge hidden lg:inline-flex>{tipo}</Badge>
    </div>
    <span hidden lg:block>{descricao}</span>  ← era md:block
    <span shrink-0>{data}</span>
    <span shrink-0>{valor}</span>
    <Badge shrink-0>{status}</Badge>
    <div ml-auto>{acoes}</div>
  </div>
</div>
```

---

### Item 3 — Dashboard Redesign Completo ✅

**Arquivo:** `frontend/src/pages/Dashboard.jsx` — reescrita completa (~470 linhas)

**Antes:** 4 cards básicos + 2 listas genéricas.

**Depois:** 2 seções visuais separadas por perfil de acesso.

#### Seção Financeiro (`canAccessFinanceiro()`)
- 4 StatCards: **Saldo Total** (soma `saldo_atual` de todas as contas) · **A Pagar Pendente** · **A Receber Pendente** · **Resultado do Mês** (entradas - saídas do mês, verde/vermelho dinâmico)
- **BarChart** Entradas × Saídas últimos 3 meses (Recharts, height=180, dados do `/livro-caixa/` agrupados client-side)
- **Lista:** Próximas 5 Contas a Pagar com link "Ver todos → /financas/contas-pagar"
- **Lista:** Próximas 5 a Receber com link "Ver todos → /financas/contas-receber"
- **Alertas Estoque Baixo** — card aparece só se houver produtos críticos (`/produtos/alertas-estoque/`)

#### Seção Técnico/Operacional (`canAccessTecnico() || canAccessOperacional()`)
- 4 StatCards: **Total Alunos** · **Turmas Ativas** · **Aulas Hoje** (com total de presenças) · **Créditos Disponíveis**
- **Lista:** Aulas de hoje com horário, turma, modalidade badge, professor
- **Lista:** Agendamentos Experimentais pendentes com nome, data, hora, modalidade badge

#### Saudação personalizada
```javascript
const hora = new Date().getHours()
const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
const primeiroNome = user?.first_name || user?.email?.split('@')[0] || 'usuário'
```

#### Queries utilizadas
| Seção | Endpoint | Dado |
|---|---|---|
| Financeiro | `/contas/?page_size=20` | `saldo_atual` por conta |
| Financeiro | `/contas-pagar/?pag_status=pendente&page_size=100` | total + lista |
| Financeiro | `/contas-receber/?rec_status=pendente&page_size=100` | total + lista |
| Financeiro | `/livro-caixa/?page_size=300` | gráfico 3 meses + resultado mês |
| Financeiro | `/produtos/alertas-estoque/` | alertas de estoque |
| Técnico | `/alunos/?page_size=1` | count |
| Técnico | `/turmas/?page_size=1` | count |
| Técnico | `/aulas/?aul_data=HOJE&page_size=20` | aulas do dia |
| Técnico | `/creditos/?cred_status=disponivel&page_size=1` | count |
| Técnico | `/agendamento-experimental/?age_status=pendente&page_size=5` | pendentes |

#### Agrupamento do gráfico (client-side)
```javascript
// Agrupar livro-caixa por mês — sem new Date() para evitar fuso
lcxData?.forEach(item => {
  const [y, m] = item.lica_data_lancamento.split('-')
  const label = `${MESES[parseInt(m) - 1]}/${y.slice(2)}`
  // acumula entradas/saidas por label
})
// Ordenar por ano depois mês, pegar últimos 3
.sort((a, b) => a._y !== b._y ? a._y.localeCompare(b._y) : a._m.localeCompare(b._m))
.slice(-3)
```

> ⚠️ `Badge` vem de `@/components/ui/primitives`, NÃO de `@/components/ui/badge` (esse arquivo não existe).

---

### Item 4 — Fix BottomBar: botão Relatórios ✅

**Arquivo:** `frontend/src/components/layout/BottomBar.jsx`

**Problema:** path `/relatorios` não é uma rota registrada no React Router — sem match,
caia no fallback que redireciona para `/dashboard`.

**Fix:**
```javascript
// Antes:
{ icon: BarChart2, path: '/relatorios' }

// Depois:
{ icon: BarChart2, path: '/relatorios/frequencia' }
```

> A detecção de ativo (`location.pathname.startsWith(path)`) continua funcionando
> corretamente para qualquer rota dentro de `/relatorios/*`.

---

## 🔴 Em Aberto — LivroCaixa ID=1 / ContasPagar ID=1 sem conta/plano_contas

**Status:** aguardando confirmação das clientes sobre qual conta foi usada.

### O problema

`LivroCaixa ID=1` e `ContasPagar ID=1` foram criados em **23/04/2026** (antes da
Fase 10 ser deployada em 25/04/2026). O signal da época não preenchia os campos
`conta` e `plano_contas`. Resultado: aparecem como `—` no Livro Caixa.

```
LivroCaixa ID=1
  historico:    Pagamento: Aluguel
  data:         23/04/2026
  valor:        R$ 600,00
  tipo:         saida
  conta:        None  ← precisa corrigir
  plano_contas: None  ← precisa corrigir

ContasPagar ID=1
  desc:         Aluguel
  valor:        R$ 600,00
  status:       pago
  conta:        None  ← precisa corrigir
  plano_contas: None  ← precisa corrigir
  vencimento:   25/04/2026
  pagamento:    20/04/2026
```

### Por que não aparece em Contas a Pagar

O ContasPagar ID=1 existe e NÃO está soft-deleted. Não aparece porque `pag_status=pago`.
Para visualizar: ir em Contas a Pagar → filtro **Todos os status**.

### Opções disponíveis para correção

**Contas:**
- ID=1 → Conta Corrente Mercado Pago
- ID=2 → Poupança Mercado Pago
- ID=3 → Caixa Físico

**Plano de Contas:**
- ID=8 → `2.1.1 Aluguel` (despesa_operacional) ← mais provável

### Passos para corrigir (quando confirmado)

```python
# 1. Hard-delete do LivroCaixa ID=1 (imutável — não tem soft-delete aqui)
from apps.financeiro.models import LivroCaixa, ContasPagar, Conta, PlanoContas
LivroCaixa.objects.filter(pk=1).delete()

# 2. Atualizar ContasPagar ID=1 com conta e plano_contas corretos
# (usar update() para não disparar o signal novamente)
ContasPagar.objects.filter(pk=1).update(
    conta_id=1,           # ← confirmar qual conta
    plano_contas_id=8,    # Aluguel
)

# 3. Recriar LivroCaixa corretamente
from decimal import Decimal
from django.utils import timezone
LivroCaixa.objects.create(
    lica_historico='Pagamento: Aluguel',
    lica_data_lancamento='2026-04-23',
    lica_valor=Decimal('600.00'),
    lica_tipo_lancamento='saida',
    conta_id=1,           # ← confirmar qual conta
    plano_contas_id=8,    # Aluguel
    lcx_competencia='2026-04-01',
    created_by_id=...,    # user id da Giulia ou admin
)
```

> ⚠️ NÃO usar `save()` no ContasPagar (dispara signal e gera lançamento duplicado).
> Usar `QuerySet.update()` para atualizar sem disparar signal.

---

## Checklist Fase 14

- [x] Instrucoes_Claude_Code_Fase13.md criado
- [x] Fix layout mobile/tablet ContasReceberPage
- [x] Fix layout mobile/tablet ContasPagarPage
- [x] Dashboard redesign completo (Financeiro + Técnico)
- [x] Fix BottomBar — Relatórios apontava para rota inexistente
- [ ] **EM ABERTO:** LivroCaixa ID=1 / ContasPagar ID=1 — confirmar conta com clientes e corrigir

---

**🚀 Bora codar! Good luck, Claude Code!**

> ⚠️ SISTEMA EM PRODUÇÃO — confirmar com as clientes antes de alterar dados históricos.
