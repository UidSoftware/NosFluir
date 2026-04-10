# Instrucoes_Claude_Code_Fase3.md
# Nos Studio Fluir — Uid Software
# Fase 3 — Reajustes Estruturais

> Leia o `CLAUDE.md` antes de qualquer ação.
> Sistema em PRODUÇÃO — cada alteração impacta as clientes diretamente.
> Fazer backup do banco antes de qualquer migration destrutiva.

---

## Contexto

Após reunião com as clientes em 08/04/2026 (aula real de Funcional),
surgiram solicitações de reajuste estrutural no banco, backend e frontend.

Organizado em 3 sub-fases — executar **obrigatoriamente nessa ordem**:
- **3.1** — Alterações e criações ✅ COMPLETO (10/04/2026)
- **3.2** — Renomear tabela `Aula` → `MinistrarAula` ✅ COMPLETO (10/04/2026)
- **3.3** — Criar nova tabela `Aulas` — **PENDENTE**

---

## FASE 3.1 — Alterações e Criações ✅ COMPLETO

### 3.1.1 — Tabela `Aluno` — remover campos de medidas corporais ✅

Campos removidos e migrados para `FichaAluno`:
```
alu_peso, alu_massa_muscular, alu_massa_gorda,
alu_porcentagem_gordura, alu_circunferencia_abdominal
```

**Extra (além do spec) — adicionado em 10/04/2026:**
```python
alu_contato_emergencia = CharField(max_length=20, null=True)
alu_doencas_cronicas   = TextField(null=True)
alu_medicamentos       = TextField(null=True)
```

---

### 3.1.2 — Nova tabela `FichaAluno` ✅

Histórico de avaliações físicas com data.

```python
class FichaAluno(BaseModel):
    aluno   = ForeignKey('operacional.Aluno', related_name='fichas')
    fial_data                    = DateField()
    fial_peso                    = DecimalField(5,2, null=True)
    fial_massa_muscular          = DecimalField(5,2, null=True)
    fial_massa_gorda             = DecimalField(5,2, null=True)
    fial_porcentagem_gordura     = DecimalField(5,2, null=True)
    fial_circunferencia_abdominal = DecimalField(5,2, null=True)

    class Meta:
        db_table = 'ficha_aluno'
        ordering = ['-fial_data']
```

**Endpoints:**
```
GET/POST    /api/ficha-aluno/
GET/PUT/DEL /api/ficha-aluno/{id}/
GET         /api/ficha-aluno/?aluno={id}
```

---

### 3.1.3 — Nova tabela `Aparelho` ✅

Substituiu ENUM fixo por tabela catálogo.

```python
class Aparelho(BaseModel):
    MODALIDADE_CHOICES = [('pilates', 'Mat Pilates'), ('funcional', 'Funcional'), ('ambos', 'Ambos')]
    apar_id         = AutoField(primary_key=True)
    apar_nome       = CharField(max_length=100)
    apar_modalidade = CharField(max_length=20, choices=MODALIDADE_CHOICES)
    apar_ativo      = BooleanField(default=True)

    class Meta:
        db_table = 'aparelho'
        ordering = ['apar_modalidade', 'apar_nome']
```

**Endpoints:** `GET/POST /api/aparelhos/` · `GET/PUT/DEL /api/aparelhos/{id}/`

---

### 3.1.3b — Nova tabela `Acessorio` ✅ (extra além do spec)

```python
class Acessorio(BaseModel):
    acess_id   = AutoField(primary_key=True)
    acess_nome = CharField(max_length=100)
    acess_ativo = BooleanField(default=True)

    class Meta:
        db_table = 'acessorio'
        ordering = ['acess_nome']
```

**Endpoints:** `GET/POST /api/acessorios/` · `GET/PUT/DEL /api/acessorios/{id}/`

---

### 3.1.4 — Tabela `Exercicio` — refatorada ✅

```python
exe_modalidade  = CharField(max_length=20, choices=[('pilates',...),('funcional',...)]) # obrigatório
exe_aparelho    = ForeignKey('Aparelho', null=True)   # era ENUM fixo
exe_acessorio   = ForeignKey('Acessorio', null=True)  # era CharField livre
exe_variacao    = CharField(max_length=100, null=True) # ex: unilateral, com apoio
```

> Filtro por modalidade nos aparelhos inclui `apar_modalidade == 'ambos'`.

---

### 3.1.5 — Tabela `FichaTreino` — campo modalidade ✅

```python
fitr_modalidade = CharField(max_length=20, choices=[...], null=True)
```

---

### 3.1.6 — Tabela `FichaTreinoExercicios` — seção + combinados ✅

```python
ftex_secao = CharField(max_length=100, null=True)  # ex: "Potência", "Força"
exe2       = ForeignKey('Exercicio', null=True)     # exercício combinado (extra além do spec)
```

---

## FASE 3.2 — Renomear `Aula` → `MinistrarAula` ✅ COMPLETO

### Mapeamento aplicado:

| Antes | Depois |
|---|---|
| Model `Aula` | Model `MinistrarAula` |
| Tabela `aulas` | Tabela `ministrar_aula` |
| Prefixo `aul_` | Prefixo `miau_` |
| Endpoint `/api/aulas/` | Endpoint `/api/ministrar-aula/` |

### Campos renomeados + novos:

