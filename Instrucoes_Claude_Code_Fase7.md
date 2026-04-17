# Instrucoes_Claude_Code_Fase7.md
# Nos Studio Fluir — Uid Software
# Fase 7 — Remodelagem UX Mobile

## ⚠️ ATENÇÃO — SISTEMA EM PRODUÇÃO

Testar cada item antes de avançar.
```bash
docker exec nosfluir-backend-1 python manage.py test \
  apps.financeiro apps.operacional apps.tecnico --verbosity=2
```

**Pré-requisito:** Fase 6 concluída ✅

---

## 7.1 — MinistrarAula: Modalidade primeiro

**Arquivo:** `MinistrarAulaPage.jsx`

**Problema atual:** Tela 1 (Configurar Aula) mostra todas as turmas e fichas
juntas independente da modalidade.

**Solução:** Adicionar select de modalidade como **primeiro campo** —
ao selecionar, filtra turmas e fichas da modalidade escolhida.

### Novo fluxo da Tela 1:

```
┌─────────────────────────────────────────┐
│ Configurar Aula                         │
│                                         │
│ Modalidade *                            │
│ [  Mat Pilates  ▼  ]                   │  ← 1º campo
│                                         │
│ Turma *                                 │
│ [  Pilates Seg 17:00  ▼  ]             │  ← filtra por modalidade
│                                         │
│ Professor ministrando *                 │
│ [  Giulia Fagionato  ▼  ]              │
│                                         │
│ Ficha de Treino (opcional)              │
│ [  Core Nível 1  ▼  ]                  │  ← filtra por modalidade
│                                         │
│ Data da Aula *                          │
│ [  17/04/2026  ]                        │
│                                         │
│ 3 aluno(s) matriculado(s)               │
│                                         │
│ [▶ Iniciar Aula]                        │
└─────────────────────────────────────────┘
```

### Regras:
- Ao selecionar modalidade → filtrar turmas: `GET /api/turmas/?tur_modalidade=pilates`
- Ao selecionar modalidade → filtrar fichas: `GET /api/fichas-treino/?fitr_modalidade=pilates`
- Incluir fichas com `fitr_modalidade=null` nas duas modalidades (fichas sem modalidade definida)
- Ao trocar modalidade → limpar seleção de turma e ficha
- Modalidade pré-selecionada se usuário só tem uma modalidade na turma

---

## 7.2 — MinistrarAula: Alunos colapsáveis + nome colorido

**Arquivo:** `MinistrarAulaPage.jsx`

### 7.2.1 — Nome colorido por modalidade

```jsx
// Cor do nome baseada na modalidade da aula
const corNome = modalidade === 'pilates'
    ? 'text-primary'    // roxo #5D5CE0
    : 'text-secondary'  // cyan #01E2CD
```

### 7.2.2 — Card do aluno colapsável

**Problema atual:** no mobile é preciso rolar a tela várias vezes para
ver todos os alunos com todos os campos expandidos.

**Solução:** cada aluno começa **colapsado** — só mostra nome e botões
de presença. Ao clicar no nome → expande os campos.

### Layout colapsado (default no mobile):
```
┌─────────────────────────────────────────┐
│ Eduardo Araujo Rocha da Costa   ✅ ❌ 🔄 │  ← clica no nome para expandir
└─────────────────────────────────────────┘
```

### Layout expandido (após clicar no nome):
```
┌─────────────────────────────────────────┐
│ Eduardo Araujo Rocha da Costa ▼ ✅ ❌ 🔄 │  ← clica para colapsar
├─────────────────────────────────────────┤
│ PAS Inicial   PAD Inicial   FC Inicial  │
│ [  120  ]     [   80  ]     [  70  ]   │
├─────────────────────────────────────────┤
│ 1. Prancha Alta + Remada Serrote        │
│    Séries [3]  Reps [30]               │
│    Carga [________________]             │
│    Obs   [________________]             │
│                                         │
│ 2. Agachamento Isométrico               │
│    Séries [3]  Reps [12]               │
│    Carga [________________]             │
│    Obs   [________________]             │
└─────────────────────────────────────────┘
```

