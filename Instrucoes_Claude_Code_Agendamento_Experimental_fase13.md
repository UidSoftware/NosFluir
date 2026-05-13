# Instrucoes_Claude_Code_Agendamento_Experimental.md
# Nos Studio Fluir — Uid Software
# Feature: Agendamento e Aula Experimental

## ⚠️ ATENÇÃO — SISTEMA EM PRODUÇÃO

Testar cada etapa antes de avançar.
```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro apps.operacional apps.tecnico --verbosity=2
```

---

## Contexto

Fluxo completo de captação de novos alunos:

```
ETAPA 1 — Agendamento
Site (público) ou Sistema (recepcionista)
→ Prospecto escolhe slot disponível e preenche dados básicos
→ Vaga bloqueada automaticamente

ETAPA 2 — Aula Experimental
Professor abre no sistema no dia
→ Preenche anamnese completa
→ Realiza testes físicos
→ Decide se cadastra como aluno

ETAPA 3 — Decisão
→ Sim → cria Aluno direto do formulário
→ Não → agendamento encerrado
```

---

## ETAPA 1 — Models

### 1.1 — `SlotExperimental`

Horários disponíveis para aula experimental.
Cadastrado pelo admin.

```python
class SlotExperimental(BaseModel):
    DIA_CHOICES = [
        ('seg', 'Segunda-feira'),
        ('ter', 'Terça-feira'),
        ('qua', 'Quarta-feira'),
        ('qui', 'Quinta-feira'),
        ('sex', 'Sexta-feira'),
    ]
    MODALIDADE_CHOICES = [
        ('pilates',   'Mat Pilates'),
        ('funcional', 'Funcional'),
        ('ambos',     'Ambos'),
    ]

    slot_dia_semana  = models.CharField(max_length=3, choices=DIA_CHOICES)
    slot_hora        = models.TimeField()
    slot_modalidade  = models.CharField(max_length=20, choices=MODALIDADE_CHOICES, default='ambos')
    slot_vagas       = models.IntegerField(default=2)
    slot_ativo       = models.BooleanField(default=True)

    class Meta:
        db_table = 'slot_experimental'
        verbose_name = 'Slot Experimental'
        verbose_name_plural = 'Slots Experimentais'
        unique_together = [('slot_dia_semana', 'slot_hora', 'slot_modalidade')]
        ordering = ['slot_dia_semana', 'slot_hora']

    @property
    def vagas_disponiveis(self):
        """Conta vagas disponíveis para a próxima ocorrência deste slot."""
        from datetime import date
        agendamentos_ativos = self.agendamentos.filter(
            age_status__in=['pendente', 'confirmado'],
            age_data_agendada__gte=date.today()
        ).count()
        return max(0, self.slot_vagas - agendamentos_ativos)

    def __str__(self):
        return f"{self.get_slot_dia_semana_display()} {self.slot_hora} — {self.get_slot_modalidade_display()} ({self.vagas_disponiveis} vagas)"
```

**App:** `operacional`
**Endpoint:** `/api/slots-experimentais/`
**Permissão:** GET público (site usa), POST/PATCH/DELETE → Admin

---

### 1.2 — `AgendamentoExperimental`

Solicitação de aula experimental — criado pelo site ou sistema.

```python
class AgendamentoExperimental(BaseModel):
    STATUS_CHOICES = [
        ('pendente',   'Pendente'),
        ('confirmado', 'Confirmado'),
        ('realizado',  'Realizado'),
        ('cancelado',  'Cancelado'),
        ('faltou',     'Faltou'),
    ]
    MODALIDADE_CHOICES = [
        ('pilates',   'Mat Pilates'),
        ('funcional', 'Funcional'),
        ('ambos',     'Ambos'),
    ]

    slot = models.ForeignKey(
        'SlotExperimental',
        on_delete=models.PROTECT,
        related_name='agendamentos'
    )

    # Dados do prospecto
    age_nome           = models.CharField(max_length=200)
    age_telefone       = models.CharField(max_length=20)
    age_nascimento     = models.DateField()
    age_modalidade     = models.CharField(max_length=20, choices=MODALIDADE_CHOICES)
    age_disponibilidade = models.TextField(null=True, blank=True)
    # outros horários que o prospecto tem disponibilidade

    age_problema_saude = models.TextField(null=True, blank=True)
    # doenças, lesões — "conte-me tudo, não esconda nada"

    age_data_agendada  = models.DateField()
    age_hora_agendada  = models.TimeField()
    age_status         = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pendente'
    )
    age_origem         = models.CharField(
        max_length=20,
        choices=[('site', 'Site'), ('sistema', 'Sistema')],
        default='site'
    )
    age_observacoes    = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'agendamento_experimental'
        verbose_name = 'Agendamento Experimental'
        verbose_name_plural = 'Agendamentos Experimentais'
        ordering = ['age_data_agendada', 'age_hora_agendada']

    def save(self, *args, **kwargs):
        # Verificar vagas disponíveis ao criar
        if not self.pk:
            if self.slot.vagas_disponiveis <= 0:
                from django.core.exceptions import ValidationError
                raise ValidationError('Não há vagas disponíveis neste horário.')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.age_nome} — {self.age_data_agendada} {self.age_hora_agendada}"
```

