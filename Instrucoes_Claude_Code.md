# Instruções Claude Code — Nos Studio Fluir
> Versão: 1.1
> Etapa atual: Fase 4 — Sistema de Reposições
> Última atualização: 02/04/2026

---

## Antes de começar QUALQUER tarefa

1. Leia o `CLAUDE.md` completo — é a memória do sistema
2. Leia o `Dicionario_Dados.md` se for mexer em models ou API
3. Leia o `Regras_Negocio.md` se for mexer em lógica de negócio
4. O sistema está **em produção** — qualquer erro afeta as clientes diretamente
5. **NUNCA** criar outro `CLAUDE.md` — o existente na raiz é o único

---

## Status Atual do Projeto

```
Fase 1 — Backend base          ✅ COMPLETO
Fase 2 — Frontend React        ✅ COMPLETO (em produção)
Fase 3 — Site Institucional    ✅ COMPLETO (em produção)
Fase 4 — Sistema de Reposições 🔄 EM ANDAMENTO
Fase 5 — Telas Restantes       ⏳ PLANEJADA
```

---

## Fase 4 — Sistema de Reposições (Prioridade atual)

### O que já existe:
- [x] Model `CreditoReposicao` criado em `apps/tecnico/models.py`

### O que falta implementar:

#### Backend:

- [ ] **Signal de geração de crédito**
  - Arquivo: `apps/tecnico/signals.py`
  - Gatilho: `post_save` na model `Aula`
  - Condição: `aul_tipo_presenca = 'falta'` e `aul_tipo_falta IN ('justificada', 'atestado')`
  - Ação: criar `CreditoReposicao` com `cred_data_expiracao = hoje + 30 dias`
  - Validar: máximo 3 créditos `disponivel` por aluno antes de criar
  - Validar: não criar crédito duplicado para a mesma aula

- [ ] **Signal de expiração de crédito**
  - Verificar créditos com `cred_data_expiracao < hoje` e status `disponivel` → marcar `expirado`
  - Pode ser feito via management command + cron, ou no signal de listagem

- [ ] **Endpoints de CreditoReposicao**
  - `GET /api/creditos/` — listar créditos (filtros: aluno, status, expirados)
  - `GET /api/creditos/{id}/` — detalhe de um crédito
  - `POST /api/creditos/usar/` — usar um crédito (valida regras de cruzamento)
  - `GET /api/alunos/{id}/creditos/` — créditos disponíveis de um aluno

- [ ] **Validações na API ao usar crédito**
  - Verificar se crédito está `disponivel`
  - Verificar se não expirou
  - Verificar regra de uso cruzado (máximo 1x por mês)
  - Selecionar crédito mais próximo de expirar (FIFO por validade)

#### Frontend:

- [ ] **Tela de Créditos do Aluno (perfil Professor/Admin)**
  - Listagem de créditos por aluno
  - Status visual: disponível (verde), usado (cinza), expirado (vermelho)
  - Data de expiração com alerta quando < 7 dias

- [ ] **Fluxo de Reposição ao Ministrar Aula**
  - Ao lançar presença tipo `reposicao`, buscar créditos disponíveis do aluno
  - Exibir crédito que será consumido (o mais próximo de expirar)
  - Confirmar uso do crédito

- [ ] **Tela Admin — Visão geral de créditos**
  - Créditos prestes a expirar (próximos 7 dias)
  - Estatísticas de reposições por mês

---

## Fase 5 — Telas Restantes (Planejada)

### Telas a criar no Frontend:

- [ ] Funcionários (CRUD completo)
- [ ] Folha de Pagamento (com fluxo de pagamento manual para LivroCaixa)
- [ ] Planos de Pagamento
- [ ] Fichas de Treino + Exercícios (montagem de ficha com drag-and-drop na ordem)
- [ ] Relatórios:
  - Frequência de Alunos
  - Pressão Arterial Aferida
  - Contas a Pagar
  - Contas a Receber
  - Livro Caixa
- [ ] Configurações (usuários, grupos, perfis de acesso)

---

## Regras de Código

### Backend (Django):

```python
# Dinheiro: SEMPRE Decimal, NUNCA float
from decimal import Decimal
valor = Decimal('150.00')  # ✅
valor = 150.00             # ❌

# Soft delete: NUNCA objeto.delete()
objeto.deleted_at = timezone.now()
objeto.deleted_by = request.user
objeto.save()              # ✅

objeto.delete()            # ❌

# LivroCaixa: NUNCA editar ou deletar
# Correção = criar lançamento de estorno

# Signals LivroCaixa: verificar existência antes de criar
if not LivroCaixa.objects.filter(
    lica_origem_tipo='contas_pagar',
    lica_origem_id=instance.pag_id
).exists():
    LivroCaixa.objects.create(...)

# CPF/CNPJ: sempre string
alu_documento = models.CharField(max_length=14)  # ✅
alu_documento = models.IntegerField()             # ❌
```

