# Instrucoes_Claude_Code_Fase11.md
# Nos Studio Fluir — Uid Software
# Fase 11 — Melhorias e Correções

## ⚠️ ATENÇÃO — SISTEMA EM PRODUÇÃO

Seguir a ordem exata — não pular seções.
Testar cada seção antes de avançar.
```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro apps.operacional apps.tecnico --verbosity=2
```

> 🛑 **Ao concluir cada seção numerada, PARAR e perguntar ao usuário
> se deve continuar. Não iniciar próxima seção sem autorização.**

---

## Seção 1 — Pequenos e Médios (sem risco estrutural)

### 1.1 — Gráfico PSE: separar por modalidade

**Arquivo:** `GrafEvolucaoPsePage.jsx`
**Endpoint:** `GET /api/relatorios/evolucao-pse/`

**Problema:** PSE de Pilates e Funcional aparecem misturados no mesmo gráfico.

**Solução:** adicionar filtro de modalidade na página e no endpoint.

**Backend:**
```python
# Adicionar filtro no endpoint /api/relatorios/evolucao-pse/
modalidade = request.query_params.get('modalidade')
if modalidade:
    qs = qs.filter(aula__aul_modalidade=modalidade)
```

**Frontend:**
```jsx
// Adicionar toggle antes do gráfico
<div className="flex gap-2 mb-4">
    <button
        onClick={() => setModalidade('funcional')}
        className={modalidade === 'funcional' ? 'btn-active-cyan' : 'btn-outline'}
    >
        💪 Funcional
    </button>
    <button
        onClick={() => setModalidade('pilates')}
        className={modalidade === 'pilates' ? 'btn-active-purple' : 'btn-outline'}
    >
        🧘 Pilates
    </button>
    <button
        onClick={() => setModalidade(null)}
        className={!modalidade ? 'btn-active' : 'btn-outline'}
    >
        Todos
    </button>
</div>
```

→ Rodar testes ✅

---

### 1.2 — AulasPage: exibir FichaTreino

**Arquivo:** `AulasPage.jsx`
**Endpoint:** `GET /api/aulas/` — FK `fitr` já existe no model

**Problema:** `AulasPage` não exibe a ficha de treino usada na aula.

**Solução:** incluir `fitr_nome` no serializer e exibir na listagem:

**Backend — `AulasSerializer`:**
```python
fitr_nome = serializers.CharField(
    source='fitr.fitr_nome',
    read_only=True,
    default=None
)
```

**Frontend — linha da aula:**
```
Antes: Funcional Seg 17:00 | 08/04 | 3 alunos
Depois: Funcional Seg 17:00 | 08/04 | Fortalecimento Core | 3 alunos
```

Se `fitr` for null → exibir "Sem ficha" em tom suave.

→ Rodar testes ✅

---

### 1.3 — Aluno > Plano: nome compacto + dia pagamento

**Arquivo:** `AlunosPage.jsx` — seção de planos no detalhe do aluno

**Problema:** nome do plano longo ocupa muito espaço, dia de vencimento não aparece.

**Solução:** reformatar exibição do plano:

```
Antes:
"Funcional Mensal — R$ 150,00/mês  ✅ Ativo"

Depois:
"Funcional Mensal • dia 5 • R$ 150,00  ✅"
```

```jsx
// Componente de plano do aluno
<div className="flex items-center justify-between">
    <div>
        <span className="font-medium text-sm">{plano.serv_nome}</span>
        <span className="text-text-secondary text-xs ml-2">
            • dia {plano.aplano_dia_vencimento} • R$ {plano.aplano_valor}
        </span>
    </div>
    <Badge variant={plano.aplano_ativo ? 'success' : 'muted'}>
        {plano.aplano_ativo ? 'Ativo' : 'Inativo'}
    </Badge>
</div>
```

→ Rodar testes ✅

---

> 🛑 **PARAR — Perguntar ao usuário se deve continuar para a Seção 2.**

---

## Seção 2 — Reposições: Faltas Sem Justificativa

### 2.1 — Novo filtro na ReposicoesPage

**Arquivo:** `ReposicoesPage.jsx`

