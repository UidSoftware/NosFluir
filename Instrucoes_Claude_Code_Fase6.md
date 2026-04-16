# Instrucoes_Claude_Code_Fase6.md
# Nos Studio Fluir — Uid Software
# Fase 6 — Permissões + Cards Modalidade + Drag & Drop + Relatórios Evolução

## ⚠️ ATENÇÃO — SISTEMA EM PRODUÇÃO

Testar cada grupo antes de avançar.
```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro apps.operacional apps.tecnico --verbosity=2
```

**Pré-requisito:** Fases 4 Refactor e 5 concluídas ✅ (validadas em 16/04/2026)

---

## Contexto do CLAUDE.md v8.1

- 33 models em 4 apps
- `tur_modalidade` já existe em `Turma` ✅
- `@dnd-kit` já instalado ✅
- `ProgramaTurma` e `RegistroExercicioAluno` já existem ✅
- Grupos Django criados mas permissões backend pendentes
- 84 testes passando

---

## GRUPO 1 — Permissões por Perfil

### 1.1 — Criar `apps/core/permissions.py`

```python
from rest_framework.permissions import BasePermission

class IsAdministrador(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return (
            request.user.is_superuser or
            request.user.groups.filter(name='Administrador').exists()
        )

class IsProfessorOuAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return (
            request.user.is_superuser or
            request.user.groups.filter(
                name__in=['Administrador', 'Professor']
            ).exists()
        )

class IsFinanceiroOuAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return (
            request.user.is_superuser or
            request.user.groups.filter(
                name__in=['Administrador', 'Financeiro']
            ).exists()
        )

class IsRecepcionistaOuAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return (
            request.user.is_superuser or
            request.user.groups.filter(
                name__in=['Administrador', 'Recepcionista']
            ).exists()
        )
```

---

### 1.2 — Aplicar permissões nos ViewSets

**App `financeiro` → `IsFinanceiroOuAdmin`:**
```
ContasPagarViewSet, ContasReceberViewSet, LivroCaixaViewSet,
PlanosPagamentosViewSet, FolhaPagamentoViewSet,
FornecedorViewSet, ServicoProdutoViewSet
```

**App `tecnico` → `IsProfessorOuAdmin`:**
```
ExercicioViewSet, FichaTreinoViewSet, FichaTreinoExerciciosViewSet,
MinistrarAulaViewSet, AulasViewSet, CreditoReposicaoViewSet,
ProgramaTurmaViewSet, RegistroExercicioAlunoViewSet,
AparelhoViewSet, AcessorioViewSet
```

**App `operacional` → `IsRecepcionistaOuAdmin`:**
```
AlunoViewSet, TurmaViewSet, TurmaAlunosViewSet, FichaAlunoViewSet,
FuncionarioViewSet, ProfissaoViewSet
```

**Manter AllowAny (não alterar):**
```
AgendamentoHorarioViewSet  ← POST público do site institucional
AgendamentoTurmasViewSet   ← POST público do site institucional
TokenObtainPairView        ← login
TokenRefreshView           ← refresh
```

**Admin apenas:**
```
UserViewSet           ← já usa IsAdminUser — manter
FolhaPagamentoViewSet ← só admin vê folha de pagamento
```

---

### 1.3 — Confirmar `/api/me/` retorna grupos

```python
class UserSerializer(serializers.ModelSerializer):
    groups = serializers.SerializerMethodField()

    def get_groups(self, obj):
        return list(obj.groups.values_list('name', flat=True))

    class Meta:
        fields = ['id', 'email', 'first_name', 'last_name',
                  'is_superuser', 'groups']
```

---

### 1.4 — Frontend — PerfilRoute

```jsx
const PerfilRoute = ({ perfisPermitidos, children }) => {
    const { user } = useAuthStore()
    const perfil = user?.groups?.[0] ||
                   (user?.is_superuser ? 'Administrador' : null)

    if (!perfisPermitidos.includes(perfil)) {
        return <Navigate to="/dashboard" replace />
    }
    return children
}

// Aplicar nas rotas:
<Route path="/financeiro/*" element={
    <PerfilRoute perfisPermitidos={['Administrador', 'Financeiro']}>
        <FinanceiroRoutes />
    </PerfilRoute>
} />

<Route path="/tecnico/*" element={
    <PerfilRoute perfisPermitidos={['Administrador', 'Professor']}>
        <TecnicoRoutes />
    </PerfilRoute>
} />
```

---

### 1.5 — Testar com cada perfil

```
Professor  → tenta /financeiro → redireciona /dashboard ✅
Financeiro → tenta /tecnico   → redireciona /dashboard ✅
Recepcionista → tenta /financeiro → redireciona /dashboard ✅
Administrador → acessa tudo ✅
```

→ Rodar testes ✅

---

