# Instrucoes_Claude_Code_Fase4.md
# Nos Studio Fluir — Uid Software
# Fase 4 — Refactor Estrutural: Aulas e MinistrarAula

## ⚠️ ATENÇÃO — SISTEMA EM PRODUÇÃO

Este refactor mexe em tabelas com dados reais.
**Seguir a ordem exata — não pular etapas.**
Rodar testes após cada etapa antes de avançar.

---

## Contexto

**Problema atual:**
- `Aulas` existe mas está subutilizada
- `MinistrarAula` carrega campos que pertencem à aula coletiva (hora início/fim)
- Estrutura não reflete corretamente a separação entre evento coletivo e participação individual

**Objetivo:**
Separar claramente:
- `Aulas` → o evento coletivo (1 registro por aula)
- `MinistrarAula` → participação individual de cada aluno (N registros por aula)

**Modelagem final:**

```
Aulas
├── aul_id
├── tur (FK → Turma)
├── aul_nome (manual)
├── aul_data (DATE)
├── aul_modalidade (pilates/funcional)
├── aul_hora_inicio (TIME)
├── aul_hora_final (TIME)
└── auditoria padrão

unique_together: [('tur', 'aul_data', 'aul_modalidade')]

MinistrarAula
├── miau_id
├── aula (FK → Aulas)            ← obrigatório ao final
├── alu (FK → Aluno)
├── func (FK → Funcionario)
├── fitr (FK → FichaTreino, nullable)
├── miau_pas_inicio (INTEGER)
├── miau_pad_inicio (INTEGER)
├── miau_fc_inicio (INTEGER)
├── miau_pas_final (INTEGER)
├── miau_pad_final (INTEGER)
├── miau_fc_final (INTEGER)
├── miau_pse (INTEGER 6-20)
├── miau_tipo_presenca
├── miau_tipo_falta
├── miau_observacoes (TEXT)
└── auditoria padrão

unique_together: [('aula', 'alu')]
```

---

## ETAPA 1 — Criar sem quebrar o existente

### 1.1 — Adicionar campos em `Aulas`

```python
# Adicionar em Aulas (já existe a tabela):
aul_hora_inicio = models.TimeField(null=True, blank=True)  # nullable por ora
aul_hora_final  = models.TimeField(null=True, blank=True)  # nullable por ora
```

> `aul_nome`, `aul_data`, `aul_modalidade`, `tur` já existem — não recriar.

**Migration:** `0001_fase4_adicionar_hora_aulas`

---

### 1.2 — Garantir que FK `aula` em `MinistrarAula` é nullable

```python
# Em MinistrarAula — confirmar que está assim:
aula = models.ForeignKey(
    'Aulas',
    on_delete=models.PROTECT,
    null=True, blank=True,       # nullable durante migração
    related_name='registros'
)
```

Se já está nullable desde a Fase 7.3 — sem migration necessária aqui.

---

### 1.3 — Rodar testes

```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro apps.operacional apps.tecnico --verbosity=2
```

✅ Todos passando antes de prosseguir.

---

## ETAPA 2 — Migrar dados existentes

### 2.1 — Data migration

Criar migration de dados que:

1. Agrupa registros de `MinistrarAula` por `(tur_id, miau_data, miau_tipo_presenca→modalidade)`

> ⚠️ `MinistrarAula` não tem `miau_data` direto — verificar como a data está armazenada atualmente. Se estiver via FK `aula`, já está vinculada. Se não, usar `created_at.date()` como fallback.

2. Para cada grupo → criar 1 registro em `Aulas`:
```python
aula, created = Aulas.objects.get_or_create(
    tur_id=tur_id,
    aul_data=data,
    aul_modalidade=modalidade,
    defaults={
        'aul_nome': f"{turma.tur_nome} — {data}",
        'aul_hora_inicio': primeiro_registro.miau_hora_inicio,
        'aul_hora_final': primeiro_registro.miau_hora_final,
        'created_by_id': primeiro_registro.created_by_id,
        'updated_by_id': primeiro_registro.updated_by_id,
    }
)
```

