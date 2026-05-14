# Instrucoes_Claude_Code_Fase13.md
# Nos Studio Fluir — Uid Software
# Fase 13 — Agendamento e Aula Experimental

## ⚠️ ATENÇÃO — SISTEMA EM PRODUÇÃO

Testar cada etapa antes de avançar.
```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro apps.operacional apps.tecnico --verbosity=2
```

> 🛑 Ao concluir cada etapa, PARAR e perguntar ao usuário
> se deve continuar. Não iniciar próxima sem autorização.

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
→ Sim → cria Aluno direto do formulário (pré-preenchido)
→ Não → agendamento encerrado como "realizado"
```

---

## Parte 1 — Backend

### 1.1 — Model `SlotExperimental`

Horários recorrentes disponíveis para aula experimental.
Cadastrado pelo admin. GET público (site usa para exibir disponibilidade).

```python
class SlotExperimental(BaseModel):
    DIA_CHOICES = [
        ('seg', 'Segunda-feira'), ('ter', 'Terça-feira'),
        ('qua', 'Quarta-feira'),  ('qui', 'Quinta-feira'),
        ('sex', 'Sexta-feira'),
    ]
    MODALIDADE_CHOICES = [
        ('pilates', 'Mat Pilates'), ('funcional', 'Funcional'), ('ambos', 'Ambos'),
    ]

    slot_dia_semana = models.CharField(max_length=3, choices=DIA_CHOICES)
    slot_hora       = models.TimeField()
    slot_modalidade = models.CharField(max_length=20, choices=MODALIDADE_CHOICES, default='ambos')
    slot_vagas      = models.IntegerField(default=2)
    slot_ativo      = models.BooleanField(default=True)

    class Meta:
        db_table = 'slot_experimental'
        unique_together = [('slot_dia_semana', 'slot_hora', 'slot_modalidade')]
        ordering = ['slot_dia_semana', 'slot_hora']

    @property
    def vagas_disponiveis(self):
        from datetime import date
        agendamentos_ativos = self.agendamentos.filter(
            age_status__in=['pendente', 'confirmado'],
            age_data_agendada__gte=date.today()
        ).count()
        return max(0, self.slot_vagas - agendamentos_ativos)
```

**PK:** `slot_id`
**Endpoint:** `/api/slots-experimentais/`
**Permissão:** GET público | POST/PATCH/DELETE → Admin

---

### 1.2 — Model `AgendamentoExperimental`

Solicitação de aula experimental — criado pelo site ou sistema.
FK `slot` é **nullable** (migration 0010) — permite agendamentos manuais sem slot fixo.

```python
class AgendamentoExperimental(BaseModel):
    STATUS_CHOICES = [
        ('pendente', 'Pendente'), ('confirmado', 'Confirmado'),
        ('realizado', 'Realizado'), ('cancelado', 'Cancelado'), ('faltou', 'Faltou'),
    ]

    slot              = models.ForeignKey('SlotExperimental', on_delete=models.PROTECT,
                            related_name='agendamentos', null=True, blank=True)
    age_nome          = models.CharField(max_length=200)
    age_telefone      = models.CharField(max_length=20)
    age_nascimento    = models.DateField()
    age_modalidade    = models.CharField(max_length=20, choices=MODALIDADE_CHOICES)
    age_disponibilidade = models.TextField(null=True, blank=True)
    age_problema_saude  = models.TextField(null=True, blank=True)
    age_data_agendada = models.DateField()
    age_hora_agendada = models.TimeField()
    age_status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    age_origem        = models.CharField(max_length=20,
                            choices=[('site', 'Site'), ('sistema', 'Sistema')], default='site')
    age_observacoes   = models.TextField(null=True, blank=True)
