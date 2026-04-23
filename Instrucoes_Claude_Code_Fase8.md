# Instrucoes_Claude_Code_Fase8.md
# Nos Studio Fluir — Uid Software
# Fase 8 — Sistema de Aviso de Falta e Créditos de Reposição

## ⚠️ ATENÇÃO — SISTEMA EM PRODUÇÃO

Testar cada etapa antes de avançar.
```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro apps.operacional apps.tecnico --verbosity=2
```

**Pré-requisito:** Fase 7 concluída ✅

---

## Contexto

O sistema atual gera créditos de reposição apenas quando a professora
marca `miau_tipo_falta = 'justificada'` durante a aula — sem controle
de antecedência real e sem registro do momento do aviso.

Esta fase implementa o sistema completo com 3 momentos possíveis
de registro, garantindo o direito do aluno em qualquer cenário.

---

## Fluxo Completo — 3 Momentos de Registro

```
MOMENTO 1 — Antes da aula (responsável registra)
Aluno avisa → responsável lança AvisoFalta no sistema
→ sistema calcula antecedência automaticamente
→ signal gera CreditoReposicao imediatamente
→ na hora da aula: professor vê "avisou ✅" e marca falta justificada

MOMENTO 2 — Durante a aula (professor registra)
Responsável esqueceu → professor pergunta durante a aula
→ professor lança AvisoFalta na hora
→ sistema calcula antecedência retroativamente
→ signal gera CreditoReposicao

MOMENTO 3 — Após a aula (lançamento retroativo)
Responsável + professor esqueceram
→ qualquer um lança AvisoFalta depois da aula
→ sistema aceita e gera crédito retroativamente
→ protege o direito do aluno juridicamente
```

> O sistema **não restringe** quando o AvisoFalta pode ser criado.
> Sempre calcula antecedência com base em `avi_data_hora_aviso`
> vs `avi_data_aula + tur_horario`. O direito é do aluno.

---

## ETAPA 1 — Nova tabela `AvisoFalta`

**App:** `operacional`

```python
class AvisoFalta(BaseModel):
    TIPO_CHOICES = [
        ('justificada', 'Justificada'),
        ('atestado',    'Atestado Médico'),
    ]

    aluno = models.ForeignKey(
        'Aluno',
        on_delete=models.PROTECT,
        related_name='avisos_falta'
    )
    turma = models.ForeignKey(
        'Turma',
        on_delete=models.PROTECT,
        related_name='avisos_falta'
    )

    avi_data_hora_aviso = models.DateTimeField()
    # Quando o aluno avisou — preenchido por quem registra
    # Pode ser antes, durante ou após a aula

    avi_data_aula = models.DateField()
    # Para qual aula o aviso se refere

    avi_tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)

    avi_antecedencia_horas = models.DecimalField(
        max_digits=6, decimal_places=2,
        null=True, blank=True
    )
    # Calculado automaticamente no save()
    # = (avi_data_aula + turma.tur_horario) - avi_data_hora_aviso

    avi_gera_credito = models.BooleanField(default=False)
    # Calculado automaticamente no save()
    # True se antecedência entre 1h e 48h OU tipo = atestado
    # Cenário 3 (>48h): implementar conforme decisão da reunião

    avi_observacoes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'aviso_falta'
        verbose_name = 'Aviso de Falta'
        verbose_name_plural = 'Avisos de Falta'
        ordering = ['-avi_data_hora_aviso']

    def save(self, *args, **kwargs):
        # Calcular antecedência em horas
        from datetime import datetime, timedelta
        import pytz

        # Montar datetime da aula usando horário da turma
        # tur_horario é string ex: "Seg/Qua 17:00" — extrair hora
        # Usar avi_data_aula + hora extraída de tur_horario
        hora_aula = self._extrair_hora_turma()
        if hora_aula:
            dt_aula = datetime.combine(self.avi_data_aula, hora_aula)
            dt_aviso = self.avi_data_hora_aviso
            if dt_aviso.tzinfo:
                dt_aula = pytz.utc.localize(dt_aula)
            diff = dt_aula - dt_aviso
            self.avi_antecedencia_horas = round(diff.total_seconds() / 3600, 2)

        # Definir se gera crédito
        if self.avi_tipo == 'atestado':
            self.avi_gera_credito = True
        elif self.avi_antecedencia_horas is not None:
            # Entre 1h e 48h → gera crédito
            self.avi_gera_credito = (
                1 <= self.avi_antecedencia_horas <= 48
            )
            # Cenário 3 (>48h): pendente de decisão — não gera por ora

        super().save(*args, **kwargs)

    def _extrair_hora_turma(self):
        """Extrai objeto time do campo tur_horario da turma."""
        import re
        from datetime import time
        match = re.search(r'(\d{2}):(\d{2})', self.turma.tur_horario)
        if match:
            return time(int(match.group(1)), int(match.group(2)))
        return None

    def __str__(self):
        return f"Aviso {self.aluno} — {self.avi_data_aula} ({self.avi_tipo})"
```

