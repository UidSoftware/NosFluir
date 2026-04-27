# Instrucoes_Claude_Code_Fase10_RefatorFinan.md
# Nos Studio Fluir — Uid Software
# Fase 10 — Refatoração Financeira Completa

## ⚠️ ATENÇÃO — SISTEMA EM PRODUÇÃO

Seguir a ordem exata — não pular partes.
Testar cada parte antes de avançar.
```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro apps.operacional apps.tecnico --verbosity=2
```

**Pré-requisito:** Fase 9 concluída ✅

---

## Visão Geral

```
Parte A — Estrutura base (Conta + PlanoContas)
Parte B — ContasReceber refatorada
Parte C — ContasPagar refatorada
Parte D — LivroCaixa refatorado
Parte E — Pedido (vendas)
Parte F — Relatórios (DRE + Fluxo de Caixa)
```

> ⚠️ Ao concluir cada parte, **perguntar ao usuário se deve continuar**
> antes de iniciar a próxima. Respeitar limite de tokens.

---

## PARTE A — Estrutura Base

### A.1 — Model `Conta`

```python
class Conta(BaseModel):
    TIPO_CHOICES = [
        ('corrente',  'Conta Corrente'),
        ('poupanca',  'Poupança'),
        ('caixa',     'Caixa Físico'),
    ]

    cont_nome           = models.CharField(max_length=100)
    # ex: "Conta Corrente Mercado Pago", "Poupança MP", "Caixa"

    cont_tipo           = models.CharField(max_length=20, choices=TIPO_CHOICES)
    cont_saldo_inicial  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cont_ativo          = models.BooleanField(default=True)

    class Meta:
        db_table = 'conta'
        verbose_name = 'Conta'
        verbose_name_plural = 'Contas'
        ordering = ['cont_nome']

    def __str__(self):
        return f"{self.cont_nome} ({self.get_cont_tipo_display()})"
```

**App:** `financeiro`
**Endpoint:** `/api/contas/`
**Permissão:** Admin/Financeiro

**Dados iniciais (fixtures):**
```python
# Criar via fixture ou migration de dados:
Conta(cont_nome='Conta Corrente Mercado Pago', cont_tipo='corrente')
Conta(cont_nome='Poupança Mercado Pago',        cont_tipo='poupanca')
Conta(cont_nome='Caixa Físico',                 cont_tipo='caixa')
```

---

### A.2 — Model `PlanoContas`

Classificação contábil de todos os movimentos financeiros.

```python
class PlanoContas(BaseModel):
    TIPO_CHOICES = [
        ('receita_operacional',      'Receita Operacional'),
        ('receita_nao_operacional',  'Receita Não Operacional'),
        ('despesa_operacional',      'Despesa Operacional'),
        ('despesa_nao_operacional',  'Despesa Não Operacional'),
        ('transferencia',            'Transferência'),
    ]

    plc_codigo      = models.CharField(max_length=20, unique=True)
    # ex: 1.1.1, 1.1.2, 2.1.1

    plc_nome        = models.CharField(max_length=100)
    # ex: "Mensalidades", "Aluguel", "Taxas Bancárias"

    plc_tipo        = models.CharField(max_length=30, choices=TIPO_CHOICES)
    plc_ativo       = models.BooleanField(default=True)

    class Meta:
        db_table = 'plano_contas'
        verbose_name = 'Plano de Contas'
        verbose_name_plural = 'Plano de Contas'
        ordering = ['plc_codigo']

    def __str__(self):
        return f"{self.plc_codigo} — {self.plc_nome}"
```

**App:** `financeiro`
**Endpoint:** `/api/plano-contas/`

**Dados iniciais:**
```
1.1.1  Mensalidades              receita_operacional
1.1.2  Avaliações Físicas        receita_operacional
1.1.3  Consultoria Online        receita_operacional
1.1.4  Personal                  receita_operacional
1.1.5  Venda de Produtos         receita_operacional
1.2.1  Rendimento Poupança       receita_nao_operacional
1.2.2  Outros Recebimentos       receita_nao_operacional
2.1.1  Aluguel                   despesa_operacional
2.1.2  Pró-labore                despesa_operacional
2.1.3  Material/Equipamento      despesa_operacional
2.1.4  Marketing                 despesa_operacional
2.1.5  Serviços Terceiros        despesa_operacional
2.2.1  Taxas Bancárias           despesa_nao_operacional
2.2.2  Multas                    despesa_nao_operacional
2.2.3  Outros                    despesa_nao_operacional
3.1.1  Transferência Entre Contas transferencia
```