```

**PK:** `age_id`
**FK no payload:** `slot` (sem `_id`)
**Endpoint:** `/api/agendamento-experimental/`
**Permissão:** POST público | GET/PATCH → Recepcionista/Admin

---

### 1.3 — Model `AulaExperimental`

Realização da aula com anamnese, testes físicos e decisão final.
OneToOne com `AgendamentoExperimental`.
`save()` automaticamente seta `age_status='realizado'` no agendamento vinculado.

```python
class AulaExperimental(BaseModel):
    agendamento   = models.OneToOneField('AgendamentoExperimental',
                        on_delete=models.PROTECT, related_name='aula_experimental')
    func          = models.ForeignKey('Funcionario', on_delete=models.PROTECT,
                        related_name='aulas_experimentais')
    aexp_data     = models.DateField()
    aexp_modalidade = models.CharField(max_length=20, choices=MODALIDADE_CHOICES)

    # Anamnese
    aexp_profissao        = models.CharField(max_length=100, null=True, blank=True)
    aexp_doencas_cronicas = models.TextField(null=True, blank=True)
    aexp_lesoes_dores     = models.TextField(null=True, blank=True)
    aexp_objetivo         = models.TextField(null=True, blank=True)

    # Testes Físicos (iguais para Pilates e Funcional)
    aexp_agachamento   = models.TextField(null=True, blank=True)
    aexp_flexibilidade = models.TextField(null=True, blank=True)
    aexp_equilibrio    = models.TextField(null=True, blank=True)
    aexp_coordenacao   = models.TextField(null=True, blank=True)
    aexp_observacoes   = models.TextField(null=True, blank=True)

    # Decisão
    aexp_cadastrou_aluno = models.BooleanField(default=False)
    aluno = models.ForeignKey('Aluno', on_delete=models.SET_NULL,
                null=True, blank=True, related_name='aula_experimental_origem')
```

**PK:** `aexp_id`
**FK no payload:** `agendamento`, `func`, `aluno` (sem `_id`)
**Endpoint:** `/api/aulas-experimentais/`
**Permissão:** Professor/Admin

---

### 1.4 — Migrations

| Migration | Conteúdo |
|---|---|
| `0009_fase13_agendamento_experimental` | Cria `SlotExperimental`, `AgendamentoExperimental` (slot obrigatório), `AulaExperimental` |
| `0010_agendamentoexperimental_slot_nullable` | Torna FK `slot` nullable em `AgendamentoExperimental` |

---

### 1.5 — Endpoints

```
# SlotExperimental
GET    /api/slots-experimentais/              → lista slots (público)
GET    /api/slots-experimentais/?slot_ativo=true  → só ativos
POST   /api/slots-experimentais/              → criar slot (admin)
PATCH  /api/slots-experimentais/{id}/         → editar (admin)
DELETE /api/slots-experimentais/{id}/         → soft delete (admin)

# AgendamentoExperimental
GET    /api/agendamento-experimental/                    → lista (recepcionista/admin)
GET    /api/agendamento-experimental/?age_status=pendente → filtro por status
GET    /api/agendamento-experimental/?age_data_agendada=2026-05-15 → filtro por data
POST   /api/agendamento-experimental/                    → criar (público — site e sistema)
PATCH  /api/agendamento-experimental/{id}/               → atualizar status (recepcionista/admin)