**Migration:** `fase8_aviso_falta`

---

## ETAPA 2 — Refatorar `CreditoReposicao`

Adicionar FK para `AvisoFalta` como origem do crédito.
Manter `aula_origem` como nullable por retrocompatibilidade.

```python
# Adicionar em CreditoReposicao:
aviso_falta = models.OneToOneField(
    'operacional.AvisoFalta',
    on_delete=models.PROTECT,
    null=True, blank=True,
    related_name='credito'
)
# OneToOne — 1 aviso gera no máximo 1 crédito
```

**Migration:** `fase8_credito_aviso_fk`

---

## ETAPA 3 — Signal em `AvisoFalta`

Ao criar um `AvisoFalta` com `avi_gera_credito=True`:
→ criar `CreditoReposicao` automaticamente

```python
# apps/operacional/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction

@receiver(post_save, sender=AvisoFalta)
def gerar_credito_por_aviso(sender, instance, created, **kwargs):
    if not created:
        return
    if not instance.avi_gera_credito:
        return

    from apps.tecnico.models import CreditoReposicao
    from datetime import date, timedelta

    with transaction.atomic():
        # Verificar se já existe crédito para este aviso
        ja_existe = CreditoReposicao.objects.filter(
            aviso_falta=instance
        ).exists()
        if ja_existe:
            return

        # Verificar limite de 3 créditos simultâneos
        creditos_ativos = CreditoReposicao.objects.filter(
            aluno=instance.aluno,
            cred_status='disponivel'
        ).count()
        if creditos_ativos >= 3:
            return

        CreditoReposicao.objects.create(
            aluno=instance.aluno,
            aviso_falta=instance,
            cred_data_geracao=date.today(),
            cred_data_expiracao=date.today() + timedelta(days=30),
            cred_usado=False,
            cred_status='disponivel',
            created_by=instance.created_by,
            updated_by=instance.updated_by,
        )
```

---

## ETAPA 4 — Atualizar signal existente em `MinistrarAula`

O signal atual gera crédito ao marcar `miau_tipo_falta = 'justificada'`.
Agora deve **verificar se já existe `AvisoFalta`** para não duplicar o crédito.

```python
# apps/tecnico/signals.py — atualizar gerar_credito_reposicao

@receiver(post_save, sender=MinistrarAula)
def gerar_credito_reposicao(sender, instance, **kwargs):
    if instance.miau_tipo_presenca != 'falta':
        return
    if instance.miau_tipo_falta not in ['justificada', 'atestado']:
        return

    from apps.operacional.models import AvisoFalta

    # Verificar se já existe AvisoFalta para esse aluno/turma/data
    # Se sim → crédito já foi gerado pelo signal do AvisoFalta
    aviso_existe = AvisoFalta.objects.filter(
        aluno=instance.alu,
        turma=instance.aula.tur,
        avi_data_aula=instance.aula.aul_data,
        avi_gera_credito=True
    ).exists()

    if aviso_existe:
        return  # Crédito já gerado — não duplicar

    # Se não existe AvisoFalta mas tipo é justificada
    # (professor marcou diretamente sem aviso prévio registrado)
    # Gerar crédito normalmente — sem verificar antecedência
    # (professor assume responsabilidade)
    # ... lógica existente de criação do crédito
```