**Problema:** página mostra só créditos (disponível/usado/expirado).
Faltas sem justificativa ficam invisíveis — risco jurídico.

**Solução:** adicionar opção "Sem Justificativa" no filtro existente:

```
Filtro atual:    Todos | Disponível | Usado | Expirado
Filtro novo:     Todos | Disponível | Usado | Expirado | Sem Justificativa ← novo
```

---

### 2.2 — Listagem de faltas sem justificativa

Quando filtro = "Sem Justificativa":
- Buscar `MinistrarAula` com `miau_tipo_falta = 'sem_aviso'`
- **Não** buscar `CreditoReposicao` — são registros diferentes

**Novo endpoint:**
```
GET /api/faltas-sem-justificativa/
→ retorna MinistrarAula onde miau_tipo_falta = 'sem_aviso'
→ filtros: alu, turma, data
→ campos: aluno_nome, turma_nome, aula_data, aula_modalidade
```

**Layout da listagem:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ALUNO              │ TURMA           │ DATA     │ AÇÃO          │
├─────────────────────────────────────────────────────────────────┤
│ Maria Silva        │ Funcional 17h   │ 22/04    │ [Justificar]  │
│ João Santos        │ Pilates 18h     │ 20/04    │ [Justificar]  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2.3 — Modal de justificativa retroativa

Ao clicar `[Justificar]` → abre modal:

```
┌──────────────────────────────────────────┐
│ Justificar Falta — Maria Silva           │
│ Aula: Funcional 17h — 22/04/2026        │
├──────────────────────────────────────────┤
│ Tipo *                                   │
│ ○ Justificada  ○ Atestado Médico        │
│                                          │
│ Quando o aluno avisou? *                 │
│ [datetime-local input]                   │
│                                          │
│ Observações                              │
│ [textarea]                               │
│                                          │
│ ℹ️ Sistema calculará antecedência e      │
│    gerará crédito automaticamente        │
│    se dentro das regras.                 │
│                                          │
│ [✅ Justificar]  [Cancelar]              │
└──────────────────────────────────────────┘
```

**Ao confirmar:**
1. Cria `AvisoFalta` com `avi_data_hora_aviso` informado
2. Signal calcula antecedência → `avi_gera_credito`
3. Se gera crédito → `CreditoReposicao` criado automaticamente
4. `MinistrarAula.miau_tipo_falta` atualizado para `'justificada'`
5. Registro de auditoria: `updated_by` + `updated_at` preservados pelo `BaseModel`

**Proteção jurídica:** o `BaseModel` registra quem alterou e quando — rastreável. ✅

→ Rodar testes ✅

---

> 🛑 **PARAR — Perguntar ao usuário se deve continuar para a Seção 3.**

---

## Seção 3 — Repetição Automática: Contas a Pagar e Receber

### 3.1 — Campo de repetição no formulário

**Arquivos:** `ContasPagarPage.jsx`, `ContasReceberPage.jsx`

Ao cadastrar uma conta, adicionar seção opcional de repetição:

```
┌──────────────────────────────────────────┐
│ Repetição Automática                     │
│                                          │
│ Repetir? [✅ Sim]                        │
│                                          │
│ Quantidade:     [12] vezes               │
│ Periodicidade:  [Mensal ▼]               │
│                                          │
│ Preview:                                 │
│ • Venc. 05/05/2026 — R$ 1.200,00        │
│ • Venc. 05/06/2026 — R$ 1.200,00        │
│ • Venc. 05/07/2026 — R$ 1.200,00        │
│ ... e mais 9                             │
└──────────────────────────────────────────┘
```

---

### 3.2 — Backend: criação em lote

**Endpoint:** `POST /api/contas-pagar/` e `POST /api/contas-receber/`

Adicionar campo opcional `repeticao` no payload:

```python
# Serializer — campo extra não persistido
repeticao = serializers.DictField(required=False)
# {
#   "quantidade": 12,
#   "periodicidade": "mensal"  # mensal | trimestral | semestral
# }
```