---

### A.3 — Frontend — Configuração Financeira

**Rota:** `/financeiro/configuracao`
**Menu:** Finanças → Configuração

```
┌─────────────────────────────────────────────────────┐
│ Contas                                  [+ Nova]    │
├─────────────────────────────────────────────────────┤
│ Conta Corrente MP   corrente   ✅ ativa  [✏️][🗑️]  │
│ Poupança MP         poupança   ✅ ativa  [✏️][🗑️]  │
│ Caixa Físico        caixa      ✅ ativa  [✏️][🗑️]  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Plano de Contas                         [+ Novo]    │
├─────────────────────────────────────────────────────┤
│ 1.1.1  Mensalidades       Rec. Operacional  [✏️]   │
│ 1.1.2  Avaliações         Rec. Operacional  [✏️]   │
│ 2.1.1  Aluguel            Desp. Operacional [✏️]   │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

---

### A.4 — Testes Parte A

```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro --verbosity=2
```

✅ Todos passando antes de continuar.

---

> 🛑 **PARAR AQUI — Perguntar ao usuário se deve continuar para a Parte B.**

---

## PARTE B — ContasReceber Refatorada

### B.1 — Alterações no model `ContasReceber`

**Adicionar campos:**
```python
TIPO_CHOICES = [
    ('mensalidade',  'Mensalidade'),
    ('avaliacao',    'Avaliação Física'),
    ('consultoria',  'Consultoria Online'),
    ('personal',     'Personal'),
    ('produto',      'Venda de Produto'),
    ('rendimento',   'Rendimento'),
    ('outros',       'Outros'),
]

rec_tipo     = models.CharField(max_length=20, choices=TIPO_CHOICES, null=True, blank=True)
plano_contas = models.ForeignKey(
    'PlanoContas',
    on_delete=models.PROTECT,
    null=True, blank=True,
    related_name='contas_receber'
)
conta = models.ForeignKey(
    'Conta',
    on_delete=models.PROTECT,
    null=True, blank=True,
    related_name='contas_receber'
)
# em qual conta o dinheiro vai entrar

rec_nome_pagador = models.CharField(max_length=200, null=True, blank=True)
# preenchido quando não é aluno cadastrado
```

**Tornar `alu` nullable:**
```python
# Antes:
alu = models.ForeignKey('operacional.Aluno', on_delete=models.PROTECT)

# Depois:
alu = models.ForeignKey(
    'operacional.Aluno',
    on_delete=models.PROTECT,
    null=True, blank=True
)
```

**Validação inteligente no serializer:**
```python
def validate(self, data):
    tipos_com_aluno = ['mensalidade', 'avaliacao', 'consultoria', 'personal']
    if data.get('rec_tipo') in tipos_com_aluno and not data.get('alu'):
        raise serializers.ValidationError(
            {'alu': 'Aluno obrigatório para este tipo de receita.'}
        )
    if not data.get('alu') and not data.get('rec_nome_pagador'):
        raise serializers.ValidationError(
            {'rec_nome_pagador': 'Informe o nome do pagador quando não há aluno.'}
        )
    return data
```

---

### B.2 — Frontend ContasReceber — Visão por meses

**Substituir lista simples por visão agrupada por mês:**

```
┌─────────────────────────────────────────────────────┐
│ Contas a Receber        [Filtro ▼]  [+ Nova]        │
├─────────────────────────────────────────────────────┤
│ Abril 2026                                          │
│ Maria Silva   Mensalidade  05/04  R$150  🔴Vencida [💰]│
│ João Santos   Mensalidade  05/04  R$170  🟡Pendente [💰]│
├─────────────────────────────────────────────────────┤
│ Maio 2026                                           │
│ Maria Silva   Mensalidade  05/05  R$150  🟡Pendente [💰]│
│ João Santos   Mensalidade  05/05  R$170  🔵Futuro  [💰]│
│ Ana Costa     Avaliação    10/05  R$ 70  🔵Futuro  [💰]│
├─────────────────────────────────────────────────────┤
│ Junho 2026                                          │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

