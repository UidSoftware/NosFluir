# Instruções Claude Code — Nos Studio Fluir
## Fases 2.1 · 2.2 · 2.3
> Versão: 3.0
> Data: 04/04/2026
> Leia o `CLAUDE.md` completo antes de começar qualquer tarefa.

---

## Antes de começar

1. Leia o `CLAUDE.md` — é a memória do sistema
2. Leia o `Dicionario_Dados.md` se for mexer em models ou API
3. Leia o `Regras_Negocio.md` se for mexer em lógica de negócio
4. O sistema está **em produção** — qualquer erro afeta as clientes diretamente
5. **NUNCA** criar outro `CLAUDE.md` — o existente na raiz é o único
6. **NUNCA** usar `objeto.delete()` — sempre soft delete (`deleted_at` + `deleted_by`)
7. **NUNCA** usar `response.data` em listagens — sempre `response.data.results`

---

## Fase 2.1 — Correções de bugs críticos no frontend

### BUG 1 — `fich_nome` → `fitr_nome` (quebra fichas de treino)

O serializer do backend expõe o campo como `fitr_nome`. O frontend usa `fich_nome` incorretamente.

**Arquivos a corrigir:**

`frontend/src/pages/tecnico/FichasTreinoPage.jsx` — substituir todas as ocorrências:
```javascript
// ERRADO
fich_nome

// CORRETO
fitr_nome
```

`frontend/src/pages/tecnico/MinistrarAulaPage.jsx` — linha do SelectItem:
```javascript
// ERRADO
{fichas?.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.fich_nome}</SelectItem>)}

// CORRETO
{fichas?.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.fitr_nome}</SelectItem>)}
```

---

### BUG 2 — `'presente'` → `'regular'` (quebra registro de presença)

O model `Aula` define `TIPO_PRESENCA_CHOICES` com o valor `'regular'`, não `'presente'`.
Enviar `'presente'` para a API vai falhar na validação.

**Arquivo:** `frontend/src/pages/tecnico/MinistrarAulaPage.jsx`

```javascript
// ERRADO
const PRESENCA_OPTS = [
  { value: 'presente',  label: 'Presente' },
  { value: 'falta',     label: 'Falta' },
  { value: 'reposicao', label: 'Reposição' },
]
const [presenca, setPresenca] = useState('presente')

// CORRETO
const PRESENCA_OPTS = [
  { value: 'regular',   label: 'Presente' },  // valor da API = 'regular', label exibido = 'Presente'
  { value: 'falta',     label: 'Falta' },
  { value: 'reposicao', label: 'Reposição' },
]
const [presenca, setPresenca] = useState('regular')
```

Corrigir também todas as comparações no componente `AlunoRow`:
```javascript
// ERRADO
{presenca === 'presente' && ( ... )}

// CORRETO
{presenca === 'regular' && ( ... )}
```

---

### BUG 3 — filtro `turma_id` → `tur` (lista de alunos nunca carrega)

O `TurmaAlunosViewSet` aceita `filterset_fields = ['tur', 'alu', 'ativo']`.
O parâmetro correto é `tur`, não `turma_id`.

**Arquivo:** `frontend/src/pages/tecnico/MinistrarAulaPage.jsx`

```javascript
// ERRADO
queryFn: () => api.get('/operacional/turma-alunos/', {
  params: { turma_id: turmaId, page_size: 100 }
}).then(r => r.data.results),

// CORRETO
queryFn: () => api.get('/operacional/turma-alunos/', {
  params: { tur: turmaId, ativo: true, page_size: 100 }
}).then(r => r.data.results),
```

O campo retornado pelo serializer para o nome do aluno deve ser verificado no Swagger
(`https://nostudiofluir.com.br/api/docs/`) — confirmar se é `aluno_nome` ou `alu__alu_nome`
e ajustar o AlunoRow:
```javascript
aluno={{ id: ta.alu, alu_nome: ta.aluno_nome }}
```

---

### BUG 4 — `page_size` não é suportado pelo backend