**App:** `operacional`
**Endpoint:** `/api/agendamento-experimental/`
**Permissão:** POST público (site), GET/PATCH → Admin/Recepcionista

---

### 1.3 — `AulaExperimental`

Realização da aula experimental com anamnese e testes físicos.

```python
class AulaExperimental(BaseModel):
    agendamento = models.OneToOneField(
        'AgendamentoExperimental',
        on_delete=models.PROTECT,
        related_name='aula_experimental'
    )
    func = models.ForeignKey(
        'Funcionario',
        on_delete=models.PROTECT,
        related_name='aulas_experimentais'
    )
    aexp_data       = models.DateField()
    aexp_modalidade = models.CharField(max_length=20, choices=MODALIDADE_CHOICES)

    # ── Anamnese ──
    aexp_profissao        = models.CharField(max_length=100, null=True, blank=True)
    aexp_doencas_cronicas = models.TextField(null=True, blank=True)
    aexp_lesoes_dores     = models.TextField(null=True, blank=True)
    aexp_objetivo         = models.TextField(null=True, blank=True)

    # ── Testes Físicos (Pré Aula) ──
    # Independente de ser Pilates ou Funcional
    aexp_agachamento   = models.TextField(null=True, blank=True)
    # descrever execução: alinhamento, profundidade, compensações
    aexp_flexibilidade = models.TextField(null=True, blank=True)
    # sentado, mão no pé — descrever alcance e limitações
    aexp_equilibrio    = models.TextField(null=True, blank=True)
    # uma perna + elevação lateral — descrever estabilidade
    aexp_coordenacao   = models.TextField(null=True, blank=True)
    # perdigueiro invertido — descrever execução
    aexp_observacoes   = models.TextField(null=True, blank=True)

    # ── Decisão ──
    aexp_cadastrou_aluno = models.BooleanField(default=False)
    aluno = models.ForeignKey(
        'Aluno',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='aula_experimental_origem'
    )
    # preenchido se virou aluno

    class Meta:
        db_table = 'aula_experimental'
        verbose_name = 'Aula Experimental'
        verbose_name_plural = 'Aulas Experimentais'
        ordering = ['-aexp_data']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Ao salvar, atualizar status do agendamento
        if self.aexp_cadastrou_aluno:
            self.agendamento.age_status = 'realizado'
        else:
            self.agendamento.age_status = 'realizado'
        self.agendamento.save(update_fields=['age_status'])

    def __str__(self):
        return f"Experimental {self.agendamento.age_nome} — {self.aexp_data}"
```

**App:** `operacional`
**Endpoint:** `/api/aula-experimental/`
**Permissão:** Admin/Professor

---

## ETAPA 2 — Endpoints

```
# SlotExperimental
GET    /api/slots-experimentais/              → lista slots ativos com vagas (público)
POST   /api/slots-experimentais/              → criar slot (admin)
PATCH  /api/slots-experimentais/{id}/         → editar slot (admin)

# AgendamentoExperimental
GET    /api/agendamento-experimental/         → lista (admin/recepcionista)
POST   /api/agendamento-experimental/         → criar (público — site e sistema)
PATCH  /api/agendamento-experimental/{id}/    → atualizar status (admin/recepcionista)
GET    /api/agendamento-experimental/?status=pendente → filtrar por status
GET    /api/agendamento-experimental/?data=2026-04-22 → filtrar por data

# AulaExperimental
GET    /api/aula-experimental/                → lista (admin/professor)
POST   /api/aula-experimental/               → criar (admin/professor)
GET    /api/aula-experimental/{id}/          → detalhe
PATCH  /api/aula-experimental/{id}/          → atualizar
```