**Legenda status:**
- 🔴 Vencida (data < hoje e não paga)
- 🟡 Pendente (vence hoje ou amanhã)
- 🔵 Futuro (vence em mais de 2 dias)
- ✅ Recebida

**Filtros:**
- Período: mês atual / 3 meses / 6 meses / livre
- Status: todos / pendente / vencida / recebida
- Tipo: mensalidade / avaliação / outros

**Busca: `GET /api/contas-receber/?ordering=rec_data_vencimento&periodo=6`**

---

### B.3 — Botão pagamento inline [💰]

Ao clicar `[💰]` → modal rápido sem precisar abrir edição:

```
┌─────────────────────────────────────┐
│ Confirmar Recebimento               │
│                                     │
│ Maria Silva — Mensalidade           │
│ R$ 150,00                          │
│                                     │
│ Data recebimento: [25/04/2026]      │
│ Forma:           [PIX        ▼]     │
│ Conta:           [C. Corrente MP ▼] │
│                                     │
│ [✅ Confirmar]    [Cancelar]        │
└─────────────────────────────────────┘
```

Ao confirmar:
- `rec_status = 'recebido'`
- `rec_data_recebimento = data selecionada`
- Signal gera lançamento no `LivroCaixa` automaticamente

---

### B.4 — Testes Parte B

```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro --verbosity=2
```

✅ Todos passando antes de continuar.

---

> 🛑 **PARAR AQUI — Perguntar ao usuário se deve continuar para a Parte C.**

---

## PARTE C — ContasPagar Refatorada

### C.1 — Alterações no model `ContasPagar`

**Adicionar campos:**
```python
TIPO_CHOICES = [
    ('aluguel',     'Aluguel'),
    ('prolabore',   'Pró-labore'),
    ('material',    'Material/Equipamento'),
    ('marketing',   'Marketing'),
    ('servico',     'Serviço Terceiro'),
    ('taxa',        'Taxa Bancária'),
    ('outros',      'Outros'),
]

cpa_tipo     = models.CharField(max_length=20, choices=TIPO_CHOICES, null=True, blank=True)
plano_contas = models.ForeignKey(
    'PlanoContas',
    on_delete=models.PROTECT,
    null=True, blank=True,
    related_name='contas_pagar'
)
conta = models.ForeignKey(
    'Conta',
    on_delete=models.PROTECT,
    null=True, blank=True,
    related_name='contas_pagar'
)
# de qual conta o dinheiro vai sair
```

**Tornar `forn` nullable:**
```python
forn = models.ForeignKey(
    'Fornecedor',
    on_delete=models.PROTECT,
    null=True, blank=True
)
cpa_nome_credor = models.CharField(max_length=200, null=True, blank=True)
# preenchido quando não tem fornecedor cadastrado
```

**Regra especial — Pró-labore:**
```python
# Pró-labore NÃO gera LivroCaixa automático via signal
# É registrado manualmente — igual FolhaPagamento
# Validar no signal: se cpa_tipo == 'prolabore' → não gerar lançamento
```

---

### C.2 — Frontend ContasPagar — Visão por meses

Mesmo padrão do ContasReceber:

```
┌─────────────────────────────────────────────────────┐
│ Contas a Pagar          [Filtro ▼]  [+ Nova]        │
├─────────────────────────────────────────────────────┤
│ Abril 2026                                          │
│ Aluguel        25/04  R$1.200  🔴Vencida  [💸]     │
├─────────────────────────────────────────────────────┤
│ Maio 2026                                           │
│ Aluguel        25/05  R$1.200  🔵Futuro   [💸]     │
│ Pró-labore G   30/05  R$  800  🔵Futuro   [💸]     │
│ Pró-labore T   30/05  R$  800  🔵Futuro   [💸]     │
└─────────────────────────────────────────────────────┘
```

**Botão pagamento inline [💸]:**
```
┌─────────────────────────────────────┐
│ Confirmar Pagamento                 │
│                                     │
│ Aluguel — R$ 1.200,00              │
│                                     │
│ Data pagamento: [25/04/2026]        │
│ Forma:         [PIX         ▼]      │
│ Conta:         [C. Corrente MP ▼]   │
│                                     │
│ [✅ Confirmar]    [Cancelar]        │
└─────────────────────────────────────┘
```