O backend usa `PAGE_SIZE = 20` fixo no settings. Passar `page_size` como parâmetro
de query não tem efeito — sempre retorna 20 registros.

**Solução:** Para selects que precisam de todos os registros (turmas, fichas, funcionários,
fornecedores, serviços), adicionar paginação no próprio select OU usar busca incremental.
Por ora, remover `page_size: 100` de todas as queries de select — a API já devolve os
primeiros 20 resultados que costumam ser suficientes para studios pequenos.

Arquivos afetados (remover `page_size` dos params):
- `MinistrarAulaPage.jsx` (turmas, fichas, turma-alunos)
- `FichasTreinoPage.jsx` (exercícios no modal)
- `TurmasPage.jsx` (funcionários no select)
- `PlanosPage.jsx` (alunos e serviços no select)
- `FolhaPagamentoPage.jsx` (funcionários no select)

---

### BUG 5 — `MinistrarAulaPage` não salva nada (incompleta)

O botão "Finalizar Aula" não chama nenhuma API. A página precisa ser completada
com a lógica de POST para `/api/tecnico/aulas/`.

**Fluxo correto a implementar:**

```
1. Usuário seleciona turma + ficha (opcional) + data → clica "Iniciar Aula"
2. Sistema carrega alunos da turma via GET /operacional/turma-alunos/?tur={id}&ativo=true
3. Para cada aluno: usuário define presença (regular/falta/reposição)
   - Se falta: seleciona tipo de falta
   - Se regular: registra P.A. inicial, P.A. final, intensidade
   - Se reposição: busca crédito disponível via GET /tecnico/creditos-reposicao/?alu={id}&cred_status=disponivel&ordering=cred_data_expiracao
     e exibe o crédito que será consumido (primeiro da lista = FIFO)
4. Botão "Finalizar Aula" → para cada aluno faz POST /api/tecnico/aulas/ com:
   {
     tur: turmaId,
     alu: aluno.alu,               // ID do aluno (campo alu do TurmaAlunos)
     fitr: fichaId || null,
     cred: creditoId || null,      // só se presença = reposição
     aul_data: data,
     aul_hora_inicio: horaInicio,  // capturar no momento do clique em "Iniciar"
     aul_hora_final: horaFinal,    // capturar no momento do clique em "Finalizar"
     aul_pressao_inicio: pressaoI || null,
     aul_pressao_final: pressaoF || null,
     aul_tipo_presenca: presenca,  // 'regular' | 'falta' | 'reposicao'
     aul_tipo_falta: faltaTipo || null,
     aul_intensidade_esforco: intensidade ? parseInt(intensidade) : null,
   }
5. Se algum POST falhar, mostrar toast de erro com nome do aluno
6. Ao finalizar todos, mostrar toast de sucesso e voltar para step 'configurar'
```

**Captura do horário:**
```javascript
const [horaInicio, setHoraInicio] = useState(null)

const iniciar = () => {
  if (!turmaId) { toast({ title: 'Selecione uma turma.', variant: 'destructive' }); return }
  setHoraInicio(new Date().toTimeString().slice(0, 5)) // formato HH:MM
  setStep('aula')
}
```

**Validação antes de finalizar:**
- Pressão arterial se informada deve bater com regex `^\d{2,3}/\d{2}$`
- Intensidade entre 0 e 10
- Se presença = reposição e não houver crédito disponível: bloquear com toast de aviso

---

### README.md — referências ao repo antigo

Corrigir no `README.md` da raiz:
```
# ERRADO
git clone https://github.com/UidSoftware/NosFluirSis
cd NosFluirSis

# CORRETO
git clone https://github.com/UidSoftware/NosFluir
cd NosFluir
```

Corrigir também a estrutura de pastas dentro do README que referencia `NosFluirSis/`.

---

## Fase 2.2 — Responsividade mobile/tablet no frontend React

O sistema é usado pelas professoras e recepcionista em **celular, tablet e computador**.
Todas as páginas devem funcionar bem nos três tamanhos.

