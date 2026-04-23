# Instrucoes_Claude_Code_Fase9.md
# Nos Studio Fluir — Uid Software
# Fase 9 — Refactor PlanosPagamentos + AlunoPlano

## ⚠️ ATENÇÃO — SISTEMA EM PRODUÇÃO

Seguir a ordem exata — não pular etapas.
Testar cada etapa antes de avançar.
```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro apps.operacional apps.tecnico --verbosity=2
```

**Pré-requisito:** Fase 8 concluída ✅

---

## Contexto

**Problema atual:**
`PlanosPagamentos` tem `alu_id` direto — um plano só pode ter um aluno.
Isso impede que o mesmo template de plano seja reutilizado por alunos diferentes
e dificulta relatórios, resumo na página do aluno e controle financeiro.

**Solução:**
Separar o template do plano do contrato individual do aluno via tabela intermediária.

```
ServicoProduto   → catálogo (o que existe pra vender)
PlanosPagamentos → template do plano (sem aluno)
AlunoPlano       → contrato individual (aluno + plano + datas)
ContasReceber    → cobrança vinculada ao AlunoPlano
```

**Casos reais:**
```
Aluno 1 → Funcional Mensal
Aluno 2 → Funcional Trimestral
Aluno 3 → Plano Fluir Trimestral
Aluno 4 → Avaliação + Funcional Mensal (2 planos ativos)
```

---

## ETAPA 1 — Criar tabela `AlunoPlano`

**App:** `financeiro`

```python
class AlunoPlano(BaseModel):
    aluno = models.ForeignKey(
        'operacional.Aluno',
        on_delete=models.PROTECT,
        related_name='planos'
    )
    plano = models.ForeignKey(
        'PlanosPagamentos',
        on_delete=models.PROTECT,
        related_name='alunos'
    )

    aplano_data_inicio   = models.DateField()
    aplano_data_fim      = models.DateField(null=True, blank=True)
    # null = plano por tempo indeterminado

    aplano_ativo         = models.BooleanField(default=True)

    aplano_observacoes   = models.TextField(null=True, blank=True)
    # necessidades específicas do aluno:
    # ex: "lesão no joelho — evitar agachamento profundo"

    class Meta:
        db_table = 'aluno_plano'
        verbose_name = 'Plano do Aluno'
        verbose_name_plural = 'Planos dos Alunos'
        ordering = ['-aplano_data_inicio']

    def __str__(self):
        return f"{self.aluno} — {self.plano} ({'ativo' if self.aplano_ativo else 'inativo'})"
```

**Endpoint:** `/api/aluno-plano/`
**Filtros:** `alu`, `plano`, `aplano_ativo`

**Migration:** `fase9_criar_aluno_plano`

---

## ETAPA 2 — Remover `alu_id` de `PlanosPagamentos`

Antes de remover, garantir que todos os dados foram migrados na Etapa 3.

```python
# Remover de PlanosPagamentos:
alu = models.ForeignKey(...)   # ← remover após data migration
plan_data_inicio = ...         # ← mover para AlunoPlano
plan_data_fim = ...            # ← mover para AlunoPlano
plan_ativo = ...               # ← mover para AlunoPlano
```

`PlanosPagamentos` fica como template limpo:
```python
class PlanosPagamentos(BaseModel):
    serv = models.ForeignKey(
        'ServicoProduto',
        on_delete=models.PROTECT,
        related_name='planos'
    )
    plan_tipo_plano    = models.CharField(max_length=20, choices=TIPO_CHOICES)
    plan_valor_plano   = models.DecimalField(max_digits=10, decimal_places=2)
    plan_dia_vencimento = models.IntegerField()
    # dia do mês para vencimento (1-31)

    class Meta:
        db_table = 'planos_pagamentos'
```

> ⚠️ Fazer esta migration APÓS a data migration da Etapa 3.

---

## ETAPA 3 — Data migration

Migrar dados existentes de `PlanosPagamentos` para `AlunoPlano`.