| Campo antigo | Campo novo | Observação |
|---|---|---|
| aul_id | miau_id | |
| aul_data | miau_data | |
| aul_hora_inicio | miau_hora_inicio | |
| aul_hora_final | miau_hora_final | |
| aul_tipo_presenca | miau_tipo_presenca | `'regular'` → `'presente'` (data migration) |
| aul_tipo_falta | miau_tipo_falta | |
| aul_intensidade_esforco (0-10) | miau_pse (6-20) | **Escala de Borg — validators Min=6 Max=20** |
| aul_pressao_inicio (string) | miau_pas_inicio (INTEGER) + miau_pad_inicio (INTEGER) | **PAS e PAD separados** |
| aul_pressao_final (string) | miau_pas_final (INTEGER) + miau_pad_final (INTEGER) | **PAS e PAD separados** |
| — | miau_fc_inicio (INTEGER) | **NOVO — Frequência Cardíaca inicial** |
| — | miau_fc_final (INTEGER) | **NOVO — Frequência Cardíaca final** |
| — | miau_observacoes (TextField) | **NOVO — observações por aluno** |

### Model atual `MinistrarAula` (implementado):

```python
class MinistrarAula(BaseModel):
    miau_id  = AutoField(primary_key=True)
    tur      = ForeignKey('operacional.Turma', on_delete=PROTECT)
    alu      = ForeignKey('operacional.Aluno', on_delete=PROTECT)
    func     = ForeignKey('operacional.Funcionario', null=True, blank=True)
    fitr     = ForeignKey('FichaTreino', null=True, blank=True)
    cred     = ForeignKey('CreditoReposicao', null=True, blank=True)

    miau_data        = DateField()
    miau_hora_inicio = TimeField()
    miau_hora_final  = TimeField(null=True)

    miau_pas_inicio  = IntegerField(null=True)
    miau_pad_inicio  = IntegerField(null=True)
    miau_pas_final   = IntegerField(null=True)
    miau_pad_final   = IntegerField(null=True)
    miau_fc_inicio   = IntegerField(null=True)
    miau_fc_final    = IntegerField(null=True)
    miau_pse         = IntegerField(null=True, validators=[Min(6), Max(20)])
    miau_observacoes = TextField(null=True)

    miau_tipo_presenca = CharField(choices=[('presente',...),('falta',...),('reposicao',...)], default='presente')
    miau_tipo_falta    = CharField(choices=[('sem_aviso',...),('justificada',...),('atestado',...),('cenario3',...)], null=True)

    class Meta:
        db_table = 'ministrar_aula'
        unique_together = [['tur', 'alu', 'miau_data', 'miau_hora_inicio']]
        ordering = ['-miau_data', '-miau_hora_inicio']
```

### ⚠️ Gotchas descobertos durante a migração:

1. **`RenameModel` + `db_table` customizado:** Django NÃO renomeia a tabela no banco quando ambos os models têm `db_table` explícito. Solução: adicionar `AlterModelTable(name='ministraraula', table='ministrar_aula')` imediatamente após o `RenameModel`.

2. **`RunPython` com `Meta.ordering` usando campos renomeados:** usar `.order_by()` para limpar o ordering antes de iterar, senão `FieldError` nos campos com nome antigo.

---

## FASE 3.3 — Nova tabela `Aulas` — PENDENTE

Tabela agregada — 1 linha por aula coletiva.
Facilita relatórios, gráficos e página de histórico.

### Relacionamento planejado:
```
Aulas (1) ──── MinistrarAula (N)
```

### Model proposto:

```python
class Aulas(BaseModel):
    MODALIDADE_CHOICES = [('pilates', 'Mat Pilates'), ('funcional', 'Funcional')]

    aul_id         = AutoField(primary_key=True)
    tur            = ForeignKey('operacional.Turma', on_delete=PROTECT)
    aul_data       = DateField()
    aul_modalidade = CharField(max_length=20, choices=MODALIDADE_CHOICES)
    aul_nome       = CharField(max_length=150, null=True, blank=True)
    # ex: "Funcional Seg 17:00" — preenchido automaticamente ou pelo professor

    class Meta:
        db_table = 'aulas'
        ordering = ['-aul_data']
        unique_together = [['tur', 'aul_data', 'aul_modalidade']]
```

> ⚠️ **Atenção:** ao criar a tabela `aulas`, o endpoint `/api/aulas/` pode conflitar
> com o histórico antigo. Verificar roteamento antes de registrar o ViewSet.

### Alteração em `MinistrarAula` após Fase 3.3:

```python
# ADICIONAR FK opcional (retrocompatível):
aula = ForeignKey('Aulas', on_delete=SET_NULL, null=True, blank=True, related_name='registros')
```

### Endpoints planejados:
```
GET/POST    /api/aulas/
GET/PUT/DEL /api/aulas/{id}/
GET         /api/aulas/?modalidade=funcional
GET         /api/aulas/?tur={id}
GET         /api/aulas/?aul_data_after=2026-01-01&aul_data_before=2026-04-30
```

### Nova página `AulasPage` (frontend):
- Listar histórico de aulas com filtros: modalidade, turma, período
- Card por aula: nome, data, modalidade (badge), turma, qtd presentes
- Link para detalhes → lista `MinistrarAula` daquela aula

---

## Estado atual dos testes

```
75 testes passando (10/04/2026):
  - financeiro:  18
  - operacional: 20
  - tecnico:     33  (5 novos em 3.2 — PSE/FC/obs)
```

---

## O que NÃO fazer nesta fase

- ❌ Alterar lógica de créditos de reposição (pendente reunião)
- ❌ Implementar permissões por perfil (pendente)
- ❌ Mexer no site-institucional
- ❌ Criar novo CLAUDE.md — atualizar o existente ao finalizar

---

## Ao finalizar a Fase 3.3

Atualizar o `CLAUDE.md`:
- Fase 3.3 → ✅ COMPLETO com data
- Tabela de models atualizada (Aulas)
- Novos endpoints adicionados
- Novas armadilhas no troubleshooting

---

**🚀 Bora codar! Good luck, Claude Code!**

> ⚠️ SISTEMA EM PRODUÇÃO — backup antes de qualquer migration destrutiva.