---

### C.3 — Testes Parte C

```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro --verbosity=2
```

✅ Todos passando antes de continuar.

---

> 🛑 **PARAR AQUI — Perguntar ao usuário se deve continuar para a Parte D.**

---

## PARTE D — LivroCaixa Refatorado

### D.1 — Alterações no model `LivroCaixa`

> ⚠️ LivroCaixa é IMUTÁVEL — nunca editar/deletar registros existentes.
> Adicionar campos como nullable para não quebrar registros antigos.

**Adicionar campos:**
```python
TIPO_MOVIMENTO_CHOICES = [
    ('entrada',       'Entrada'),
    ('saida',         'Saída'),
    ('transferencia', 'Transferência'),
]

conta = models.ForeignKey(
    'Conta',
    on_delete=models.PROTECT,
    null=True, blank=True,
    related_name='lancamentos'
)
conta_destino = models.ForeignKey(
    'Conta',
    on_delete=models.PROTECT,
    null=True, blank=True,
    related_name='lancamentos_destino'
)
# preenchido apenas em transferências

plano_contas = models.ForeignKey(
    'PlanoContas',
    on_delete=models.PROTECT,
    null=True, blank=True,
    related_name='lancamentos'
)

lcx_tipo_movimento  = models.CharField(
    max_length=20,
    choices=TIPO_MOVIMENTO_CHOICES,
    null=True, blank=True
)
lcx_competencia     = models.DateField(null=True, blank=True)
# data do fato gerador — pode ser diferente da data do lançamento

lcx_documento       = models.CharField(max_length=100, null=True, blank=True)
# número do recibo, comprovante PIX, etc.
```

---

### D.2 — Transferência entre contas

Nova funcionalidade — gera 2 lançamentos no LivroCaixa:

```python
# apps/financeiro/views.py

@api_view(['POST'])
@permission_classes([IsFinanceiroOuAdmin])
def transferencia_entre_contas(request):
    conta_origem_id  = request.data.get('conta_origem')
    conta_destino_id = request.data.get('conta_destino')
    valor            = request.data.get('valor')
    data             = request.data.get('data')
    descricao        = request.data.get('descricao', 'Transferência entre contas')

    with transaction.atomic():
        plc = PlanoContas.objects.get(plc_codigo='3.1.1')

        # Lançamento saída na conta origem
        LivroCaixa.objects.create(
            lcx_tipo='saida',
            lcx_tipo_movimento='transferencia',
            lcx_historico=descricao,
            lcx_valor=valor,
            lcx_data=data,
            lcx_competencia=data,
            conta_id=conta_origem_id,
            conta_destino_id=conta_destino_id,
            plano_contas=plc,
            created_by=request.user,
            updated_by=request.user,
        )

        # Lançamento entrada na conta destino
        LivroCaixa.objects.create(
            lcx_tipo='entrada',
            lcx_tipo_movimento='transferencia',
            lcx_historico=descricao,
            lcx_valor=valor,
            lcx_data=data,
            lcx_competencia=data,
            conta_id=conta_destino_id,
            conta_destino_id=conta_origem_id,
            plano_contas=plc,
            created_by=request.user,
            updated_by=request.user,
        )

    return Response({'message': 'Transferência registrada com sucesso.'})
```

**Endpoint:** `POST /api/financeiro/transferencia/`

---

### D.3 — Atualizar signals existentes

Ao confirmar pagamento em ContasReceber e ContasPagar,
o signal já cria lançamento no LivroCaixa.
Atualizar para incluir `conta` e `plano_contas`:

```python
# Signal ContasReceber — ao pagar:
LivroCaixa.objects.create(
    ...
    conta=instance.conta,           # ← adicionar
    plano_contas=instance.plano_contas,  # ← adicionar
    lcx_tipo_movimento='entrada',   # ← adicionar
    lcx_competencia=instance.rec_data_vencimento,  # ← adicionar
)

# Signal ContasPagar — ao pagar:
# Se cpa_tipo == 'prolabore' → NÃO criar lançamento automático
if instance.cpa_tipo != 'prolabore':
    LivroCaixa.objects.create(
        ...
        conta=instance.conta,
        plano_contas=instance.plano_contas,
        lcx_tipo_movimento='saida',
        lcx_competencia=instance.cpa_data_vencimento,
    )
```

