# Instrucoes_Claude_Code_Fase5.md
# Nos Studio Fluir — Uid Software
# Fase 5 — Ciclos, Exercícios Individuais e Evolução

## ⚠️ PRÉ-REQUISITO

Fase 4 (refactor Aulas/MinistrarAula) deve estar **concluída e validada em produção**
antes de iniciar esta fase.

---

## Contexto

Esta fase implementa a lógica de ciclos de fichas e individualização
de exercícios por aluno — base para os futuros relatórios e gráficos de evolução.

**Conceito central — Ciclo de Fichas:**
```
Aula 1  → Ficha 1
Aula 2  → Ficha 2
...
Aula 12 → Ficha 12
──────────────────── ciclo 1 completo
Aula 13 → Ficha 1   ← ciclo 2 começa
Aula 14 → Ficha 2
...
```
A professora compara Aula 1 (ciclo 1) com Aula 13 (ciclo 2) — mesma ficha,
ciclos diferentes — para ver a evolução do aluno.

---

## ETAPA 1 — ProgramaTurma

Define a sequência ordenada de fichas que uma turma vai seguir.

### 1.1 — Novo model `ProgramaTurma`

```python
class ProgramaTurma(BaseModel):
    turma = models.ForeignKey(
        'operacional.Turma',
        on_delete=models.PROTECT,
        related_name='programa'
    )
    fitr = models.ForeignKey(
        'FichaTreino',
        on_delete=models.PROTECT,
        related_name='programas'
    )
    prog_ordem = models.IntegerField()
    # posição no ciclo: 1, 2, 3... até N (não precisa ser exatamente 12)

    class Meta:
        db_table = 'programa_turma'
        verbose_name = 'Programa da Turma'
        verbose_name_plural = 'Programas das Turmas'
        unique_together = [
            ('turma', 'prog_ordem'),   # não pode ter 2 fichas na mesma posição
            ('turma', 'fitr'),         # não pode repetir a mesma ficha no programa
        ]
        ordering = ['turma', 'prog_ordem']

    def __str__(self):
        return f"{self.turma} — Posição {self.prog_ordem}: {self.fitr}"
```

**App:** `tecnico`
**Endpoint:** `/api/programa-turma/`
**Filtros:** `turma`

---

### 1.2 — Adicionar campos de ciclo em `Aulas`

```python
# Adicionar em Aulas:
aul_numero_ciclo   = models.IntegerField(default=1)
# qual ciclo: 1, 2, 3...

aul_posicao_ciclo  = models.IntegerField(null=True, blank=True)
# posição dentro do ciclo: 1-N (vem do ProgramaTurma.prog_ordem)
```

**Migration:** nullable por compatibilidade com registros existentes.

---

### 1.3 — Lógica de ciclo ao criar Aula

Ao criar uma `Aula` com ficha informada, o sistema deve:

```python
# Em AulasViewSet.perform_create() ou no model.save():

# 1. Buscar a posição da ficha no programa da turma
programa = ProgramaTurma.objects.filter(
    turma=aula.tur,
    fitr=aula.fitr
).first()

if programa:
    aula.aul_posicao_ciclo = programa.prog_ordem

    # 2. Contar quantas vezes essa posição já foi usada = número do ciclo
    ciclos_anteriores = Aulas.objects.filter(
        tur=aula.tur,
        aul_posicao_ciclo=programa.prog_ordem
    ).count()

    aula.aul_numero_ciclo = ciclos_anteriores + 1
```

---

### 1.4 — Frontend — ProgramaTurmaPage

**Rota:** `/tecnico/programa-turma`
**Menu:** Técnico → Programa das Turmas

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Programa das Turmas            [Selecionar Turma ▼] │
├─────────────────────────────────────────────────────┤
│ Turma: Funcional Seg 17:00                          │
│                                                     │
│  1. Funcional 1 — Potência + Força          [🗑️]   │
│  2. Funcional 2 — Core + Resistência        [🗑️]   │
│  3. Funcional 3 — HIIT                      [🗑️]   │
│  ⣿ arraste para reordenar                          │
│                              [+ Adicionar Ficha]    │
└─────────────────────────────────────────────────────┘
```

- Drag & drop para reordenar (`@dnd-kit` — já instalado na Fase 4)
- Botão "+" adiciona nova ficha ao programa
- Ao reordenar → PATCH com novo `prog_ordem`

---

### 1.5 — Sugestão de ficha na MinistrarAulaPage

Na Tela 1 (Configurar Aula), ao selecionar a turma:
- Sistema busca qual é a próxima ficha do programa
- Pré-seleciona automaticamente no select de ficha
- Professora pode confirmar ou trocar

```javascript
// Buscar última aula da turma
const ultimaAula = await api.get(`/api/aulas/?tur=${turmaId}&ordering=-aul_data&limit=1`)
const ultimaPosicao = ultimaAula.data.results[0]?.aul_posicao_ciclo || 0