### Frontend (React):

```javascript
// Paginação: SEMPRE .results, nunca .data direto
const dados = response.data.results   // ✅
const dados = response.data           // ❌

// base do Vite: NÃO ALTERAR
// vite.config.js: base: '/sistema/'

// Axios com interceptor de token JWT (já configurado)
// Não criar nova instância de axios — usar a existente em src/services/api.js
```

### Geral:
- Comentários em **português**
- Commits em **português**
- Nunca hardcode credenciais — usar variáveis de ambiente via `.env`
- Sempre tratar erros nas chamadas de API
- Nomenclatura: `snake_case` no backend, `camelCase` no frontend

---

## Padrão de Resposta da API

### Sucesso único:
```json
{
  "id": 1,
  "campo": "valor"
}
```

### Listagem paginada (SEMPRE este formato):
```json
{
  "count": 100,
  "next": "http://api/.../api/recurso/?page=2",
  "previous": null,
  "results": [
    { "id": 1, "campo": "valor" }
  ]
}
```

### Erro de validação:
```json
{
  "campo": ["Mensagem de erro detalhada."]
}
```

---

## Estrutura de Apps Django

```
apps/
├── core/
│   └── mixins.py          ← AuditMixin (auditoria automática)
│                            ReadCreateMixin (impede edit/delete — usado no LivroCaixa)
├── usuarios/
│   ├── models.py          ← User (AbstractUser, auth por email)
│   └── views.py           ← Login, logout, refresh token
├── financeiro/
│   ├── models.py          ← Fornecedor, ServicoProduto, ContasPagar,
│   │                         ContasReceber, PlanosPagamentos, LivroCaixa, FolhaPagamento
│   └── signals.py         ← auto-lançamento LivroCaixa ao pagar/receber
├── operacional/
│   └── models.py          ← Aluno, Profissao, Funcionario, Turma, TurmaAlunos,
│                             AgendamentoHorario, AgendamentoTurmas
└── tecnico/
    ├── models.py          ← Exercicio, FichaTreino, FichaTreinoExercicios,
    │                         Aula, CreditoReposicao
    └── signals.py         ← ⚠️ A CRIAR: auto-geração de CreditoReposicao
```

---

## Ordem de Execução — Nova Feature

Sempre que implementar uma nova feature, seguir esta ordem:

1. **Model** — definir campos, tipos, constraints, choices
2. **Migration** — `python manage.py makemigrations` e `migrate`
3. **Serializer** — validações, campos aninhados, campos calculados
4. **View/ViewSet** — permissões, filtros, paginação
5. **URL** — registrar no `urls.py` do app
6. **Signal** (se necessário) — registrar no `apps.py` via `ready()`
7. **Testes** — ao menos um teste por endpoint
8. **Frontend** — page, componentes, integração com API
9. **Atualizar CLAUDE.md** — marcar o item como concluído

---

## Variáveis de Ambiente (.env)

```bash
# Banco de dados (variáveis separadas — NÃO usar DATABASE_URL)
DB_NAME=studio_fluir
DB_USER=studio_fluir_user
DB_PASSWORD=sua_senha_aqui

# Django
SECRET_KEY=gerar-chave-aleatoria-segura
DEBUG=False
ALLOWED_HOSTS=nostudiofluir.com.br,www.nostudiofluir.com.br

# CORS
CORS_ALLOWED_ORIGINS=https://nostudiofluir.com.br,https://www.nostudiofluir.com.br

# JWT
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# Frontend (usado no build do React — Fase 2)
VITE_API_URL=https://nostudiofluir.com.br/api
```

---

## Se Travar

1. Releia o arquivo relevante (`CLAUDE.md`, `Dicionario_Dados.md`, `Regras_Negocio.md`)
2. Verifique o Troubleshooting no `CLAUDE.md`
3. Se ainda travar, pare e avise o usuário com contexto claro:
   - O que estava tentando fazer
   - Qual erro encontrou
   - O que já tentou
4. **NUNCA invente comportamento não documentado**
5. **NUNCA altere regras de negócio sem confirmação explícita**

---

*Uid Software — Sistema Nos Studio Fluir — Produção*
*Instruções Claude Code v1.1 — 02/04/2026*