---

### D.4 — Frontend — Transferência entre contas

**Rota:** `/financeiro/transferencia`
**Menu:** Finanças → Transferência

```
┌─────────────────────────────────────┐
│ Transferência Entre Contas          │
│                                     │
│ De:    [Conta Corrente MP ▼]        │
│ Para:  [Poupança MP       ▼]        │
│ Valor: [R$ ____________]            │
│ Data:  [25/04/2026]                 │
│ Desc.: [Reserva mensal]             │
│                                     │
│ [Registrar Transferência]           │
└─────────────────────────────────────┘
```

---

### D.5 — Testes Parte D

```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro --verbosity=2
```

✅ Todos passando antes de continuar.

---

> 🛑 **PARAR AQUI — Perguntar ao usuário se deve continuar para a Parte E.**

---

## PARTE E — Pedido (Vendas)

### E.1 — Model `Produto`

```python
class Produto(BaseModel):
    prod_nome            = models.CharField(max_length=200)
    prod_descricao       = models.TextField(null=True, blank=True)
    prod_valor_venda     = models.DecimalField(max_digits=10, decimal_places=2)
    prod_estoque_atual   = models.IntegerField(default=0)
    prod_estoque_minimo  = models.IntegerField(default=5)
    # alerta no dashboard quando estoque < mínimo
    prod_ativo           = models.BooleanField(default=True)

    class Meta:
        db_table = 'produto'
        verbose_name = 'Produto'
        verbose_name_plural = 'Produtos'
        ordering = ['prod_nome']

    def __str__(self):
        return f"{self.prod_nome} (estoque: {self.prod_estoque_atual})"
```

**App:** `financeiro`
**Endpoint:** `/api/produtos/`

---

### E.2 — Model `Pedido`

```python
class Pedido(BaseModel):
    STATUS_CHOICES = [
        ('pendente',   'Pendente'),
        ('pago',       'Pago'),
        ('cancelado',  'Cancelado'),
    ]
    FORMA_CHOICES = [
        ('pix',        'PIX'),
        ('dinheiro',   'Dinheiro'),
        ('cartao',     'Cartão'),
        ('boleto',     'Boleto'),
    ]

    alu = models.ForeignKey(
        'operacional.Aluno',
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='pedidos'
    )
    ped_nome_cliente    = models.CharField(max_length=200, null=True, blank=True)
    # preenchido quando não é aluno cadastrado

    ped_numero          = models.CharField(max_length=20, unique=True)
    # gerado automaticamente: PED-0001, PED-0002...

    ped_data            = models.DateField()
    ped_total           = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    ped_forma_pagamento = models.CharField(max_length=20, choices=FORMA_CHOICES)
    ped_status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    ped_pagamento_futuro = models.BooleanField(default=False)
    # True → gera ContasReceber em vez de LivroCaixa direto

    conta = models.ForeignKey(
        'Conta',
        on_delete=models.PROTECT,
        null=True, blank=True
    )
    ped_observacoes     = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'pedido'
        verbose_name = 'Pedido'
        verbose_name_plural = 'Pedidos'
        ordering = ['-ped_data', '-ped_numero']

    def save(self, *args, **kwargs):
        if not self.ped_numero:
            ultimo = Pedido.objects.order_by('-ped_numero').first()
            if ultimo and ultimo.ped_numero:
                num = int(ultimo.ped_numero.split('-')[1]) + 1
            else:
                num = 1
            self.ped_numero = f"PED-{num:04d}"
        super().save(*args, **kwargs)
```

---

### E.3 — Model `PedidoItem`

