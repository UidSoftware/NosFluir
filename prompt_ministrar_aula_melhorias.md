# Prompt Claude Code — Melhorias MinistrarAulaPage
# Sistema Nos Studio Fluir — Uid Software

## Contexto

Leia o `CLAUDE.md` antes de qualquer ação.

A tela de **Ministrar Aula** tem duas etapas já implementadas:

**Tela 1 — Configurar Aula** (step inicial):
- Seleciona Turma, Professor, Ficha de Treino (opcional), Data
- Clica "Iniciar Aula" → vai para a Tela 2

**Tela 2 — Registro da Aula** (step após iniciar):
- Lista os alunos matriculados na turma
- Coleta presença, pressão arterial e intensidade
- Clica "Finalizar Aula" → salva no banco

---

## Melhorias a implementar

### 1. Ícones nos botões de presença

Substituir o texto dos botões por ícones do `lucide-react` (já instalado):

```jsx
// Antes: texto
<Button>Presente</Button>
<Button>Falta</Button>
<Button>Reposição</Button>

// Depois: ícones
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'

<Button title="Presente"><CheckCircle size={18} /></Button>
<Button title="Falta"><XCircle size={18} /></Button>
<Button title="Reposição"><RefreshCw size={18} /></Button>
```

Manter o atributo `title` para tooltip ao passar o mouse.
Manter as cores de destaque quando selecionado (active state).

---

### 2. Campos numa linha só (grid compacto)

Os campos P.A. Inicial, P.A. Final e Intensidade devem ficar na mesma linha,
compactos, lado a lado:

```jsx
// Layout atual: campos grandes, empilhados
// Layout novo: grid-cols-3, campos menores

<div className="grid grid-cols-3 gap-2 mt-2">
  <div>
    <label className="text-xs text-gray-400">P.A. Inicial</label>
    <input placeholder="120/80" className="w-full text-sm px-2 py-1 ..." />
  </div>
  <div>
    <label className="text-xs text-gray-400">P.A. Final</label>
    <input placeholder="120/80" className="w-full text-sm px-2 py-1 ..." />
  </div>
  <div>
    <label className="text-xs text-gray-400">Intensidade (0-10)</label>
    <input type="number" min="0" max="10" className="w-full text-sm px-2 py-1 ..." />
  </div>
</div>
```

No mobile (telas pequenas) pode colapsar para `grid-cols-1`, mas no desktop
os 3 campos ficam obrigatoriamente na mesma linha.

---

### 3. Nome real do aluno

**Observação importante:** a Tela 1 já busca os alunos da turma para exibir
*"2 aluno(s) matriculado(s)"* — ou seja, os dados dos alunos **já estão em
memória** quando a Tela 2 é renderizada. Não fazer novo fetch — apenas passar
os alunos via state/prop da Tela 1 para a Tela 2.

Substituir "Aluno 1", "Aluno 2" pelo `alu_nome` real:

```jsx
// Antes
<h3>Aluno {index + 1}</h3>

// Depois
<h3>{aluno.alu_nome}</h3>
```

---

### 4. Card de exercícios da ficha (antes da lista de chamada)

Quando uma Ficha de Treino foi selecionada na Tela 1 (`fitr_id` disponível),
exibir um card colapsável com os exercícios da ficha ANTES da lista de alunos.

**Busca:**
```javascript
GET /api/ficha-exercicios/?fitr_id={fitr_id}
// retorna: response.data.results (paginado)
// campos relevantes: ftex_ordem, ftex_repeticoes, ftex_series,
//                   ftex_observacoes, exe_nome, exe_aparelho
```

**Layout do card:**
```
┌─────────────────────────────────────────────────┐
│ 📋 Fortalecimento de Core - Nível 1        [▼]  │  ← colapsável
├─────────────────────────────────────────────────┤
│  1. The Hundred — Reformer — 3x10               │
│  2. Single Leg Stretch — Solo — 3x12            │
│  3. Double Leg Stretch — Solo — 3x10            │
│     Obs: manter lombar apoiada                  │
└─────────────────────────────────────────────────┘
```

- Card começa **expandido** por padrão
- Botão de colapsar no canto superior direito (chevron)
- Se nenhuma ficha foi selecionada, não renderizar o card
- Ordenar por `ftex_ordem`
- Mostrar: `ftex_ordem`. `exe_nome` — `exe_aparelho` — `ftex_series`x`ftex_repeticoes`
- Se tiver `ftex_observacoes`, exibir em itálico abaixo do exercício

---

### 5. Estado local durante a aula (CRÍTICO)

**Problema atual:** os campos de pressão e intensidade podem estar sendo
enviados ao banco antes de "Finalizar Aula", ou os dados ficam inconsistentes
porque P.A. Inicial é coletada no começo e P.A. Final/Intensidade só no fim.

**Solução:** todo o estado da chamada fica em memória React durante a aula.
**Nada vai ao banco até clicar em "Finalizar Aula".**

```javascript
// Estado local — um objeto por aluno
const [registros, setRegistros] = useState(() =>
  alunos.reduce((acc, aluno) => ({
    ...acc,
    [aluno.alu_id]: {
      presenca: 'presente',   // default
      pa_inicial: '',
      pa_final: '',
      intensidade: '',
    }
  }), {})
)

// Atualizar campo individual via onChange (sem POST)
const atualizarRegistro = (alu_id, campo, valor) => {
  setRegistros(prev => ({
    ...prev,
    [alu_id]: { ...prev[alu_id], [campo]: valor }
  }))
}

// Somente ao clicar "Finalizar Aula" → POST em batch
const finalizarAula = async () => {
  const payload = alunos.map(aluno => ({
    tur: turmaSelecionada,
    func: professorSelecionado,
    fitr: fichaSelecionada || null,
    aul_data: dataSelecionada,
    aul_hora_inicio: horaInicio,
    aul_hora_final: new Date().toTimeString().slice(0, 8),
    alu: aluno.alu_id,
    aul_tipo_presenca: registros[aluno.alu_id].presenca,
    aul_pressao_inicio: registros[aluno.alu_id].pa_inicial || null,
    aul_pressao_final: registros[aluno.alu_id].pa_final || null,
    aul_intensidade_esforco: registros[aluno.alu_id].intensidade || null,
  }))

  // Enviar um POST por aluno (ou batch se o backend suportar)
  await Promise.all(payload.map(p => api.post('/api/aulas/', p)))
}
```

**Regras importantes:**
- `pa_inicial` e `pa_final`: validar formato `^\d{2,3}\/\d{2}$` antes de salvar
- `intensidade`: número entre 0 e 10
- Campos opcionais — não bloquear "Finalizar Aula" se estiverem vazios
- `presenca` é obrigatório — default 'presente' já resolvido pelo estado inicial

---

## Resumo das mudanças

| O que muda | Arquivo(s) |
|---|---|
| Ícones nos botões | `MinistrarAulaPage.jsx` |
| Grid compacto 3 colunas | `MinistrarAulaPage.jsx` |
| Nome real do aluno | `MinistrarAulaPage.jsx` |
| Card de exercícios | `MinistrarAulaPage.jsx` + fetch `/api/ficha-exercicios/` |
| Estado local completo | `MinistrarAulaPage.jsx` |

Todas as mudanças são no mesmo arquivo — sem novos componentes necessários,
a menos que o Claude Code julgue necessário extrair o card de exercícios.

---

## O que NÃO mudar

- Tela 1 (Configurar Aula) — não mexer
- Fluxo de navegação entre steps — não mexer
- Endpoints de API — não criar novos, usar os existentes
- Lógica de reposição já implementada — não mexer

---

**Bora codar! 🚀**