```python
# Migration de dados:

def migrate_planos(apps, schema_editor):
    PlanosPagamentos = apps.get_model('financeiro', 'PlanosPagamentos')
    AlunoPlano = apps.get_model('financeiro', 'AlunoPlano')

    for plano in PlanosPagamentos.objects.filter(alu__isnull=False):
        AlunoPlano.objects.get_or_create(
            aluno_id=plano.alu_id,
            plano=plano,
            defaults={
                'aplano_data_inicio': plano.plan_data_inicio or date.today(),
                'aplano_data_fim':    plano.plan_data_fim,
                'aplano_ativo':       plano.plan_ativo,
                'created_by_id':      plano.created_by_id,
                'updated_by_id':      plano.updated_by_id,
            }
        )
```

**Validar após migração:**
```python
# No Django shell:
from apps.financeiro.models import PlanosPagamentos, AlunoPlano

# Todos os planos com aluno devem ter AlunoPlano correspondente
planos_com_aluno = PlanosPagamentos.objects.filter(alu__isnull=False).count()
aluno_planos = AlunoPlano.objects.count()
print(f"Planos com aluno: {planos_com_aluno}")
print(f"AlunoPlanos criados: {aluno_planos}")
# devem ser iguais
```

---

## ETAPA 4 — Adicionar FK `aplano` em `ContasReceber`

Vincular cobrança ao contrato individual do aluno.

```python
# Adicionar em ContasReceber:
aplano = models.ForeignKey(
    'AlunoPlano',
    on_delete=models.SET_NULL,
    null=True, blank=True,
    related_name='cobranças'
)
# SET_NULL — se o plano for removido, a cobrança continua existindo
# nullable — cobranças avulsas (avaliação, etc.) não têm plano
```

**Migration:** `fase9_contasreceber_aplano_fk`

---

## ETAPA 5 — Atualizar Serializers e ViewSets

### `AlunoPlanoSerializer`:
```python
class AlunoPlanoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    alu_nome = serializers.CharField(source='aluno.alu_nome', read_only=True)
    plan_descricao = serializers.SerializerMethodField()

    def get_plan_descricao(self, obj):
        return f"{obj.plano.serv.serv_nome} — {obj.plano.get_plan_tipo_plano_display()}"

    class Meta:
        model = AlunoPlano
        fields = [
            'id', 'aplano_id', 'aluno', 'alu_nome',
            'plano', 'plan_descricao',
            'aplano_data_inicio', 'aplano_data_fim',
            'aplano_ativo', 'aplano_observacoes',
            'created_at', 'updated_at'
        ]
```

### `PlanosPagamentosSerializer` — remover campos migrados:
- Remover `alu`, `plan_data_inicio`, `plan_data_fim`, `plan_ativo` dos fields

### `ContasReceberSerializer` — adicionar `aplano`:
- Adicionar campo `aplano` (FK nullable)

---

## ETAPA 6 — Frontend

### 6.1 — PlanosPage — remover campo aluno

`PlanosPagamentos` vira catálogo limpo — sem campo de aluno no formulário.

```
┌─────────────────────────────────────────────────────┐
│ Planos de Pagamento                     [+ Novo]    │
├─────────────────────────────────────────────────────┤
│ Funcional Mensal        R$ 150,00   Dia 5   [✏️][🗑️]│
│ Funcional Trimestral    R$ 120,00   Dia 5   [✏️][🗑️]│
│ Pilates Mensal          R$ 170,00   Dia 5   [✏️][🗑️]│
│ Plano Fluir Mensal      R$ 300,00   Dia 5   [✏️][🗑️]│
└─────────────────────────────────────────────────────┘
```

### 6.2 — AlunosPage / AlunoDetails — seção Planos

Na página de detalhes do aluno, adicionar seção **Planos Ativos**:

```
┌─────────────────────────────────────────────────────┐
│ 📋 Planos Ativos                       [+ Vincular] │
├─────────────────────────────────────────────────────┤
│ Funcional Mensal — R$ 150,00/mês                    │
│ Início: 01/04/2026   Venc: dia 5   ✅ Ativo         │
│ Obs: lesão no joelho — evitar agachamento           │
│                                    [✏️] [Encerrar]  │
│                                                     │
│ Avaliação Física — R$ 70,00 (avulso)                │
│ Início: 15/03/2026                  ✅ Ativo         │
│                                    [✏️] [Encerrar]  │
└─────────────────────────────────────────────────────┘
```

**Formulário "Vincular Plano":**
```
Plano *           [select → lista PlanosPagamentos ativos]
Data Início *     [date]
Data Fim          [date, opcional]
Observações       [textarea]
```