```python
class PedidoItem(BaseModel):
    TIPO_CHOICES = [
        ('produto',  'Produto'),
        ('servico',  'Serviço'),
        ('plano',    'Plano'),
    ]

    pedido              = models.ForeignKey(
        'Pedido',
        on_delete=models.PROTECT,
        related_name='itens'
    )
    item_tipo           = models.CharField(max_length=20, choices=TIPO_CHOICES)

    prod = models.ForeignKey(
        'Produto',
        on_delete=models.PROTECT,
        null=True, blank=True
    )
    serv = models.ForeignKey(
        'ServicoProduto',
        on_delete=models.PROTECT,
        null=True, blank=True
    )
    aplano = models.ForeignKey(
        'AlunoPlano',
        on_delete=models.PROTECT,
        null=True, blank=True
    )

    item_descricao      = models.CharField(max_length=200)
    item_quantidade     = models.IntegerField(default=1)
    item_valor_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    item_valor_total    = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'pedido_item'
        verbose_name = 'Item do Pedido'
        verbose_name_plural = 'Itens do Pedido'
```

---

### E.4 — Signal ao confirmar Pedido

```python
@receiver(post_save, sender=Pedido)
def processar_pedido(sender, instance, **kwargs):
    if instance.ped_status != 'pago':
        return

    with transaction.atomic():
        for item in instance.itens.all():

            # Produto → atualizar estoque
            if item.item_tipo == 'produto' and item.prod:
                item.prod.prod_estoque_atual -= item.item_quantidade
                item.prod.save(update_fields=['prod_estoque_atual'])

            # Plano → criar AlunoPlano se não existe
            if item.item_tipo == 'plano' and item.aplano:
                item.aplano.aplano_ativo = True
                item.aplano.save(update_fields=['aplano_ativo'])

        # Pagamento à vista → gera LivroCaixa
        if not instance.ped_pagamento_futuro:
            LivroCaixa.objects.create(
                lcx_tipo='entrada',
                lcx_tipo_movimento='entrada',
                lcx_historico=f"Pedido {instance.ped_numero}",
                lcx_valor=instance.ped_total,
                lcx_data=instance.ped_data,
                lcx_competencia=instance.ped_data,
                conta=instance.conta,
                created_by=instance.updated_by,
                updated_by=instance.updated_by,
            )
        else:
            # Pagamento futuro → gera ContasReceber
            ContasReceber.objects.create(
                alu=instance.alu,
                rec_nome_pagador=instance.ped_nome_cliente,
                rec_tipo='produto',
                rec_descricao=f"Pedido {instance.ped_numero}",
                rec_valor_total=instance.ped_total,
                rec_data_vencimento=instance.ped_data,
                rec_status='pendente',
                conta=instance.conta,
                created_by=instance.updated_by,
                updated_by=instance.updated_by,
            )
```

---

### E.5 — Alerta estoque mínimo no Dashboard

```python
# Endpoint:
GET /api/produtos/alertas-estoque/
# Retorna produtos onde prod_estoque_atual <= prod_estoque_minimo
```

```jsx
// Dashboard — card de alerta:
{produtosAbaixoMinimo.length > 0 && (
    <div className="bg-red-900/30 border border-red-500 rounded p-3">
        ⚠️ {produtosAbaixoMinimo.length} produto(s) com estoque baixo
        {produtosAbaixoMinimo.map(p => (
            <p key={p.id}>{p.prod_nome}: {p.prod_estoque_atual} unidades</p>
        ))}
    </div>
)}
```

---

### E.6 — Geração de Recibo PDF

```python
# Usar reportlab ou weasyprint
# Endpoint: GET /api/pedidos/{id}/recibo/
# Retorna PDF para download

# Estrutura do recibo:
# ┌─────────────────────────────────┐
# │ Studio Fluir                    │
# │ RECIBO #PED-0001                │
# │ Data: 25/04/2026                │
# ├─────────────────────────────────┤
# │ Cliente: Maria Silva            │
# │                                 │
# │ 2x Squeeze        R$  60,00    │
# │ 1x Funcional Men  R$ 150,00    │
# ├─────────────────────────────────┤
# │ TOTAL:            R$ 210,00    │
# │ Pagamento: PIX                  │
# └─────────────────────────────────┘
```

---

### E.7 — Frontend PedidoPage

**Rota:** `/financeiro/pedidos`

```
┌─────────────────────────────────────────────────────┐
│ Pedidos                                 [+ Novo]    │
├─────────────────────────────────────────────────────┤
│ PED-0003  Maria Silva   R$315  25/04  ✅Pago  [🧾] │
│ PED-0002  João Santos   R$150  24/04  ✅Pago  [🧾] │
│ PED-0001  —Ana Costa—   R$ 45  23/04  🟡Pend  [🧾] │
└─────────────────────────────────────────────────────┘
```