3. Vincular todos os `MinistrarAula` do grupo ao `Aulas` criado:
```python
MinistrarAula.objects.filter(
    tur_id=tur_id,
    miau_hora_inicio__date=data  # ajustar conforme estrutura real
).update(aula=aula)
```

**Migration:** `0002_fase4_data_migration_aulas`

---

### 2.2 — Validar dados migrados

Após rodar a data migration, verificar:

```python
# No Django shell ou em um management command:

# 1. Nenhum MinistrarAula sem FK aula
sem_aula = MinistrarAula.objects.filter(aula__isnull=True).count()
print(f"MinistrarAula sem aula: {sem_aula}")  # deve ser 0

# 2. Todas as Aulas têm pelo menos 1 MinistrarAula
from django.db.models import Count
aulas_vazias = Aulas.objects.annotate(
    total=Count('registros')
).filter(total=0).count()
print(f"Aulas sem registros: {aulas_vazias}")  # deve ser 0

# 3. Horas migradas corretamente
sem_hora = Aulas.objects.filter(aul_hora_inicio__isnull=True).count()
print(f"Aulas sem hora: {sem_hora}")  # deve ser 0
```

✅ Validar no Django Admin também — conferir visualmente alguns registros.

---

### 2.3 — Rodar testes

```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro apps.operacional apps.tecnico --verbosity=2
```

✅ Todos passando antes de prosseguir.

---

## ETAPA 3 — Modificar backend e frontend

### 3.1 — Tornar FK `aula` obrigatória em `MinistrarAula`

```python
# Remover null=True, blank=True
aula = models.ForeignKey(
    'Aulas',
    on_delete=models.PROTECT,
    related_name='registros'     # obrigatório agora
)
```

**Migration:** `0003_fase4_aula_obrigatoria`

---

### 3.2 — Adicionar unique_together

```python
# Em Aulas:
class Meta:
    unique_together = [('tur', 'aul_data', 'aul_modalidade')]

# Em MinistrarAula:
class Meta:
    unique_together = [('aula', 'alu')]
```

**Migration:** `0004_fase4_unique_together`

---

### 3.3 — Atualizar serializers

**`AulasSerializer`** — adicionar campos novos:
```python
fields = [
    'id', 'aul_id', 'tur', 'aul_nome', 'aul_data',
    'aul_modalidade', 'aul_hora_inicio', 'aul_hora_final',
    'total_presentes', 'total_faltas', 'total_registros',  # contadores existentes
    'created_at', 'updated_at'
]
```

**`MinistrarAulaSerializer`** — remover campos de hora (migrados para Aulas):
- Remover `miau_hora_inicio` e `miau_hora_final` dos fields
- Adicionar campo `aula` como obrigatório

---

### 3.4 — Atualizar ViewSets

**`AulasViewSet`:**
- Filtros: `tur`, `aul_modalidade`, `aul_data`
- Permitir criar `Aulas` com `aul_hora_inicio` e `aul_hora_final`

**`MinistrarAulaViewSet`:**
- Remover lógica de hora início/fim (agora em Aulas)
- Ao criar `MinistrarAula`, exigir FK `aula`
- Fluxo: criar `Aulas` primeiro → depois criar registros `MinistrarAula`

---

### 3.5 — Atualizar frontend

**`MinistrarAulaPage.jsx`:**

Novo fluxo da tela:

**Tela 1 — Configurar Aula:**
- Seleciona Turma, Professor, Ficha, Data, Hora Início
- Clica "Iniciar Aula" → POST `/api/aulas/` (cria o registro coletivo)
- Guarda `aul_id` retornado no estado

**Tela 2 — Registro por aluno:**
- Lista alunos da turma
- Coleta PAS/PAD/FC início por aluno
- 1 hora de aula...
- Coleta PAS/PAD/FC final + PSE + presença + observações por aluno
- "Finalizar Aula" → PATCH `/api/aulas/{aul_id}/` com hora_final
- POST `/api/ministrar-aula/` para cada aluno com FK `aula: aul_id`