# AulaExperimental
GET    /api/aulas-experimentais/              → lista (professor/admin)
POST   /api/aulas-experimentais/              → criar (professor/admin)
GET    /api/aulas-experimentais/{id}/         → detalhe
PATCH  /api/aulas-experimentais/{id}/         → atualizar
```

---

## Parte 2 — Frontend Sistema

### 2.1 — AgendamentosPage (`/operacional/agendamentos`)

3 abas na mesma página:

| Aba | Conteúdo |
|---|---|
| **Horários** | Solicitações do site (`AgendamentoHorario`) — read + delete |
| **Turmas** | Solicitações de turma do site (`AgendamentoTurmas`) — read + delete |
| **Grade de Horários** (nova) | Grid visual Seg–Sex × 06h–21h para gestão de `SlotExperimental` |

**Grade de Horários:**
- Grade Seg–Sex com horários de 06h às 21h
- Célula `+` → mini form (modalidade + vagas) → cria `SlotExperimental`
- Badge no slot → toggle ativo/inativo via PATCH
- Lápis → editar vagas ou remover
- Botão **"Novo Agendamento Experimental"** no header → abre formulário com calendário visual

**Calendário visual de Novo Agendamento:**
```
┌────── Maio 2026 ────────────────┐
│ Seg  Ter  Qua  Qui  Sex         │
│  4    5    6●   7    8●          │  ● = dia com slot disponível
│ 11   12   13●  14   15●          │
│ 18   19   20●  21   22●          │
└─────────────────────────────────┘
Clica no dia → mostra horários disponíveis como botões:
[09:00 · Ambos · 2 vagas]  [17:00 · Pilates · 1 vaga]
→ Selecionar preenche data, hora, slot_id e modalidade automaticamente
```

> ⚠️ Data usa horário **local** (não UTC) para evitar deslocamento de fuso no Brasil.

---

### 2.2 — ExperimentalPage (`/tecnico/experimental`)

Nova página no menu **Técnico** (antes de "Aulas").

**Layout master-detail:**
- Lista à esquerda com filtros: status, modalidade, data
- Clicar no nome → painel de detalhes à direita

**Ações por agendamento:**
| Status atual | Ações disponíveis |
|---|---|
| pendente | Confirmar · Cancelar |
| confirmado | Faltou · Iniciar Aula Experimental |
| realizado | Ver Aula Experimental |
| faltou / cancelado | — |

**Formulário AulaExperimental:**
```
┌─────────────────────────────────────────────────────┐
│ Aula Experimental — Maria Silva                     │
│ 22/05/2026 — Funcional                              │
├─────────────────────────────────────────────────────┤
│ ANAMNESE                                            │
│ Profissão          [________________]               │
│ Doenças Crônicas   [________________]  ← pré-preenchido com age_problema_saude
│ Lesões/Dores       [________________]  ← pré-preenchido com age_problema_saude
│ Objetivo           [________________]               │
├─────────────────────────────────────────────────────┤
│ TESTES FÍSICOS (iguais para Pilates e Funcional)    │
│ Agachamento        [________________]               │
│ Flexibilidade      [________________]               │
│ Equilíbrio         [________________]               │
│ Coordenação        [________________]               │
│ Observações        [________________]               │
├─────────────────────────────────────────────────────┤
│ DECISÃO                                             │
│ ○ Cadastrar como aluno                              │
│ ○ Encerrar sem cadastro                             │
│                          [Finalizar Experimental]   │
└─────────────────────────────────────────────────────┘
```

**Se "Cadastrar como aluno":**
- Modal de cadastro de Aluno pré-preenchido com dados do agendamento:
  ```javascript
  alu_nome:       agendamento.age_nome
  alu_telefone:   agendamento.age_telefone
  alu_nascimento: agendamento.age_nascimento
  ```
- Fluxo ao confirmar:
  1. `POST /api/alunos/` com dados pré-preenchidos
  2. `PATCH /api/aulas-experimentais/{id}/` com `aluno: alu_id, aexp_cadastrou_aluno: true`
  3. `save()` da AulaExperimental seta `age_status='realizado'` automaticamente
  4. Toast: "Aluno cadastrado! Não esqueça de matriculá-lo em uma turma."

---

## Parte 3 — Site Institucional

### Formulário `agendamento.html`

```html
1. Calendário visual (carregado de /api/slots-experimentais/?slot_ativo=true)
   → Grid de semanas Seg–Sex
   → Dias com slots ativos têm marcador visual
   → Clicar no dia → mostra horários disponíveis como botões

2. Horário selecionado → confirma data, hora, slot_id

3. Se slot for "Ambos" → aparece select de modalidade

4. Dados pessoais:
   Nome completo *  |  Telefone *  |  Data de nascimento *

5. Saúde (campo `age_problema_saude`):
   Doenças crônicas ou lesões?
   "Conte-nos tudo, não esconda nada 😊"

6. Disponibilidade de horários (`age_disponibilidade`):
   Quais outros horários você tem disponibilidade?