## GRUPO 2 — Cards por Modalidade: Exercícios

**Arquivo:** `ExerciciosPage.jsx`

`exe_modalidade` já existe — apenas separação visual.

```
┌─────────────────────────────────────────────────────┐
│ 🧘 Mat Pilates                    [▼]   [+ Novo]    │
├─────────────────────────────────────────────────────┤
│  The Hundred — Reformer                [✏️] [🗑️]   │
│  Single Leg Stretch — Solo             [✏️] [🗑️]   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 💪 Funcional                      [▼]   [+ Novo]    │
├─────────────────────────────────────────────────────┤
│  Afundo + Rotação — Polia              [✏️] [🗑️]   │
│  Wallball — Parede                     [✏️] [🗑️]   │
└─────────────────────────────────────────────────────┘
```

- Cards iniciam expandidos — ícone `▼` → `▶` ao colapsar
- Botão `[+ Novo]` pré-seleciona a modalidade do card
- Exercícios sem modalidade → card "Sem modalidade" no final

```jsx
const [expandido, setExpandido] = useState({ pilates: true, funcional: true })
const exerciciosPilates   = exercicios.filter(e => e.exe_modalidade === 'pilates')
const exerciciosFuncional = exercicios.filter(e => e.exe_modalidade === 'funcional')
```

→ Rodar testes ✅

---

## GRUPO 3 — Cards por Modalidade: Turmas

**Arquivo:** `TurmasPage.jsx`

`tur_modalidade` já existe ✅ — apenas separação visual.

```
┌─────────────────────────────────────────────────────┐
│ 🧘 Mat Pilates                    [▼]   [+ Nova]    │
├─────────────────────────────────────────────────────┤
│  Pilates Seg/Qua 17:00   8/15 alunos   [✏️] [👥]   │
│  Pilates Ter/Qui 18:30   12/15 alunos  [✏️] [👥]   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 💪 Funcional                      [▼]   [+ Nova]    │
├─────────────────────────────────────────────────────┤
│  Funcional Seg 17:00     5/15 alunos   [✏️] [👥]   │
│  Funcional Qua 19:00     10/15 alunos  [✏️] [👥]   │
└─────────────────────────────────────────────────────┘
```

- Mesmo padrão dos exercícios
- Botão `[+ Nova]` pré-seleciona modalidade
- Turmas com `tur_modalidade` null → card "Sem modalidade"

→ Rodar testes ✅

---

## GRUPO 4 — Drag & Drop na MinistrarAulaPage

**Arquivo:** `MinistrarAulaPage.jsx`
**Biblioteca:** `@dnd-kit` já instalado ✅

O card de exercícios fica acima da lista de presença.
Professora reordena exercícios durante a aula — **salva no banco**.

### Comportamento:
- Handle: `GripVertical` (lucide-react) à esquerda de cada exercício
- Arrastar dentro da seção → reordena `ftex_ordem`
- Arrastar para outra seção → muda `secao` FK + reordena
- Ao soltar → `PATCH /api/fichas-treino-exercicios/{id}/`
- Visual: opacidade reduzida no item arrastado
- Mobile: touch funciona (`PointerSensor`)

### Layout:
```
┌─ Potência ──────────────────────────────────────────┐
│ ⣿  1. Afundo + Rotação — Polia — 3x12              │
│ ⣿  2. Wallball — Parede — 3x10                     │
└─────────────────────────────────────────────────────┘
┌─ Força ─────────────────────────────────────────────┐
│ ⣿  3. Glúteo no Step — 3x15                        │
│ ⣿  4. Supino — Banco/Halter — 3x12                 │
└─────────────────────────────────────────────────────┘
```

> ⚠️ Reutilizar o padrão já implementado na `FichaTreinoPage` —
> não reinventar, apenas adaptar para o contexto da MinistrarAulaPage.

```jsx
const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    await api.patch(`/api/fichas-treino-exercicios/${active.id}/`, {
        ftex_ordem: novaOrdem,
        secao: novaSecao  // se mudou de seção
    })

    setExercicios(reordenar(exercicios, active.id, novaOrdem))
}
```

→ Rodar testes ✅

---

## GRUPO 5 — Relatórios de Evolução

Base de dados já pronta:
- `RegistroExercicioAluno` com carga/séries/reps/obs ✅
- `aul_numero_ciclo` + `aul_posicao_ciclo` em `Aulas` ✅

### 5.1 — Gráfico evolução de carga por exercício

**Rota:** `/relatorios/evolucao-carga`
**Menu:** Relatórios → Evolução de Carga

**Filtros:** Aluno + Exercício + Período (opcional)

**Endpoint a criar:**
```
GET /api/relatorios/evolucao-carga/?alu={id}&exe={id}
→ retorna [{ ciclo, posicao, data, carga, series, repeticoes, observacoes }]
   ordenado por ciclo + posicao
```