---

## ETAPA 5 — Endpoints

```
# AvisoFalta
GET    /api/avisos-falta/                    → lista (admin/recepcionista)
POST   /api/avisos-falta/                    → registrar aviso
GET    /api/avisos-falta/?alu={id}           → avisos do aluno
GET    /api/avisos-falta/?tur={id}&data={d}  → avisos de uma turma/data
GET    /api/avisos-falta/{id}/
```

---

## ETAPA 6 — Frontend

### 6.1 — Tela "Avisos de Falta" (`/operacional/avisos-falta`)

**Visível para:** Administrador e Recepcionista

```
┌─────────────────────────────────────────────────────┐
│ Avisos de Falta                        [+ Novo]     │
├─────────────────────────────────────────────────────┤
│ Filtros: [Aluno ▼] [Turma ▼] [Data]  [Buscar]      │
├─────────────────────────────────────────────────────┤
│ Aluno          Turma         Data Aula  Tipo  Cred  │
│ Maria Silva    Pilates 17h   22/04      Just  ✅    │
│ João Santos    Funcional     20/04      Atst  ✅    │
│ Pedro Lima     Pilates 17h   18/04      Just  ❌    │
└─────────────────────────────────────────────────────┘
```

**Formulário (modal):**
```
Aluno *           [select com busca]
Turma *           [select]
Data da Aula *    [date]
Data/Hora Aviso * [datetime] ← quando o aluno avisou de fato
Tipo *            [Justificada / Atestado Médico]
Observações       [textarea]

─────────────────────────────────────
Antecedência calculada: 26.5 horas ✅ Gera crédito
```

- Após salvar: mostrar se gerou crédito ou não
- Pode ser registrado antes, durante ou após a aula

---

### 6.2 — MinistrarAulaPage — indicador de aviso prévio

Na lista de alunos, mostrar badge se o aluno já tem `AvisoFalta` registrado:

```
┌─────────────────────────────────────────────────────┐
│ Maria Silva  📋 Avisou  ✅ ❌ 🔄                    │
│  ↑ badge verde "Avisou" se tem AvisoFalta para hoje │
└─────────────────────────────────────────────────────┘
```

- Buscar: `GET /api/avisos-falta/?tur={id}&data={hoje}`
- Se aluno tem aviso → mostrar badge `📋 Avisou`
- Professor sabe na hora quem avisou sem precisar perguntar

---

### 6.3 — MinistrarAulaPage — campo data/hora aviso ao marcar falta

**Já existe** o fluxo de botões de falta com opções de tipo.
Apenas adicionar campo `Quando avisou?` quando tipo for `justificada` ou `atestado`:

```
Ao clicar ❌ falta:

○ Sem aviso         → sem campo extra
○ Justificada       → aparece: Quando avisou? [datetime input]
○ Atestado médico   → aparece: Quando avisou? [datetime input]
```

**Comportamento:**
- Campo `Quando avisou?` aparece inline logo abaixo das opções
- Default: data/hora atual (professor ajusta se necessário)
- Ao "Finalizar Aula" → cria `AvisoFalta` com `avi_data_hora_aviso` preenchido
- Signal gera `CreditoReposicao` automaticamente

```jsx
// No estado local por aluno — adicionar:
{
    presenca: 'falta',
    tipo_falta: 'justificada',
    data_hora_aviso: new Date().toISOString(), // default agora
}

// Exibir campo extra condicionalmente:
{['justificada', 'atestado'].includes(registro.tipo_falta) && (
    <input
        type="datetime-local"
        value={registro.data_hora_aviso}
        onChange={...}
        label="Quando o aluno avisou?"
    />
)}
```