// Próxima posição no programa
const proximaFicha = programa.find(p => p.prog_ordem === ultimaPosicao + 1)
  || programa[0]  // volta pro início se completou o ciclo
```

---

## ETAPA 2 — RegistroExercicioAluno

Individualização de exercícios por aluno em tempo real durante a aula.

### 2.1 — Novo model `RegistroExercicioAluno`

```python
class RegistroExercicioAluno(BaseModel):
    ministrar_aula = models.ForeignKey(
        'MinistrarAula',
        on_delete=models.PROTECT,
        related_name='registros_exercicios'
    )
    ftex = models.ForeignKey(
        'FichaTreinoExercicios',
        on_delete=models.PROTECT,
        related_name='registros_alunos'
    )

    # Ajustes individuais (base vem da FichaTreinoExercicios)
    reg_series      = models.IntegerField(null=True, blank=True)
    reg_repeticoes  = models.IntegerField(null=True, blank=True)
    reg_carga       = models.CharField(max_length=50, null=True, blank=True)
    # ex: "5kg", "15kg braço dir / 5kg braço esq", "faixa amarela"
    reg_observacoes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'registro_exercicio_aluno'
        verbose_name = 'Registro de Exercício'
        verbose_name_plural = 'Registros de Exercícios'
        unique_together = [('ministrar_aula', 'ftex')]
        ordering = ['ftex__ftex_ordem']

    def __str__(self):
        return f"{self.ministrar_aula.alu} — {self.ftex.exe_nome}"
```

**App:** `tecnico`
**Endpoint:** `/api/registro-exercicio-aluno/`
**Filtros:** `ministrar_aula`, `ftex`

---

### 2.2 — Frontend — atualizar MinistrarAulaPage

**Fluxo em tempo real durante a aula:**

```
Para cada aluno na lista de chamada:
├── Card do aluno (PAS/PAD/FC/presença — igual hoje)
└── Lista de exercícios da ficha
    ├── Exercício 1: [séries base] [reps base] [carga] [obs]
    ├── Exercício 2: [séries base] [reps base] [carga] [obs]
    └── ...
```

**Layout por exercício dentro do card do aluno:**
```
┌─────────────────────────────────────────────────────┐
│ 1. The Hundred — Reformer                           │
│    Séries: [3]  Reps: [10]  Carga: [__________]    │
│    Obs: [________________________________]          │
└─────────────────────────────────────────────────────┘
```

- `Séries` e `Reps` pré-preenchidos com valores base da `FichaTreinoExercicios`
- Professora edita em tempo real se necessário
- `Carga` e `Obs` em branco — professora preenche
- Tudo em estado local (React state) — nada vai ao banco antes de "Finalizar Aula"

**Ao "Finalizar Aula":**
```javascript
// Para cada aluno, para cada exercício modificado:
await api.post('/api/registro-exercicio-aluno/', {
    ministrar_aula: miau_id,
    ftex: ftex_id,
    reg_series: valor,
    reg_repeticoes: valor,
    reg_carga: valor,
    reg_observacoes: valor,
})
// Só cria registro se houve alguma modificação ou preenchimento
// Exercícios sem nenhum dado não precisam de registro
```

---

### 2.3 — Observação da última vez com essa ficha (ponto 4.2 revisitado)

Na `MinistrarAulaPage`, para cada exercício de cada aluno,
buscar o `RegistroExercicioAluno` mais recente do mesmo aluno
com a mesma ficha (ciclo anterior):

```javascript
// Buscar última vez que esse aluno fez esse exercício nessa ficha
GET /api/registro-exercicio-aluno/?
    ministrar_aula__alu={alu_id}&
    ftex={ftex_id}&
    ordering=-created_at&
    limit=1