**Query backend:**
```python
RegistroExercicioAluno.objects.filter(
    ministrar_aula__aula__tur__turma_alunos__alu=aluno,
    ftex__exe=exercicio
).select_related(
    'ministrar_aula__aula'
).order_by(
    'ministrar_aula__aula__aul_numero_ciclo',
    'ministrar_aula__aula__aul_posicao_ciclo'
)
```

**Gráfico (Recharts LineChart):**
- Eixo X: "Ciclo 1 — Pos 1", "Ciclo 1 — Pos 3"...
- Eixo Y: carga (valor numérico extraído de `reg_carga`)
- Linha de evolução ao longo dos ciclos

---

### 5.2 — Comparativo ciclo a ciclo

Na `AulasPage`, ao clicar em uma aula → comparativo com mesma posição do ciclo anterior:

```
┌─────────────────────────────────────────────────────┐
│ Funcional 1 — Posição 3 — Ciclo 2 (22/04)          │
├──────────────────────┬──────────────────────────────┤
│ Ciclo 1 (08/04)      │ Ciclo 2 (22/04)             │
├──────────────────────┼──────────────────────────────┤
│ Luiz                 │ Luiz                         │
│ Supino: 5kg          │ Supino: 8kg ↑               │
│ Obs: cansado         │ Obs: boa energia             │
└──────────────────────┴──────────────────────────────┘
```

**Query:**
```python
aula_anterior = Aulas.objects.filter(
    tur=aula_atual.tur,
    aul_posicao_ciclo=aula_atual.aul_posicao_ciclo,
    aul_numero_ciclo=aula_atual.aul_numero_ciclo - 1
).first()
```

---

### 5.3 — Gráfico PSE ao longo dos ciclos

**Rota:** `/graficos/evolucao-pse`
**Menu:** Gráficos → Evolução PSE

Recharts LineChart:
- Eixo X: posição no ciclo (1 a N)
- Eixo Y: PSE médio da turma (6-20)
- Múltiplas linhas: ciclo 1, ciclo 2, ciclo 3...

Permite ver se alunos estão ficando mais condicionados
(mesma posição com PSE menor nos ciclos seguintes).

→ Rodar testes ✅

---

## Ordem de execução obrigatória

```
GRUPO 1 → GRUPO 2 → GRUPO 3 → GRUPO 4 → GRUPO 5
```

Cada grupo testado antes de avançar.

---

## O que NÃO fazer

- ❌ Remover AllowAny dos agendamentos do site
- ❌ Bloquear admin de qualquer endpoint
- ❌ Reinventar drag & drop — reutilizar padrão FichaTreinoPage
- ❌ `objeto.delete()` — soft delete via API
- ❌ Float para dinheiro
- ❌ `response.data` — sempre `response.data.results`
- ❌ Alterar `base: '/sistema/'` no vite.config.js
- ❌ Criar outro `CLAUDE.md`
- ❌ Comitar `.env`

---

## Checklist Fase 6

### Grupo 1 — Permissões:
- [ ] `apps/core/permissions.py` criado
- [ ] Financeiro restrito a Financeiro + Admin
- [ ] Técnico restrito a Professor + Admin
- [ ] Operacional restrito a Recepcionista + Admin
- [ ] Agendamentos mantidos AllowAny
- [ ] `/api/me/` retornando grupos
- [ ] `PerfilRoute` no frontend
- [ ] Testado com cada perfil
- [ ] Testes passando ✅

### Grupo 2 — Cards Exercícios:
- [ ] Dois cards colapsáveis Pilates / Funcional
- [ ] Botão novo pré-seleciona modalidade
- [ ] Testes passando ✅

### Grupo 3 — Cards Turmas:
- [ ] Dois cards colapsáveis Pilates / Funcional
- [ ] Botão nova pré-seleciona modalidade
- [ ] Turmas sem modalidade exibidas separadamente
- [ ] Testes passando ✅

### Grupo 4 — Drag & Drop MinistrarAula:
- [ ] Handle GripVertical nos exercícios
- [ ] Reordenação dentro da seção
- [ ] Mover entre seções com mudança de secao FK
- [ ] PATCH atualiza ftex_ordem + secao no banco
- [ ] Funciona no mobile (touch)
- [ ] Testes passando ✅

### Grupo 5 — Relatórios Evolução:
- [ ] Endpoint `/api/relatorios/evolucao-carga/`
- [ ] Gráfico evolução de carga (LineChart)
- [ ] Comparativo ciclo a ciclo na AulasPage
- [ ] Gráfico PSE por ciclo
- [ ] Testes passando ✅

---

**🚀 Bora codar! Good luck, Claude Code!**

> ⚠️ SISTEMA EM PRODUÇÃO — testar cada grupo antes de avançar.