**ViewSet — `perform_create`:**
```python
def perform_create(self, serializer):
    repeticao = self.request.data.get('repeticao')

    with transaction.atomic():
        # Salvar a primeira (normal)
        instance = serializer.save(
            created_by=self.request.user,
            updated_by=self.request.user
        )

        if repeticao:
            quantidade = int(repeticao.get('quantidade', 1))
            periodicidade = repeticao.get('periodicidade', 'mensal')

            meses = {
                'mensal': 1,
                'trimestral': 3,
                'semestral': 6,
            }.get(periodicidade, 1)

            for i in range(1, quantidade):
                # Calcular próximo vencimento
                nova_data = instance.cpa_data_vencimento + relativedelta(months=meses * i)

                # Clonar o registro com nova data
                novo = ContasPagar(
                    forn=instance.forn,
                    cpa_nome_credor=instance.cpa_nome_credor,
                    cpa_tipo=instance.cpa_tipo,
                    cpa_descricao=instance.cpa_descricao,
                    cpa_valor_total=instance.cpa_valor_total,
                    cpa_data_vencimento=nova_data,
                    cpa_status='pendente',
                    conta=instance.conta,
                    plano_contas=instance.plano_contas,
                    created_by=self.request.user,
                    updated_by=self.request.user,
                )
                novo.save()
```

> ⚠️ Usar `python-dateutil` (`relativedelta`) para calcular meses corretamente
> (respeitando meses com 28/29/30/31 dias).
> Verificar se já está em `requirements.txt` — se não, adicionar.

---

### 3.3 — Preview no frontend

Antes de salvar, exibir preview das datas calculadas:

```jsx
// Calcular preview client-side ao preencher quantidade/periodicidade
const gerarPreview = () => {
    const datas = []
    for (let i = 0; i < quantidade; i++) {
        const data = addMonths(dataVencimento, i * meses)
        datas.push(data)
    }
    return datas
}

// Exibir só os 3 primeiros + "e mais N"
{preview.slice(0, 3).map((data, i) => (
    <p key={i} className="text-xs text-text-secondary">
        • Venc. {format(data, 'dd/MM/yyyy')} — R$ {valor}
    </p>
))}
{preview.length > 3 && (
    <p className="text-xs text-text-secondary">
        ... e mais {preview.length - 3}
    </p>
)}
```

→ Rodar testes ✅

---

> 🛑 **PARAR — Perguntar ao usuário se deve continuar para a Seção 4.**

---

## Seção 4 — Carrinho de Pedidos

> ⚠️ Esta é a seção mais complexa — reestrutura a `PedidosPage` completamente.
> Só iniciar após Seções 1, 2 e 3 testadas e validadas em produção.

### 4.1 — Layout com carrinho lateral

**Arquivo:** `PedidosPage.jsx`

**Substituir** formulário atual de itens por experiência de carrinho:

```
┌───────────────────────────────┬─────────────────────────┐
│ PRODUTOS E SERVIÇOS           │ 🛒 CARRINHO             │
├───────────────────────────────┤─────────────────────────┤
│ [🔍 Buscar...]                │ Cliente:                │
│                               │ [Maria Silva ▼]         │
│ 💪 Produtos                   │─────────────────────────│
│ Squeeze          R$30  [+]   │ Squeeze x2    R$ 60,00  │
│ Camiseta M       R$45  [+]   │ Func. Mensal  R$150,00  │
│ Elástico         R$25  [+]   │─────────────────────────│
│                               │ Total: R$ 210,00        │
│ 🎯 Serviços                   │                         │
│ Avaliação        R$70  [+]   │ Forma: [PIX ▼]          │
│ Consultoria      R$120 [+]   │ ○ À vista                │
│                               │ ○ Futuro                 │
│ 📋 Planos                     │                         │
│ Func. Mensal    R$150  [+]   │ [🧾 Recibo]             │
│ Pilates Mensal  R$170  [+]   │ [✅ Confirmar]           │
└───────────────────────────────┴─────────────────────────┘
```

---

### 4.2 — Componente CarrinhoItem