**`AulasPage.jsx`:**
- Atualizar para exibir `aul_hora_inicio` e `aul_hora_final` da nova estrutura

---

### 3.6 — Rodar testes + adicionar novos testes

```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro apps.operacional apps.tecnico --verbosity=2
```

Adicionar testes para:
- Criar `Aulas` com unique_together — impedir duplicata
- Criar `MinistrarAula` sem FK `aula` — deve falhar
- `MinistrarAula` com mesmo aluno na mesma aula — deve falhar (unique)
- Data migration — verificar integridade

✅ Todos passando antes de prosseguir para Etapa 4.

---

## ETAPA 4 — Deletar o que não é mais necessário

> ⚠️ Só executar após Etapa 3 validada e testada em produção por pelo menos 1 aula real.

### 4.1 — Remover campos de hora de `MinistrarAula`

```python
# Remover de MinistrarAula:
miau_hora_inicio   # migrado para Aulas.aul_hora_inicio
miau_hora_final    # migrado para Aulas.aul_hora_final
```

**Migration:** `0005_fase4_remover_hora_ministraraula`

---

### 4.2 — Rodar testes finais

```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro apps.operacional apps.tecnico --verbosity=2
```

✅ Todos passando — refactor concluído.

---

## Ordem de execução obrigatória

```
ETAPA 1 — Criar sem quebrar
  1.1 Adicionar hora em Aulas (nullable)
  1.2 Confirmar FK aula nullable em MinistrarAula
  1.3 Rodar testes ✅

ETAPA 2 — Migrar dados
  2.1 Data migration (agrupar + criar Aulas + vincular miau)
  2.2 Validar no shell e no Admin
  2.3 Rodar testes ✅

ETAPA 3 — Modificar
  3.1 FK aula obrigatória
  3.2 unique_together
  3.3 Serializers atualizados
  3.4 ViewSets atualizados
  3.5 Frontend atualizado
  3.6 Rodar testes ✅

ETAPA 4 — Deletar
  4.1 Remover hora de MinistrarAula
  4.2 Rodar testes finais ✅
```

---

## O que NÃO fazer

- ❌ Pular etapas — especialmente não ir pra Etapa 4 antes da 3 validada
- ❌ Deletar campos antes de migrar os dados
- ❌ Tornar FK obrigatória antes de todos os registros estarem vinculados
- ❌ `objeto.delete()` — soft delete via API
- ❌ Float para dinheiro
- ❌ `response.data` — sempre `response.data.results`
- ❌ Alterar `base: '/sistema/'` no vite.config.js
- ❌ Criar outro `CLAUDE.md`
- ❌ Comitar `.env`

---

## Checklist Fase 4

### Etapa 1:
- [ ] `aul_hora_inicio` e `aul_hora_final` adicionados em `Aulas` (nullable)
- [ ] FK `aula` confirmada como nullable em `MinistrarAula`
- [ ] Testes passando ✅

### Etapa 2:
- [ ] Data migration executada
- [ ] Validação no shell — 0 registros sem FK aula
- [ ] Validação no Admin — dados corretos
- [ ] Testes passando ✅

### Etapa 3:
- [ ] FK `aula` obrigatória
- [ ] `unique_together` em Aulas e MinistrarAula
- [ ] Serializers atualizados
- [ ] ViewSets atualizados
- [ ] Frontend atualizado (fluxo Configurar → Iniciar → Finalizar)
- [ ] Novos testes adicionados
- [ ] Testes passando ✅
- [ ] Validado em produção com pelo menos 1 aula real

### Etapa 4:
- [ ] `miau_hora_inicio` e `miau_hora_final` removidos de MinistrarAula
- [ ] Testes finais passando ✅

---

**🚀 Bora codar! Good luck, Claude Code!**

> ⚠️ SISTEMA EM PRODUÇÃO — seguir a ordem exata, testar cada etapa.