**Formulário Novo Pedido:**
```
Cliente: [Aluno ▼] ou [Nome livre]
Data:    [hoje]
Conta:   [Conta Corrente MP ▼]

Itens:                           [+ Adicionar Item]
[Tipo ▼] [Item ▼] [Qtd] [Valor unit.] [Total] [🗑️]
Produto   Squeeze   2     R$30,00      R$60,00
Plano     Func.Men  1     R$150,00     R$150,00

Total: R$ 210,00
Forma pagamento: [PIX ▼]
Pagamento: ○ À vista  ○ Futuro (gera conta a receber)

[🧾 Gerar Recibo]  [✅ Confirmar Pedido]
```

---

### E.8 — Testes Parte E

```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro --verbosity=2
```

✅ Todos passando antes de continuar.

---

> 🛑 **PARAR AQUI — Perguntar ao usuário se deve continuar para a Parte F.**

---

## PARTE F — Relatórios

### F.1 — DRE Simples

**Rota:** `/relatorios/dre`
**Filtro:** Mês/Ano ou período customizado

```
┌─────────────────────────────────────────────────────┐
│ DRE — Abril 2026                                    │
├─────────────────────────────────────────────────────┤
│ RECEITAS OPERACIONAIS                               │
│   Mensalidades              R$ 2.100,00            │
│   Avaliações Físicas        R$   210,00            │
│   Venda de Produtos         R$   315,00            │
│ Total Receitas Operacionais R$ 2.625,00            │
├─────────────────────────────────────────────────────┤
│ DESPESAS OPERACIONAIS                               │
│   Aluguel                  (R$ 1.200,00)           │
│   Pró-labore               (R$ 1.600,00)           │
│   Material                 (R$   150,00)           │
│ Total Despesas Operacionais(R$ 2.950,00)           │
├─────────────────────────────────────────────────────┤
│ RESULTADO OPERACIONAL      (R$   325,00) 🔴        │
├─────────────────────────────────────────────────────┤
│ RECEITAS NÃO OPERACIONAIS                           │
│   Rendimento Poupança       R$    12,00            │
├─────────────────────────────────────────────────────┤
│ RESULTADO LÍQUIDO          (R$   313,00) 🔴        │
└─────────────────────────────────────────────────────┘
```

**Endpoint:**
```
GET /api/relatorios/dre/?mes=4&ano=2026
→ agrupa LivroCaixa por plano_contas.plc_tipo
```

---

### F.2 — Fluxo de Caixa

**Rota:** `/relatorios/fluxo-caixa`
**Filtro:** 1, 3 ou 6 meses à frente / livre

```
┌─────────────────────────────────────────────────────┐
│ Fluxo de Caixa — Mai a Out 2026                    │
├──────────┬──────────┬──────────┬────────────────────┤
│ Mês      │ Entradas │ Saídas   │ Saldo Projetado    │
├──────────┼──────────┼──────────┼────────────────────┤
│ Maio     │ R$2.625  │ R$2.950  │ (R$325)            │
│ Junho    │ R$2.625  │ R$2.950  │ (R$325)            │
│ Julho    │ R$2.625  │ R$2.950  │ (R$325)            │
└──────────┴──────────┴──────────┴────────────────────┘
```

**Endpoint:**
```
GET /api/relatorios/fluxo-caixa/?meses=6
→ projeta ContasReceber pendentes + ContasPagar pendentes
→ por período selecionado
```

---

### F.3 — Extrato por Conta

**Rota:** `/relatorios/extrato`

```
┌─────────────────────────────────────────────────────┐
│ Extrato — Conta Corrente MP — Abril 2026            │
├─────────────────────────────────────────────────────┤
│ Saldo inicial:              R$ 1.500,00             │
├─────────────────────────────────────────────────────┤
│ 01/04 Mensalidade Maria     + R$  150,00            │
│ 05/04 Aluguel               - R$1.200,00            │
│ 10/04 Mensalidade João      + R$  170,00            │
│ 25/04 Transferência Poupança- R$  500,00            │
├─────────────────────────────────────────────────────┤
│ Saldo final:                R$  120,00              │
└─────────────────────────────────────────────────────┘
```