### Breakpoints (já configurados no Tailwind)

```
sm:  640px  → tablet pequeno
md:  768px  → tablet
lg:  1024px → desktop pequeno
xl:  1280px → desktop
```

### Sidebar — comportamento mobile

A `Sidebar.jsx` atual é colapsável mas pode não fechar ao navegar em mobile.
Corrigir para fechar automaticamente ao clicar em qualquer item de menu no mobile:

```javascript
// Sidebar.jsx — ao clicar em NavLink em tela pequena, fechar sidebar
const handleNavClick = () => {
  if (window.innerWidth < 1024) setCollapsed(true)
}
// Aplicar onClick={handleNavClick} em cada NavLink
```

### Tabelas — scroll horizontal em mobile

Todas as `DataTable` devem ter scroll horizontal em telas pequenas.
Envolver o componente com:
```jsx
<div className="overflow-x-auto -mx-5 px-5">
  <DataTable ... />
</div>
```

### Dialogs/Modais — ocupar tela inteira em mobile

```jsx
// dialog.jsx — adicionar classe responsiva no DialogContent
<DialogContent className="w-full max-w-lg sm:max-w-xl mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
```

### Grids de formulário — colapsar em mobile

Padrão já usado em `AlunosPage.jsx` — **garantir que todas as páginas usem este padrão:**
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
```

### Páginas que precisam de atenção especial em mobile

**MinistrarAulaPage** — é a mais usada em celular (professor na sala de aula):
- Cards de aluno devem ser empilhados, não em linha
- Botões de presença (regular/falta/reposição) devem ser grandes o suficiente para toque
- P.A. e intensidade em grid de 1 coluna no mobile: `grid-cols-1 sm:grid-cols-3`

**LivroCaixaPage** — financeiro visualiza no celular:
- Saldo no topo deve ser bem visível em mobile
- Tabela com scroll horizontal obrigatório

**Dashboard** — cartões de resumo:
- `grid-cols-2 lg:grid-cols-4` para os cards de métricas

### Topbar — ajustes mobile

```jsx
// Topbar.jsx — em mobile esconder textos longos, manter só ícones
<span className="hidden sm:inline">{user?.name}</span>
```

---

## Fase 2.3 — Site Institucional: páginas separadas

O site atual (`site-institucional/`) é uma single-page com âncoras (`#sobre`, `#servicos` etc).
Deve ser **refatorado para páginas HTML separadas**.

### Identidade visual obrigatória

**Cores:**
```css
--fluir-dark:   #151329  /* fundo principal */
--fluir-purple: #5D5CE0  /* cor primária */
--fluir-cyan:   #01E2CD  /* accent */
```

**Fontes:**
- `Oranger` — títulos/display (fonte serifada elegante do logo)
- `Geometria` — corpo de texto

Como essas fontes podem não estar no Google Fonts, usar como fallback:
```css
font-family: 'Cormorant Garamond', 'Times New Roman', serif;  /* para Oranger */
font-family: 'Nunito', 'Segoe UI', sans-serif;                 /* para Geometria */
```

**Imagens oficiais disponíveis em** `backend/static/landing/`:
- `logo.png` — logo principal (fundo escuro, gradiente roxo→cyan)
- `Logotipo-817x716-Branco.png` — logotipo branco (para fundos escuros)
- `Logotipo-817x716-Sem-Fundo.png` — logotipo sem fundo (para fundos claros)
- `Icone-401x401-Sem-Fundo.png` — só o ícone, sem fundo (gradiente)
- `Icone-401x401-Branco.png` — ícone branco
- `Foto-1080x1080-de-Perfil1.png` até `Perfil4.png` — fotos das professoras/studio

Servir as imagens via Nginx em `/static/landing/` (já configurado no `docker-compose.yml`
via volume `backend/static` → Nginx).

### Estrutura de arquivos