```

**Exibir como referência (readonly):**
```
┌─────────────────────────────────────────────────────┐
│ 📋 Última vez (Aula 1 — ciclo 1 — 08/04/2026):     │
│    Séries: 3  Reps: 10  Carga: 5kg                 │
│    Obs: "carga braço esq. 5kg e dir. 15kg"         │  ← readonly
└─────────────────────────────────────────────────────┘
│ Séries: [3]  Reps: [10]  Carga: [__________]       │  ← editável
│ Obs: [________________________________]             │  ← editável
```

---

## ETAPA 3 — Base para Relatórios e Gráficos

Não implementar os relatórios ainda — apenas garantir que
a estrutura de dados suporta as consultas futuras.

**Queries que precisam funcionar:**

```python
# Evolução de carga de um aluno em um exercício ao longo dos ciclos
RegistroExercicioAluno.objects.filter(
    ministrar_aula__alu=aluno,
    ftex__exe=exercicio
).select_related(
    'ministrar_aula__aula'
).order_by(
    'ministrar_aula__aula__aul_numero_ciclo',
    'ministrar_aula__aula__aul_posicao_ciclo'
)

# Comparar aula 1 ciclo 1 vs aula 1 ciclo 2
Aulas.objects.filter(
    tur=turma,
    aul_posicao_ciclo=1,
    aul_numero_ciclo__in=[1, 2]
)
```

Validar que essas queries retornam dados corretos após as migrações.

---

## Ordem de execução obrigatória

```
ETAPA 1 — ProgramaTurma
  1.1 Model ProgramaTurma
  1.2 Campos aul_numero_ciclo + aul_posicao_ciclo em Aulas
  1.3 Lógica de ciclo no create
  1.4 Frontend ProgramaTurmaPage
  1.5 Sugestão de ficha na MinistrarAulaPage
  → Rodar testes ✅

ETAPA 2 — RegistroExercicioAluno
  2.1 Model RegistroExercicioAluno
  2.2 Frontend MinistrarAulaPage atualizada
  2.3 Observação da última vez (referência por ciclo)
  → Rodar testes ✅

ETAPA 3 — Validar queries de relatório
  → Confirmar que as queries de evolução retornam dados corretos ✅
```

---

## O que NÃO fazer

- ❌ Iniciar antes da Fase 4 concluída
- ❌ Salvar `RegistroExercicioAluno` antes de "Finalizar Aula" — tudo em estado local
- ❌ Criar registro vazio — só criar se houve preenchimento
- ❌ `objeto.delete()` — soft delete via API
- ❌ Float para dinheiro
- ❌ `response.data` — sempre `response.data.results`
- ❌ Alterar `base: '/sistema/'` no vite.config.js
- ❌ Criar outro `CLAUDE.md`

---

## Checklist Fase 5

### Etapa 1:
- [ ] Model `ProgramaTurma` criado
- [ ] Campos `aul_numero_ciclo` e `aul_posicao_ciclo` em `Aulas`
- [ ] Lógica de ciclo no create de `Aulas`
- [ ] `ProgramaTurmaPage` no frontend
- [ ] Sugestão automática de ficha na `MinistrarAulaPage`
- [ ] Testes passando ✅

### Etapa 2:
- [ ] Model `RegistroExercicioAluno` criado
- [ ] `MinistrarAulaPage` com exercícios individuais por aluno
- [ ] Referência da última vez por exercício/ficha/ciclo
- [ ] Testes passando ✅

### Etapa 3:
- [ ] Queries de evolução validadas
- [ ] Base pronta para relatórios futuros ✅

---

## Pendências futuras (Fase 6+)

- Relatório de evolução de carga por exercício por aluno
- Gráfico de PSE ao longo dos ciclos
- Gráfico de PA (PAS/PAD) ao longo dos ciclos
- Comparativo ciclo a ciclo por turma
- Alerta automático quando ciclo completa

---

**🚀 Bora codar! Good luck, Claude Code!**

> ⚠️ SISTEMA EM PRODUÇÃO — testar cada etapa antes de avançar.