> ⚠️ Não criar novo fluxo — apenas expandir o que já existe.

---

### 6.4 — Perfil do Aluno — histórico de avisos e créditos

Na `AlunoDetails`, adicionar seção:

```
┌─────────────────────────────────────────────────────┐
│ 📋 Avisos e Créditos                                │
├─────────────────────────────────────────────────────┤
│ Créditos disponíveis: 🪙🪙                          │
│ Próximo a expirar: 09/05/2026                       │
│                                                     │
│ Histórico de avisos:                                │
│ 22/04 — Pilates 17h — Justificada — ✅ crédito     │
│ 10/04 — Funcional  — Atestado    — ✅ crédito      │
│ 01/03 — Pilates 17h — Justificada — ❌ expirou     │
└─────────────────────────────────────────────────────┘
```

---

## Ordem de execução obrigatória

```
ETAPA 1 — Model AvisoFalta + migration
ETAPA 2 — FK aviso_falta em CreditoReposicao + migration
ETAPA 3 — Signal AvisoFalta → CreditoReposicao
ETAPA 4 — Atualizar signal MinistrarAula (evitar duplicata)
ETAPA 5 — Endpoints
ETAPA 6 — Frontend
  6.1 Tela Avisos de Falta
  6.2 Badge "Avisou" na MinistrarAulaPage
  6.3 Mini-form de aviso durante a aula
  6.4 Histórico no perfil do aluno
→ Rodar testes em cada etapa ✅
```

---

## Regras de Negócio

| ID | Regra |
|---|---|
| RN-AVI-01 | Aviso pode ser registrado antes, durante ou após a aula |
| RN-AVI-02 | Antecedência calculada: `(data_aula + hora_turma) - data_hora_aviso` |
| RN-AVI-03 | Gera crédito se antecedência entre 1h e 48h |
| RN-AVI-04 | Atestado médico gera crédito independente do prazo |
| RN-AVI-05 | Cenário 3 (>48h): não gera crédito por ora — pendente reunião |
| RN-AVI-06 | 1 aviso = no máximo 1 crédito (OneToOne) |
| RN-AVI-07 | Limite de 3 créditos simultâneos por aluno |
| RN-AVI-08 | Se AvisoFalta já gerou crédito, signal da MinistrarAula não duplica |

---

## O que NÃO fazer

- ❌ Restringir data/hora do registro — aviso pode ser retroativo
- ❌ Duplicar crédito se AvisoFalta já existe para a aula
- ❌ Deletar créditos existentes — só criar novos via AvisoFalta
- ❌ `objeto.delete()` — soft delete via API
- ❌ Float para dinheiro
- ❌ `response.data` — sempre `response.data.results`
- ❌ Alterar `base: '/sistema/'` no vite.config.js
- ❌ Criar outro `CLAUDE.md`

---

## Checklist Fase 8

### Backend:
- [ ] Model `AvisoFalta` criado com cálculo automático de antecedência
- [ ] FK `aviso_falta` em `CreditoReposicao`
- [ ] Signal `AvisoFalta` → `CreditoReposicao`
- [ ] Signal `MinistrarAula` atualizado — sem duplicata
- [ ] Endpoints `/api/avisos-falta/` funcionando
- [ ] Testes passando ✅

### Frontend:
- [ ] Tela Avisos de Falta (admin/recepcionista)
- [ ] Badge "Avisou" na MinistrarAulaPage
- [ ] Mini-form de aviso durante a aula
- [ ] Histórico no perfil do aluno
- [ ] Testes passando ✅

---

**🚀 Bora codar! Good luck, Claude Code!**

> ⚠️ SISTEMA EM PRODUÇÃO — seguir a ordem, testar cada etapa.