```
site-institucional/
├── index.html          ← página inicial (Home)
├── sobre.html          ← Quem Somos
├── servicos.html       ← Serviços e Modalidades
├── agendamento.html    ← Agendamento de aula experimental
├── contato.html        ← Contato e localização
├── css/
│   └── style.css       ← estilos globais + componentes
├── js/
│   └── main.js         ← navegação, formulário, animações
└── img/                ← imagens locais (copiar de backend/static/landing/)
    ├── logo.png
    ├── icone.png
    └── ...
```

### Componentes compartilhados (header e footer)

Como o site é HTML puro (sem framework), usar um padrão de includes via JavaScript:

```javascript
// js/main.js — carrega header e footer em todas as páginas
async function loadComponent(id, file) {
  const res = await fetch(`/components/${file}`)
  const html = await res.text()
  document.getElementById(id).innerHTML = html
}
loadComponent('header-placeholder', 'header.html')
loadComponent('footer-placeholder', 'footer.html')
```

```
site-institucional/
└── components/
    ├── header.html    ← nav com logo + links + botão WhatsApp + botão "Entrar"
    └── footer.html    ← endereço, redes sociais, "Desenvolvido por Uid Software"
```

### index.html — Página inicial (Home)

Seções:
1. **Hero** — logo grande, headline, CTA "Agendar aula experimental" → `agendamento.html`
   - Usar foto `Perfil1.png` ou `Perfil2.png` como background ou imagem lateral
2. **Sobre rápido** — 3 bullets com diferenciais + link "Saiba mais" → `sobre.html`
3. **Serviços em destaque** — cards das 3 principais modalidades + link → `servicos.html`
4. **Depoimentos** — 2-3 depoimentos de alunas
5. **CTA final** — "Comece sua transformação" → `agendamento.html`

### sobre.html — Quem Somos

Seções:
1. **Nossa história** — texto sobre o studio
2. **Nossas profissionais** — fotos `Perfil1.png` a `Perfil4.png` com nome e especialidade
3. **Nossa estrutura** — fotos do espaço (usar imagens disponíveis)
4. **Valores** — missão, visão, valores

### servicos.html — Serviços e Modalidades

Seções:
1. **Pilates** — Reformer, Solo, Cadillac, Chair, Barrel
2. **Treinamento Funcional**
3. **Para cada modalidade:** descrição, benefícios, para quem é indicado
4. **CTA** → `agendamento.html`

### agendamento.html — Agendamento

Seções:
1. **Formulário de aula experimental:**
   ```html
   <form id="formAgendamento">
     Nome completo (obrigatório)
     E-mail (obrigatório)
     Telefone/WhatsApp (obrigatório)
     Modalidade de interesse (select: Pilates / Funcional / Ambos)
     Dias disponíveis (checkboxes: seg/ter/qua/qui/sex/sab)
     Horários preferidos (checkboxes: manhã/tarde/noite)
     Como nos conheceu (select)
     Mensagem (textarea, opcional)
   </form>
   ```

   **Envio do formulário:**
   ```javascript
   // Tentar POST para a API
   const response = await fetch('/api/operacional/agendamentos-horario/', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(payload)
   })

   // Se falhar, fallback para WhatsApp
   if (!response.ok) {
     const msg = `Olá! Quero agendar uma aula experimental...`
     window.open(`https://wa.me/5534998218204?text=${encodeURIComponent(msg)}`)
   }
   ```

2. **Informações de contato rápido** — WhatsApp, endereço, horário de funcionamento

### contato.html — Contato

Seções:
1. **Formulário de contato** (nome, email, mensagem)
2. **Mapa** — `<div class="mapa__placeholder">` com `<!-- TODO: iframe Google Maps -->`
3. **Endereço** — `<!-- TODO: endereço completo -->`
4. **Horário de funcionamento** — `<!-- TODO: horário real -->`
5. **Redes sociais** — `<!-- TODO: links reais Instagram/YouTube -->`
6. **WhatsApp** — botão flutuante em todas as páginas

### Botão flutuante em TODAS as páginas

```html
<!-- Inserir antes do </body> em todas as páginas -->
<a href="https://wa.me/5534998218204" class="float-whatsapp" target="_blank" rel="noopener">
  <!-- ícone WhatsApp SVG -->