---

### F.4 — Testes Parte F

```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro --verbosity=2
```

✅ Todos passando — Fase 10 concluída! 🎉

---

## Checklist Geral Fase 10

### Parte A: ✅ COMPLETO (25/04/2026)
- [x] Model `Conta` + fixtures (3 contas iniciais via RunPython na migration 0005)
- [x] Model `PlanoContas` + fixtures (16 categorias via RunPython na migration 0005)
- [x] Frontend configuração financeira (`/financeiro/configuracao`)
- [x] Testes ✅

**Bug corrigido (26/04/2026):** `ConfiguracaoFinanceiraPage` fazia dupla extração de `.results` sobre o retorno do `useList` — ambas as seções mostravam "0 registros" mesmo com dados no banco. Corrigido para `const { data: contas, count: total, page, setPage } = useList(...)`.

### Parte B: ✅ COMPLETO (25/04/2026)
- [x] ContasReceber com tipo + categoria + conta + plano_contas
- [x] `alu` nullable com validação inteligente
- [x] Visão por meses (6 meses)
- [x] Botão pagamento inline com modal
- [x] Testes ✅

### Parte C: ✅ COMPLETO (25/04/2026)
- [x] ContasPagar com tipo + conta + plano_contas
- [x] `forn` nullable
- [x] Pró-labore sem lançamento automático
- [x] Visão por meses
- [x] Botão pagamento inline
- [x] Testes ✅

### Parte D: ✅ COMPLETO (25/04/2026)
- [x] LivroCaixa com conta + plano_contas + tipo_movimento + competencia
- [x] Transferência entre contas (2 lançamentos)
- [x] Signals atualizados
- [x] Frontend transferência (`/financeiro/transferencia`)
- [x] Testes ✅

### Parte E: ✅ COMPLETO (25/04/2026) + Refactor + Fixes (26/04/2026)
- [x] Model `Produto` com estoque
- [x] Model `Pedido` com número auto (PED-XXXX)
- [x] Model `PedidoItem`
- [x] Signal ao confirmar pedido (estoque + LivroCaixa ou ContasReceber)
- [x] Alerta estoque mínimo — endpoint `/api/produtos/alertas-estoque/`
- [ ] Recibo PDF — **PENDENTE**
- [x] Frontend PedidoPage (`/financas/pedidos`)
- [x] Testes ✅

**Refatoração ServicoProduto → Serviço + Produto separados (26/04/2026):**
- [x] Campo `serv_tipo` removido do model `ServicoProduto` (migration `0010_remove_servicoproduto_serv_tipo`)
- [x] `ServicoProduto` rebatizado para "Serviço" — verbose_name, `__str__`, serializer, view, admin, tests
- [x] Todas as referências "Serviço/Produto" removidas do frontend (ContasPagar, ContasReceber, Planos)
- [x] `ServicosPage` limpa — sem campo tipo, sem referência a produto
- [x] `ProdutosPage` criada — CRUD completo + badge de estoque baixo + alerta no topo
- [x] Sidebar: "Serviços/Produtos" → "Serviços" (ícone Wrench) + novo item "Produtos" (ícone Package)
- [x] Rota `/financas/produtos` adicionada em `routes/index.jsx`

**Bug corrigido — Pedidos: item tipo Plano não carregava select (26/04/2026):**
- [x] `getOpcoes('plano')` retornava `[]` — não tinha o caso implementado
- [x] Condição JSX `item.tipo !== 'plano'` forçava input de texto livre em vez do select
- [x] Adicionado fetch de `PlanosPagamentos` no `NovoPedidoForm`
- [x] Select de plano exibe: nome do serviço — tipo do plano — valor/mês

### Parte F: ✅ COMPLETO (25/04/2026)
- [x] DRE simples por período (`/relatorios/dre`)
- [x] Fluxo de Caixa projetado (`/relatorios/fluxo-caixa`)
- [x] Extrato por conta (`/relatorios/extrato`)
- [x] Testes ✅

---

**🚀 Bora codar! Good luck, Claude Code!**

> ⚠️ SISTEMA EM PRODUÇÃO — perguntar ao usuário antes de cada parte.
> Respeitar limite de tokens entre as partes.