### Comportamento:
- **Mobile** (`< md`): inicia colapsado
- **Desktop** (`>= md`): inicia expandido (comportamento atual)
- Estado local por aluno: `{ [alu_id]: true/false }`
- Chevron indica estado: `▼` expandido, `▶` colapsado
- Ao marcar presença (✅ ❌ 🔄) → expande automaticamente se colapsado

```jsx
const [expandidos, setExpandidos] = useState({})

// No mobile iniciar colapsado, no desktop expandido
const isMobile = window.innerWidth < 768
const toggleAluno = (alu_id) => {
    setExpandidos(prev => ({ ...prev, [alu_id]: !prev[alu_id] }))
}

// Inicializar estado baseado no device
useEffect(() => {
    const inicial = alunos.reduce((acc, a) => ({
        ...acc,
        [a.alu_id]: !isMobile  // false no mobile, true no desktop
    }), {})
    setExpandidos(inicial)
}, [alunos])
```

---

## 7.3 — FichasTreinoPage: Cards por modalidade

**Arquivo:** `FichasTreinoPage.jsx`

Mesmo padrão implementado em Exercícios e Turmas (Fase 6).
`fitr_modalidade` já existe no model.

```
┌─────────────────────────────────────────────────────┐
│ 🧘 Mat Pilates                    [▼]   [+ Nova]    │
├─────────────────────────────────────────────────────┤
│  Core Nível 1                          [✏️] [🗑️]   │
│  Fortalecimento Global                 [✏️] [🗑️]   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 💪 Funcional                      [▼]   [+ Nova]    │
├─────────────────────────────────────────────────────┤
│  Funcional 1 — Potência + Força        [✏️] [🗑️]   │
│  Funcional 2 — Core + Resistência      [✏️] [🗑️]   │
└─────────────────────────────────────────────────────┘
```

- Cards iniciam expandidos
- Botão `[+ Nova]` pré-seleciona modalidade do card
- Fichas com `fitr_modalidade=null` → card "Sem modalidade"

---

## 7.4 — Menu Mobile: Bottom Bar + Drawer

**Arquivos:** `Layout.jsx`, `Sidebar.jsx`, novo `BottomBar.jsx`

### Comportamento:

**Desktop (`>= md`):** sidebar lateral normal (comportamento atual)

**Mobile (`< md`):**
- Sidebar lateral **some completamente**
- Header com logo + botão `☰` hamburguer no topo
- Bottom bar fixa no rodapé com 5 ícones
- `☰` abre drawer lateral completo (overlay escuro atrás)

### Bottom Bar — 5 ícones (sem labels):

```
┌─────────────────────────────────────────┐
│  🏠    💰    👥    🏋️    📊             │
│  (Dashboard)(Fin)(Oper)(Tec)(Rel)       │
└─────────────────────────────────────────┘
```

| Ícone | lucide-react | Destino |
|---|---|---|
| 🏠 | `LayoutDashboard` | `/dashboard` |
| 💰 | `DollarSign` | `/financeiro/contas-receber` |
| 👥 | `Users` | `/operacional/alunos` |
| 🏋️ | `Dumbbell` | `/tecnico/ministrar-aula` |
| 📊 | `BarChart2` | `/relatorios` |

### Drawer lateral (abre ao clicar ☰):
- Overlay escuro com `opacity-50` atrás
- Drawer desliza da esquerda (`translate-x`)
- Conteúdo: menu completo igual ao sidebar desktop
- Fechar: clicar no overlay ou no `✕`
- Animação: `transition-transform duration-300`

### Implementação:

```jsx
// BottomBar.jsx — novo componente
const BottomBar = () => {
    const location = useLocation()

    const itens = [
        { icon: LayoutDashboard, path: '/dashboard' },
        { icon: DollarSign,      path: '/financeiro/contas-receber' },
        { icon: Users,           path: '/operacional/alunos' },
        { icon: Dumbbell,        path: '/tecnico/ministrar-aula' },
        { icon: BarChart2,       path: '/relatorios' },
    ]

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50
                        bg-sidebar-bg border-t border-border
                        flex md:hidden">  {/* só aparece no mobile */}
            {itens.map(({ icon: Icon, path }) => (
                <Link
                    key={path}
                    to={path}
                    className={`flex-1 flex items-center justify-center py-3
                        ${location.pathname.startsWith(path)
                            ? 'text-secondary'    // cyan ativo
                            : 'text-text-secondary'}`}
                >
                    <Icon size={22} />
                </Link>
            ))}
        </nav>
    )
}
```

```jsx
// Layout.jsx — adicionar BottomBar e padding bottom no mobile
<div className="pb-16 md:pb-0">  {/* espaço para o bottom bar */}
    {children}
</div>
<BottomBar />
```

```jsx
// Sidebar.jsx — esconder no mobile, mostrar drawer
<aside className="hidden md:flex ...">  {/* sidebar normal só no desktop */}
    {menuCompleto}
</aside>

{/* Drawer mobile */}
{drawerAberto && (
    <>
        <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setDrawerAberto(false)}
        />
        <aside className="fixed left-0 top-0 h-full w-64 z-50
                          bg-sidebar-bg transform transition-transform
                          duration-300 md:hidden">
            {menuCompleto}
        </aside>
    </>
)}
```

```jsx
// Header mobile — botão hamburguer
<header className="md:hidden flex items-center justify-between p-4">
    <Logo />
    <button onClick={() => setDrawerAberto(true)}>
        <Menu size={24} />
    </button>
</header>
```

---

## Ordem de execução obrigatória

```
7.1 → MinistrarAula: modalidade primeiro
7.2 → MinistrarAula: alunos colapsáveis + cor
7.3 → FichasTreino: cards por modalidade
7.4 → Menu mobile: bottom bar + drawer
      (fazer por último — mexe no layout global)
```

---

## O que NÃO fazer

- ❌ Mostrar bottom bar no desktop (`md:hidden` obrigatório)
- ❌ Esconder sidebar no desktop por causa das mudanças mobile
- ❌ Abrir drawer sem overlay escuro atrás
- ❌ Labels no bottom bar — só ícones
- ❌ `objeto.delete()` — soft delete via API
- ❌ `response.data` — sempre `response.data.results`
- ❌ Alterar `base: '/sistema/'` no vite.config.js
- ❌ Criar outro `CLAUDE.md`

---

## Checklist Fase 7

### 7.1 — MinistrarAula modalidade primeiro:
- [ ] Select modalidade como 1º campo
- [ ] Turmas filtradas por modalidade
- [ ] Fichas filtradas por modalidade (+ null)
- [ ] Limpa seleção ao trocar modalidade
- [ ] Testes passando ✅

### 7.2 — Alunos colapsáveis + cor:
- [ ] Nome colorido por modalidade (roxo/cyan)
- [ ] Cards colapsados por default no mobile
- [ ] Cards expandidos por default no desktop
- [ ] Toggle ao clicar no nome
- [ ] Expande automaticamente ao marcar presença
- [ ] Testes passando ✅

### 7.3 — FichasTreino cards modalidade:
- [ ] Cards Pilates / Funcional / Sem modalidade
- [ ] Botão nova pré-seleciona modalidade
- [ ] Testes passando ✅

### 7.4 — Menu mobile:
- [ ] Sidebar some no mobile
- [ ] Header com logo + ☰ no mobile
- [ ] Bottom bar fixa — 5 ícones sem label
- [ ] Ícone ativo destacado em cyan
- [ ] Drawer abre ao clicar ☰
- [ ] Overlay escuro fecha o drawer
- [ ] Animação suave (300ms)
- [ ] Desktop não afetado
- [ ] Padding bottom no conteúdo mobile
- [ ] Testes passando ✅

---

**🚀 Bora codar! Good luck, Claude Code!**

> ⚠️ SISTEMA EM PRODUÇÃO — testar cada item antes de avançar.