---

## ETAPA 3 — Frontend Sistema

### 3.1 — Configuração de Slots (`/operacional/slots-experimentais`)

**Visível para:** Admin

```
┌─────────────────────────────────────────────────────┐
│ Slots Experimentais                     [+ Novo]    │
├─────────────────────────────────────────────────────┤
│ Segunda  09:00  Ambos       2 vagas  ✅  [✏️][🗑️]  │
│ Quarta   17:00  Pilates     2 vagas  ✅  [✏️][🗑️]  │
│ Sexta    08:30  Funcional   1 vaga   ✅  [✏️][🗑️]  │
└─────────────────────────────────────────────────────┘
```

---

### 3.2 — Agendamentos (`/operacional/agendamentos-experimentais`)

**Visível para:** Admin e Recepcionista

```
┌─────────────────────────────────────────────────────┐
│ Agendamentos Experimentais          [+ Novo]        │
│ Filtros: [Status ▼] [Data] [Modalidade ▼]           │
├─────────────────────────────────────────────────────┤
│ 22/04 09:00  Maria Silva    Funcional  🟡 Pendente  │
│ 23/04 17:00  João Santos   Pilates    🟢 Confirmado │
│ 20/04 09:00  Ana Costa     Ambos      ✅ Realizado  │
└─────────────────────────────────────────────────────┘
```

**Legenda status:**
- 🟡 Pendente
- 🟢 Confirmado
- ✅ Realizado
- ❌ Cancelado
- 🔴 Faltou

**Ao clicar no agendamento:**
- Ver dados do prospecto
- Botão `[Iniciar Aula Experimental]` → abre formulário da AulaExperimental

---

### 3.3 — Formulário Aula Experimental

```
┌─────────────────────────────────────────────────────┐
│ Aula Experimental — Maria Silva                     │
│ 22/04/2026 — Funcional                             │
├─────────────────────────────────────────────────────┤
│ ANAMNESE                                            │
│ Profissão          [________________]               │
│ Doenças Crônicas   [________________]               │
│ Lesões/Dores       [________________]               │
│ Objetivo           [________________]               │
├─────────────────────────────────────────────────────┤
│ TESTES FÍSICOS (Pré Aula)                          │
│ Agachamento        [________________]               │
│ Flexibilidade      [________________]               │
│ (sentado, mão no pé)                               │
│ Equilíbrio         [________________]               │
│ (uma perna + elevação lateral)                     │
│ Coordenação        [________________]               │
│ (perdigueiro invertido)                            │
│ Observações        [________________]               │
├─────────────────────────────────────────────────────┤
│ DECISÃO                                             │
│ ○ Cadastrar como aluno                              │
│ ○ Encerrar sem cadastro                             │
│                          [Finalizar Experimental]   │
└─────────────────────────────────────────────────────┘
```

**Pré-preenchimento automático da AulaExperimental:**

Ao clicar "Iniciar Aula Experimental", os campos da anamnese são
pré-preenchidos automaticamente com dados do AgendamentoExperimental:

```javascript
// Ao abrir o formulário da AulaExperimental:
const preencherDadosAgendamento = (agendamento) => ({
    aexp_data:            agendamento.age_data_agendada,
    aexp_modalidade:      agendamento.age_modalidade,
    aexp_doencas_cronicas: agendamento.age_problema_saude || '',
    aexp_lesoes_dores:    agendamento.age_problema_saude || '',
    // demais campos em branco — professor completa na hora
})
```

Professor pode editar qualquer campo pré-preenchido antes de salvar.
Evita redigitação e inconsistência de dados. ✅

---

**Se "Cadastrar como aluno":**

Modal de cadastro de Aluno pré-preenchido com dados do agendamento
**e** da anamnese — evita redigitação e garante consistência:

```javascript
// Pré-preencher formulário de Aluno:
const preencherDadosAluno = (agendamento, aulaExp) => ({
    alu_nome:        agendamento.age_nome,
    alu_telefone:    agendamento.age_telefone,
    alu_nascimento:  agendamento.age_nascimento,
    // campos de saúde (FichaAluno será criada depois)
    // demais campos em branco — recepcionista completa
})
```