[Agendar Minha Aula Experimental]
```

**CSS adicionado (`style.css`):**
- `.cal__grid` — grid do calendário
- `.cal__horario-btn` — botão de horário disponível
- `.cal__horario-tag` — badge de modalidade (pilates/funcional/ambos)

**Fallback:** se a API falhar → exibe botão de WhatsApp

**POST público para:** `POST /api/agendamento-experimental/`
**Sem autenticação** — AuditMixin trata `AnonymousUser` como `created_by=None`

---

## Parte 4 — Correções e Fixes

### Fix PWA — Manifest Android
- `vite.config.js`: ícones 192/512 separados em `any` e `maskable`
- Corrigido `scope` para `/sistema/`
- Resolve erro "Add to Home Screen" não funcionando no Android

### Fix datas — Fuso horário Brasil
- Calendário usava `new Date()` que converte para UTC internamente
- Fix: usar `toLocaleDateString('pt-BR')` e construir datas via `year/month/day` sem `new Date(string)` para evitar deslocamento de -3h
- Afeta: calendário visual na `AgendamentosPage` e `ExperimentalPage`

---

## Regras de Negócio

| ID | Regra |
|---|---|
| RN-SLOT-01 | Slot com `slot_ativo=False` não aparece no site |
| RN-SLOT-02 | `vagas_disponiveis` conta só pendente/confirmado com data futura |
| RN-AGE-01 | Status inicial sempre `pendente` |
| RN-AGE-02 | FK `slot` nullable — agendamento manual sem slot é permitido |
| RN-AEXP-01 | 1 agendamento = 1 aula experimental (OneToOne) |
| RN-AEXP-02 | `save()` da AulaExperimental sempre seta `age_status='realizado'` |
| RN-AEXP-03 | Testes físicos são iguais independente de Pilates ou Funcional |
| RN-AEXP-04 | Se `aexp_cadastrou_aluno=True` → vincular `aluno` FK obrigatório |

---

## PKs e FKs da Fase 13

```python
# PKs
SlotExperimental        → slot_id
AgendamentoExperimental → age_id
AulaExperimental        → aexp_id

# FKs no payload (sem sufixo _id)
slot        (AgendamentoExperimental → SlotExperimental)
agendamento (AulaExperimental → AgendamentoExperimental)
func        (AulaExperimental → Funcionario)
aluno       (AulaExperimental → Aluno)
```

---

## O que NÃO fazer

- ❌ POST de agendamento com autenticação obrigatória — é público
- ❌ GET de slots sem filtro `slot_ativo=True` quando usado pelo site
- ❌ Criar AulaExperimental sem AgendamentoExperimental vinculado
- ❌ `new Date('2026-05-13')` diretamente — usa UTC e desloca 1 dia no Brasil
- ❌ `objeto.delete()` — soft delete via API
- ❌ `response.data` em listagens — sempre `response.data.results`

---

## Checklist Fase 13

### Backend:
- [x] Model `SlotExperimental` + migration 0009
- [x] Model `AgendamentoExperimental` + migration 0009
- [x] Model `AulaExperimental` + migration 0009
- [x] FK `slot` tornado nullable — migration 0010
- [x] Endpoints com permissões corretas (GET slots público, POST agendamento público)
- [x] `vagas_disponiveis` property no `SlotExperimental`
- [x] `save()` de `AulaExperimental` atualiza status do agendamento
- [x] 117 testes passando ✅

### Frontend Sistema:
- [x] `AgendamentosPage` — aba "Grade de Horários" com grid Seg–Sex
- [x] Calendário visual de slots no form "Novo Agendamento Experimental"
- [x] `ExperimentalPage` em Técnico com master-detail + ações por status
- [x] Formulário `AulaExperimental` com anamnese + testes + decisão
- [x] Modal de cadastro de Aluno pré-preenchido
- [x] Fix datas: horário local sem deslocamento UTC

### Site Institucional:
- [x] Calendário visual com slots dinâmicos (`/api/slots-experimentais/?slot_ativo=true`)
- [x] Filtra e exibe vagas disponíveis por dia/horário
- [x] Select de modalidade quando slot for "Ambos"
- [x] Mensagem de confirmação após envio
- [x] Fallback WhatsApp se API falhar

### PWA:
- [x] Manifest Android corrigido (scope, ícones 192/512, any + maskable)

---

**🚀 Bora codar! Good luck, Claude Code!**

> ⚠️ SISTEMA EM PRODUÇÃO — testar cada etapa antes de avançar.