</a>
<a href="/sistema/" class="float-sistema" target="_blank" rel="noopener">
  Entrar
</a>
```

### CSS global (style.css)

```css
:root {
  --fluir-dark:       #151329;
  --fluir-dark-2:     #1e1b3a;
  --fluir-purple:     #5D5CE0;
  --fluir-cyan:       #01E2CD;
  --fluir-white:      #ffffff;
  --fluir-text-muted: rgba(255,255,255,0.65);
  --gradient:         linear-gradient(135deg, #5D5CE0, #01E2CD);
  --font-display:     'Cormorant Garamond', serif;   /* substituto Oranger */
  --font-body:        'Nunito', sans-serif;           /* substituto Geometria */
}

/* Fontes Google */
/* @import: Cormorant Garamond (700) + Nunito (400,500,600) */
```

Manter o site **responsivo mobile-first** — mesmos breakpoints do frontend React.

### Nginx — servir as páginas corretamente

O Nginx já aponta a raiz `/` para `site-institucional/`. Com páginas separadas,
as URLs `/sobre`, `/servicos`, etc. precisam resolver os arquivos `.html` correspondentes.

Verificar `nginx/nginx.conf` e garantir:
```nginx
location / {
  root /var/www/site-institucional;
  try_files $uri $uri.html $uri/ =404;
}
```

---

## Checklist geral antes de marcar cada fase como ✅

### Fase 2.1
- [ ] `fitr_nome` em todos os lugares que usavam `fich_nome`
- [ ] `'regular'` no lugar de `'presente'` em toda a `MinistrarAulaPage`
- [ ] Filtro `tur=turmaId` no lugar de `turma_id=turmaId`
- [ ] `MinistrarAulaPage` salva aulas via POST com todos os campos corretos
- [ ] Validação de pressão arterial (regex) antes de finalizar
- [ ] Toast de erro por aluno em caso de falha no POST
- [ ] `page_size` removido de todas as queries de select
- [ ] README corrigido (repo e pasta)

### Fase 2.2
- [ ] Sidebar fecha ao navegar em mobile
- [ ] Todas as DataTable com `overflow-x-auto`
- [ ] DialogContent com `max-h-[90vh] overflow-y-auto`
- [ ] Todos os grids de formulário com `grid-cols-1 sm:grid-cols-2`
- [ ] MinistrarAulaPage funcional em celular (botões grandes, grid colapsado)
- [ ] Dashboard com `grid-cols-2 lg:grid-cols-4` nos cards
- [ ] Testado em 375px (iPhone), 768px (iPad) e 1280px (desktop)

### Fase 2.3
- [ ] 5 arquivos HTML criados (index, sobre, servicos, agendamento, contato)
- [ ] Header e footer em componentes separados, carregados via fetch
- [ ] Imagens oficiais usadas (logo, ícone, fotos de perfil)
- [ ] Cores e fontes da identidade visual aplicadas
- [ ] Formulário de agendamento com fallback WhatsApp
- [ ] Botão flutuante WhatsApp + "Entrar" em todas as páginas
- [ ] TODOs marcados: endereço, mapa, horário, redes sociais
- [ ] Responsivo mobile-first
- [ ] Nginx configurado para `try_files $uri $uri.html`

---

## Se travar

1. `AlunosPage.jsx` é a referência para CRUDs — sempre seguir esse padrão
2. Swagger em `https://nostudiofluir.com.br/api/docs/` para confirmar campos
3. Releia `CLAUDE.md` / `Dicionario_Dados.md` / `Regras_Negocio.md`
4. Pare e avise com contexto claro (o que tentou, o que deu erro)
5. **Nunca inventar comportamento. Nunca alterar regras de negócio sem confirmação.**

---

*Uid Software — Sistema Nos Studio Fluir — Produção*
*Instrucoes_Claude_Code Fase 2.1/2.2/2.3 — v3.0 — 04/04/2026*
