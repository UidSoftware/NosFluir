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
- **3.1** — Alterações e criações
- **3.2** — Renomear tabela `Aula` → `MinistrarAula`
- **3.3** — Criar nova tabela `Aulas`

---

## FASE 3.1 — Alterações e Criações

### 3.1.1 — Tabela `Aluno` — remover campos de medidas corporais

Esses dados migram para a nova tabela `FichaAluno`.

```python
# REMOVER do model Aluno:
alu_peso
alu_massa_muscular
alu_massa_gorda
alu_porcentagem_gordura
alu_circunferencia_abdominal
```

> ⚠️ Verificar se há dados nesses campos antes de dropar.
> Se houver, migrar para `FichaAluno` antes.

---

### 3.1.2 — Nova tabela `FichaAluno`

Histórico de avaliações físicas com data — permite acompanhar evolução.

```python
class FichaAluno(BaseModel):
    aluno = models.ForeignKey(
        'operacional.Aluno',
        on_delete=models.PROTECT,
        related_name='fichas'
    )
    fial_data = models.DateField()
    fial_peso = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    fial_massa_muscular = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    fial_massa_gorda = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    fial_porcentagem_gordura = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    fial_circunferencia_abdominal = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = 'ficha_aluno'
        verbose_name = 'Ficha do Aluno'
        verbose_name_plural = 'Fichas dos Alunos'
        ordering = ['-fial_data']
```

**Endpoints:**
```
GET/POST    /api/ficha-aluno/
GET/PUT/DEL /api/ficha-aluno/{id}/
GET         /api/ficha-aluno/?aluno={id}
```

---

### 3.1.3 — Nova tabela `Aparelho`

Substituir ENUM fixo de aparelhos por tabela própria — permite cadastrar
novos sem alterar código.

```python
class Aparelho(BaseModel):
    MODALIDADE_CHOICES = [
        ('pilates', 'Mat Pilates'),
        ('funcional', 'Funcional'),
        ('ambos', 'Ambos'),
    ]
    apar_nome = models.CharField(max_length=100)
    apar_modalidade = models.CharField(max_length=20, choices=MODALIDADE_CHOICES)
    apar_ativo = models.BooleanField(default=True)

    class Meta:
        db_table = 'aparelho'
        verbose_name = 'Aparelho'
        verbose_name_plural = 'Aparelhos'
```

**Popular via fixture após criar:**
```
Pilates: Solo, Reformer, Cadillac, Chair, Barrel
Funcional: Step, Banco, Parede, Polia
```

**Endpoints:**
```
GET/POST    /api/aparelhos/
GET/PUT/DEL /api/aparelhos/{id}/
```

---

### 3.1.4 — Tabela `Exercicio` — refatorar

```python
# REMOVER:
exe_aparelho (CharField ENUM fixo)

# ADICIONAR:
exe_modalidade = models.CharField(
    max_length=20,
    choices=[('pilates', 'Mat Pilates'), ('funcional', 'Funcional')],
)
exe_aparelho = models.ForeignKey(
    'Aparelho',
    on_delete=models.PROTECT,
    null=True, blank=True,
    related_name='exercicios'
)
exe_acessorio = models.CharField(max_length=100, null=True, blank=True)
# ex: halter, elástico, bola, anilha, saco de peso

exe_variacao = models.CharField(max_length=100, null=True, blank=True)
# ex: unilateral, bilateral, com apoio
```

> ⚠️ Variações NÃO são aparelhos — podem ser acessórios (halter, elástico)
> ou formas de execução (unilateral, com apoio). Campos separados.

---

### 3.1.5 — Tabela `FichaTreino` — adicionar modalidade

```python
# ADICIONAR:
fitr_modalidade = models.CharField(
    max_length=20,
    choices=[('pilates', 'Mat Pilates'), ('funcional', 'Funcional')],
)
```

---

### 3.1.6 — Tabela `FichaTreinoExercicios` — adicionar seção

A seção ("Potência", "Força") pertence ao exercício dentro da ficha,
não à ficha em si.

```python
# ADICIONAR:
ftex_secao = models.CharField(max_length=100, null=True, blank=True)
# ex: "Potência", "Força", "Aquecimento", "Alongamento"
```

---

## FASE 3.2 — Renomear `Aula` → `MinistrarAula`

> ⚠️ Backup obrigatório antes desta fase.

### Mapeamento de renomeação:

| Antes | Depois |
|---|---|
| Model `Aula` | Model `MinistrarAula` |
| Tabela `aulas` | Tabela `ministrar_aula` |
| Prefixo `aul_` | Prefixo `miau_` |

### Campos renomeados + novos:

| Campo antigo | Campo novo | Observação |
|---|---|---|
| aul_id | miau_id | |
| aul_hora_inicio | miau_hora_inicio | |
| aul_hora_final | miau_hora_final | |
| aul_tipo_presenca | miau_tipo_presenca | |
| aul_tipo_falta | miau_tipo_falta | |
| aul_pse (0-10) | miau_pse (6-20) | **Escala de Borg — muda validação** |
| aul_observacoes | miau_observacoes | |
| aul_pressao_inicio (string) | miau_pas_inicio (INTEGER) + miau_pad_inicio (INTEGER) | **Separar PAS e PAD** |
| aul_pressao_final (string) | miau_pas_final (INTEGER) + miau_pad_final (INTEGER) | **Separar PAS e PAD** |
| — | miau_fc_inicio (INTEGER) | **NOVO — Frequência Cardíaca** |
| — | miau_fc_final (INTEGER) | **NOVO — Frequência Cardíaca** |

### Model completo `MinistrarAula`:

```python
class MinistrarAula(BaseModel):
    TIPO_PRESENCA_CHOICES = [
        ('presente', 'Presente'),
        ('falta', 'Falta'),
        ('reposicao', 'Reposição'),
    ]
    TIPO_FALTA_CHOICES = [
        ('sem_aviso', 'Sem Aviso'),
        ('justificada', 'Justificada'),
        ('atestado', 'Atestado Médico'),
        ('cenario3', 'Entre 1h e 48h'),
    ]

    # FKs
    aula = models.ForeignKey(
        'Aulas',
        on_delete=models.PROTECT,
        related_name='registros'
    )
    aluno = models.ForeignKey(
        'operacional.Aluno',
        on_delete=models.PROTECT,
        related_name='ministrar_aulas'
    )
    ficha_treino = models.ForeignKey(
        'FichaTreino',
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='ministrar_aulas'
    )
    funcionario = models.ForeignKey(
        'operacional.Funcionario',
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='ministrar_aulas'
    )
    credito_reposicao = models.ForeignKey(
        'CreditoReposicao',
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='aula_reposicao'
    )

    # Medidas início
    miau_pas_inicio = models.IntegerField(null=True, blank=True)
    miau_pad_inicio = models.IntegerField(null=True, blank=True)
    miau_fc_inicio = models.IntegerField(null=True, blank=True)

    # Medidas final
    miau_pas_final = models.IntegerField(null=True, blank=True)
    miau_pad_final = models.IntegerField(null=True, blank=True)
    miau_fc_final = models.IntegerField(null=True, blank=True)

    # Controle
    miau_hora_inicio = models.TimeField()
    miau_hora_final = models.TimeField(null=True, blank=True)
    miau_tipo_presenca = models.CharField(
        max_length=20,
        choices=TIPO_PRESENCA_CHOICES,
        default='presente'
    )
    miau_tipo_falta = models.CharField(
        max_length=20,
        choices=TIPO_FALTA_CHOICES,
        null=True, blank=True
    )
    miau_pse = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(6), MaxValueValidator(20)]
    )
    miau_observacoes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'ministrar_aula'
        verbose_name = 'Registro de Aula'
        verbose_name_plural = 'Registros de Aula'
        unique_together = [['aula', 'aluno']]
```

### Atualizar FKs que apontavam para `Aula`:

```python
# CreditoReposicao:
aula_origem → FK → MinistrarAula
aula_reposicao → FK → MinistrarAula
```

---

## FASE 3.3 — Nova tabela `Aulas`

Tabela agregada — 1 linha por aula coletiva.
Facilita relatórios, gráficos e página de histórico.

### Relacionamento:
```
Aulas (1) ──── MinistrarAula (N)
```

### Model:

```python
class Aulas(BaseModel):
    MODALIDADE_CHOICES = [
        ('pilates', 'Mat Pilates'),
        ('funcional', 'Funcional'),
    ]

    turma = models.ForeignKey(
        'operacional.Turma',
        on_delete=models.PROTECT,
        related_name='aulas'
    )
    aul_nome = models.CharField(max_length=150)
    # ex: "Funcional Seg 17:00", "Pilates Qua 18:30"

    aul_data = models.DateField()
    aul_modalidade = models.CharField(max_length=20, choices=MODALIDADE_CHOICES)

    class Meta:
        db_table = 'aulas'
        verbose_name = 'Aula'
        verbose_name_plural = 'Aulas'
        ordering = ['-aul_data']
        unique_together = [['turma', 'aul_data', 'aul_modalidade']]
```

**Endpoints:**
```
GET/POST    /api/aulas/
GET/PUT/DEL /api/aulas/{id}/
GET         /api/aulas/?modalidade=funcional
GET         /api/aulas/?turma={id}
GET         /api/aulas/?data_inicio=2026-01-01&data_fim=2026-04-30
```

---

## Ordem das migrations (executar nessa sequência)

```
1.  Criar tabela Aparelho
2.  Criar tabela FichaAluno
3.  Remover campos medidas de Aluno
4.  Refatorar Exercicio (aparelho vira FK + modalidade + acessorio + variacao)
5.  Adicionar fitr_modalidade em FichaTreino
6.  Adicionar ftex_secao em FichaTreinoExercicios
7.  Criar tabela Aulas (Fase 3.3)
8.  Renomear tabela aulas → ministrar_aula + prefixo aul_ → miau_
9.  Adicionar FK aula (→ Aulas) em MinistrarAula
10. Adicionar miau_fc_inicio, miau_fc_final, miau_observacoes
11. Separar pressão em PAS/PAD (remover string, adicionar integers)
12. Ajustar miau_pse para validação 6-20
13. Atualizar CreditoReposicao — FKs → MinistrarAula
```

> ⚠️ Testar cada migration individualmente antes da próxima.
> Rodar suite de testes após cada etapa.

---

## Frontend — o que atualizar

### `MinistrarAulaPage`:
- PAS e PAD como campos numéricos separados (não mais string)
- Adicionar FC Inicial e FC Final
- PSE: slider ou input de 6 a 20 (Escala de Borg)
- Adicionar campo Observações por aluno
- Atualizar payload do POST com novos campos

### Nova página `AulasPage` (`/aulas`):
- Listar histórico de aulas (tabela `Aulas`)
- Filtros: modalidade, turma, período
- Card por aula: nome, data, modalidade (badge), turma, qtd presentes
- Link para detalhes → lista `MinistrarAula` daquela aula

### `AlunosPage` / `AlunoDetails`:
- Remover campos de medidas do formulário de aluno
- Adicionar seção "Avaliações Físicas" com histórico de `FichaAluno`
- Botão "Nova Avaliação" → modal com campos + data

### `ExerciciosPage`:
- Filtro por modalidade (Pilates / Funcional)
- Campo aparelho vira select (busca `/api/aparelhos/`)
- Adicionar campos acessório e variação

### `FichasTreinoPage`:
- Campo modalidade no formulário
- Agrupar exercícios por seção (`ftex_secao`) no card

### Nova página `AparelhosPage` (`/configuracao/aparelhos`):
- CRUD simples — visível só para Administrador

---

## Testes a criar/atualizar

```python
# MinistrarAula
- test_criar_registro_com_pas_pad_fc
- test_pse_invalido_fora_escala_6_20  # deve rejeitar 0-5 e 21+
- test_falta_justificada_gera_credito  # ajustar FK

# FichaAluno
- test_criar_ficha_aluno_com_data
- test_historico_multiplas_fichas_por_aluno

# Aparelho
- test_crud_aparelho
- test_exercicio_com_aparelho_fk

# Aulas
- test_criar_aula
- test_listar_aulas_por_modalidade
- test_unique_turma_data_modalidade
```

---

## O que NÃO fazer nesta fase

- ❌ Alterar lógica de créditos de reposição (pendente reunião)
- ❌ Implementar permissões por perfil (pendente)
- ❌ Mexer no site-institucional
- ❌ Criar novo CLAUDE.md — atualizar o existente ao finalizar

---

## Ao finalizar

Atualizar o `CLAUDE.md`:
- Fase 3 → ✅ COMPLETO com data
- Tabela de models atualizada
- Novos endpoints adicionados
- Novas armadilhas no troubleshooting

---

**🚀 Bora codar! Good luck, Claude Code!**

> ⚠️ SISTEMA EM PRODUÇÃO — backup antes de qualquer migration destrutiva.