```jsx
const CarrinhoItem = ({ item, onAumentar, onDiminuir, onRemover }) => (
    <div className="flex items-center justify-between py-1">
        <span className="text-sm truncate flex-1">{item.descricao}</span>
        <div className="flex items-center gap-1 ml-2">
            <button onClick={onDiminuir} className="w-5 h-5 ...">-</button>
            <span className="text-xs w-4 text-center">{item.quantidade}</span>
            <button onClick={onAumentar} className="w-5 h-5 ...">+</button>
        </div>
        <span className="text-sm ml-2 w-20 text-right">
            R$ {item.valor_total}
        </span>
        <button onClick={onRemover} className="ml-1 text-red-400">
            <X size={12} />
        </button>
    </div>
)
```

---

### 4.3 — Estado do carrinho (Zustand ou useState)

```jsx
// Estado local — carrinho não persiste entre sessões
const [carrinho, setCarrinho] = useState([])

const adicionarItem = (item) => {
    setCarrinho(prev => {
        const existente = prev.find(i => i.id === item.id && i.tipo === item.tipo)
        if (existente) {
            return prev.map(i =>
                i.id === item.id && i.tipo === item.tipo
                    ? { ...i, quantidade: i.quantidade + 1,
                              valor_total: (i.quantidade + 1) * i.valor_unitario }
                    : i
            )
        }
        return [...prev, { ...item, quantidade: 1, valor_total: item.valor_unitario }]
    })
}

const removerItem = (id, tipo) => {
    setCarrinho(prev => prev.filter(i => !(i.id === id && i.tipo === tipo)))
}

const total = carrinho.reduce((acc, i) => acc + i.valor_total, 0)
```

---

### 4.4 — Responsivo mobile

No mobile o carrinho fica em drawer/modal na parte inferior:

```
Mobile:
┌─────────────────────────────┐
│ [🔍 Buscar...]              │
│ Squeeze         R$30  [+]  │
│ Camiseta M      R$45  [+]  │
│ ...                         │
├─────────────────────────────┤
│ 🛒 2 itens — R$ 210,00 [▲] │ ← barra fixa inferior
└─────────────────────────────┘

Ao clicar na barra → abre drawer com carrinho completo
```

---

### 4.5 — Backend sem alteração

O backend de `Pedido` e `PedidoItem` não muda — só o frontend.
O payload enviado ao confirmar continua o mesmo:

```json
{
    "alu": 1,
    "ped_forma_pagamento": "pix",
    "ped_pagamento_futuro": false,
    "conta": 1,
    "itens": [
        {"item_tipo": "produto", "prod": 1, "item_quantidade": 2},
        {"item_tipo": "plano", "aplano": 3, "item_quantidade": 1}
    ]
}
```

→ Rodar testes ✅

---

> 🛑 **PARAR — Perguntar ao usuário se deve continuar. Seção 4 concluída.**

---

## Checklist Fase 11

### Seção 1 — Pequenos:
- [ ] 1.1 Gráfico PSE filtrado por modalidade
- [ ] 1.2 FichaTreino exibida na AulasPage
- [ ] 1.3 Plano do aluno: nome compacto + dia vencimento
- [ ] Testes passando ✅

### Seção 2 — Reposições:
- [ ] 2.1 Filtro "Sem Justificativa" na ReposicoesPage
- [ ] 2.2 Endpoint + listagem de faltas sem justificativa
- [ ] 2.3 Modal de justificativa retroativa com auditoria
- [ ] Testes passando ✅

### Seção 3 — Repetição automática:
- [ ] 3.1 Campo repetição no formulário (pagar e receber)
- [ ] 3.2 Backend criação em lote com relativedelta
- [ ] 3.3 Preview das datas no frontend
- [ ] Testes passando ✅

### Seção 4 — Carrinho:
- [ ] 4.1 Layout carrinho lateral
- [ ] 4.2 Componente CarrinhoItem
- [ ] 4.3 Estado do carrinho
- [ ] 4.4 Responsivo mobile (drawer)
- [ ] 4.5 Backend sem alteração
- [ ] Testes passando ✅

---

**🚀 Bora codar! Good luck, Claude Code!**

> ⚠️ SISTEMA EM PRODUÇÃO — autorização obrigatória antes de cada seção.