### 6.3 — ContasReceberPage — campo AlunoPlano

Ao criar/editar ContasReceber:
- Ao selecionar o aluno → buscar planos ativos do aluno
- Campo `Plano` (opcional) aparece com os planos do aluno selecionado

```javascript
// Ao selecionar aluno:
const planosDoAluno = await api.get(
    `/api/aluno-plano/?alu=${aluId}&aplano_ativo=true`
)
// Mostrar select com os planos do aluno
```

### 6.4 — Relatório de Planos

**Rota:** `/relatorios/planos`
**Menu:** Relatórios → Planos

```
┌─────────────────────────────────────────────────────┐
│ Relatório de Planos                                 │
│ Filtros: [Plano ▼] [Status ▼] [Mês ▼]             │
├─────────────────────────────────────────────────────┤
│ 💪 Funcional Mensal — 8 alunos ativos               │
│   Maria Silva      Início: 01/03   Venc: dia 5      │
│   João Santos      Início: 15/03   Venc: dia 15     │
│   ...                                               │
├─────────────────────────────────────────────────────┤
│ 🧘 Pilates Mensal — 5 alunos ativos                 │
│   Ana Costa        Início: 01/04   Venc: dia 1      │
│   ...                                               │
└─────────────────────────────────────────────────────┘
```

---

## Ordem de execução obrigatória

```
ETAPA 1 — Criar AlunoPlano (migration)
         → Rodar testes ✅

ETAPA 2 — Preparar PlanosPagamentos (nullable temporário)
         → Rodar testes ✅

ETAPA 3 — Data migration (migrar dados existentes)
         → Validar no shell
         → Rodar testes ✅

ETAPA 4 — FK aplano em ContasReceber (nullable)
         → Rodar testes ✅

ETAPA 5 — Serializers e ViewSets atualizados
         → Rodar testes ✅

ETAPA 6 — Frontend
  6.1 PlanosPage — remover campo aluno
  6.2 AlunoDetails — seção Planos Ativos
  6.3 ContasReceber — campo AlunoPlano
  6.4 Relatório de Planos
         → Rodar testes ✅
```

---

## Regras de Negócio

| ID | Regra |
|---|---|
| RN-APLANO-01 | Aluno pode ter múltiplos planos ativos simultaneamente |
| RN-APLANO-02 | `aplano_data_fim` null = plano por tempo indeterminado |
| RN-APLANO-03 | Encerrar plano = setar `aplano_ativo=False` + `aplano_data_fim=hoje` |
| RN-APLANO-04 | ContasReceber avulsas (avaliação) não precisam de AlunoPlano |
| RN-APLANO-05 | `plan_dia_vencimento` em PlanosPagamentos define o dia de cobrança |
| RN-APLANO-06 | Relatório de planos agrupa por PlanosPagamentos mostrando alunos ativos |

---

## O que NÃO fazer

- ❌ Deletar `alu_id` de PlanosPagamentos antes da data migration
- ❌ Tornar `aplano` obrigatório em ContasReceber — cobranças avulsas existem
- ❌ `objeto.delete()` — soft delete via API
- ❌ Float para dinheiro — DECIMAL(10,2)
- ❌ `response.data` — sempre `response.data.results`
- ❌ Alterar `base: '/sistema/'` no vite.config.js
- ❌ Criar outro `CLAUDE.md`
- ❌ Comitar `.env`

---

## Checklist Fase 9

### Backend:
- [ ] Model `AlunoPlano` criado
- [ ] Serializer + ViewSet + endpoint `/api/aluno-plano/`
- [ ] Data migration — PlanosPagamentos → AlunoPlano
- [ ] Validação da data migration no shell
- [ ] `alu_id` removido de PlanosPagamentos
- [ ] FK `aplano` adicionada em ContasReceber (nullable)
- [ ] Testes passando ✅

### Frontend:
- [ ] PlanosPage — campo aluno removido (vira catálogo)
- [ ] AlunoDetails — seção Planos Ativos com CRUD
- [ ] ContasReceber — select de plano do aluno
- [ ] Relatório de Planos
- [ ] Testes passando ✅

---

**🚀 Bora codar! Good luck, Claude Code!**

> ⚠️ SISTEMA EM PRODUÇÃO — seguir a ordem exata, testar cada etapa.