Fluxo completo ao confirmar cadastro:
1. Cria `Aluno` com dados pré-preenchidos
2. Vincula `alu_id` na `AulaExperimental`
3. Seta `aexp_cadastrou_aluno = True`
4. Status do agendamento → `realizado`
5. Exibe mensagem: "Aluno cadastrado com sucesso! Não esqueça de matriculá-lo em uma turma."

---

## ETAPA 4 — Frontend Site Institucional

### Formulário de Agendamento (site)

```html
<!-- Formulário público no site -->

1. Modalidade de interesse
   ○ Mat Pilates  ○ Funcional  ○ Ambos

2. Horários disponíveis
   (busca: GET /api/slots-experimentais/?modalidade=funcional)
   ○ Segunda 09:00 — 2 vagas disponíveis
   ○ Quarta  17:00 — 1 vaga disponível

3. Dados pessoais
   Nome completo *
   Telefone *
   Data de nascimento *
   Profissão

4. Saúde
   Doenças crônicas ou problemas de saúde?
   Lesões recentes ou dores?
   "Conte-nos tudo, não esconda nada 😊"

5. Objetivo
   O que você busca com o treino?

6. Disponibilidade de horários
   Quais outros horários você tem disponibilidade?
   (para caso o slot escolhido fique indisponível)

[Agendar Minha Aula Experimental]
```

**Após envio:**
- Mensagem de confirmação na tela
- Vaga bloqueada automaticamente
- Admin/recepcionista vê no sistema

---

## Ordem de execução obrigatória

```
ETAPA 1 — Models + migrations
  1.1 SlotExperimental
  1.2 AgendamentoExperimental
  1.3 AulaExperimental
  → Rodar testes ✅

ETAPA 2 — Endpoints + serializers + permissões
  → Testar no Swagger ✅

ETAPA 3 — Frontend Sistema
  3.1 Página Slots (admin configura)
  3.2 Página Agendamentos (lista + status)
  3.3 Formulário Aula Experimental (anamnese + testes + decisão)
  → Rodar testes ✅

ETAPA 4 — Site Institucional
  → Formulário público com slots dinâmicos
  → Rodar testes ✅
```

---

## Regras de Negócio

| ID | Regra |
|---|---|
| RN-SLOT-01 | Slot com 0 vagas disponíveis não aparece no site |
| RN-SLOT-02 | Slot inativo não aparece no site |
| RN-AGE-01 | Ao criar agendamento → verificar vagas antes de salvar |
| RN-AGE-02 | Status inicial sempre `pendente` |
| RN-AGE-03 | Cancelar agendamento → libera vaga automaticamente |
| RN-AEXP-01 | 1 agendamento = 1 aula experimental (OneToOne) |
| RN-AEXP-02 | Ao finalizar experimental → status agendamento vira `realizado` |
| RN-AEXP-03 | Se cadastrou aluno → vincular alu_id na AulaExperimental |
| RN-AEXP-04 | Testes físicos são iguais independente de Pilates ou Funcional |

---

## O que NÃO fazer

- ❌ Deixar POST de agendamento com autenticação — é público
- ❌ Deixar GET de slots sem filtro de `slot_ativo=True` no site
- ❌ Criar AulaExperimental sem AgendamentoExperimental vinculado
- ❌ `objeto.delete()` — soft delete via API
- ❌ `response.data` — sempre `response.data.results`
- ❌ Alterar `base: '/sistema/'` no vite.config.js
- ❌ Criar outro `CLAUDE.md`

---

## Checklist

### Backend:
- [ ] Model `SlotExperimental` + migration
- [ ] Model `AgendamentoExperimental` + migration
- [ ] Model `AulaExperimental` + migration
- [ ] Endpoints com permissões corretas
- [ ] Validação de vagas no save()
- [ ] Testes passando ✅

### Frontend Sistema:
- [ ] Página Slots Experimentais (admin)
- [ ] Página Agendamentos com filtros e status
- [ ] Formulário Aula Experimental completo
- [ ] Modal cadastro aluno pré-preenchido
- [ ] Testes passando ✅

### Site Institucional:
- [ ] Formulário com slots dinâmicos
- [ ] Filtra slots por modalidade
- [ ] Mostra vagas disponíveis
- [ ] Mensagem de confirmação após envio
- [ ] Testes passando ✅

---

**🚀 Bora codar! Good luck, Claude Code!**

> ⚠️ SISTEMA EM PRODUÇÃO — testar cada etapa antes de avançar.
