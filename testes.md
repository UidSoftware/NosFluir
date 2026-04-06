# Plano de Testes — Nos Studio Fluir

**Versão:** 2.0
**Data:** 06/04/2026
**Autor:** Uid Software

> **Status:** 39/39 testes implementados e passando.
> Arquivos: `apps/financeiro/tests.py`, `apps/operacional/tests.py`, `apps/tecnico/tests.py`

---

## Como Rodar os Testes

```bash
# Todos os testes (dentro do container em dev)
docker exec nosfluir-backend-1 python manage.py test apps.financeiro apps.operacional apps.tecnico --verbosity=2

# Por app
docker exec nosfluir-backend-1 python manage.py test apps.financeiro
docker exec nosfluir-backend-1 python manage.py test apps.operacional
docker exec nosfluir-backend-1 python manage.py test apps.tecnico
```

---

## Testes de Caixa Branca (Unitários)

### Módulo Financeiro

| ID | Módulo | Cenário | Resultado Real | Status |
|---|---|---|---|---|
| TB001 | ContasPagar | Criar conta com qtd=2 e valor_unit=50.00 | `pag_valor_total` = 100.00 | ✅ |
| TB002 | ContasReceber | Criar conta com qtd=1, valor=150.00, desconto=10.00 | `rec_valor_total` = 140.00 | ✅ |
| TB003 | ContasReceber | Desconto maior que valor total | HTTP 400 | ✅ |
| TB004 | FolhaPagamento | salario_base=3000, descontos=300 | `fopa_valor_liquido` = 2700.00 | ✅ |
| TB005 | LivroCaixa | Tentar editar lançamento existente | **HTTP 405** (ReadCreateMixin — method not allowed) | ✅ |
| TB006 | LivroCaixa | Tentar deletar lançamento existente | **HTTP 405** (ReadCreateMixin — method not allowed) | ✅ |
| TB007 | Signal | `pag_status` alterado para `pago` | Lançamento saída criado automaticamente | ✅ |
| TB008 | Signal | `rec_status` alterado para `recebido` | Lançamento entrada criado automaticamente | ✅ |
| TB009 | Signal | Signal chamado duas vezes para o mesmo registro | Apenas 1 lançamento (sem duplicata) | ✅ |
| TB010 | FolhaPagamento | `fopa_status` alterado para `pago` | Nenhum lançamento automático no LivroCaixa | ✅ |

> ⚠️ **Nota TB005/TB006:** O ReadCreateMixin retorna `405 Method Not Allowed` (não `403`). Comportamento correto — os métodos update/delete simplesmente não existem no ViewSet.

### Módulo Operacional

| ID | Módulo | Cenário | Resultado Real | Status |
|---|---|---|---|---|
| TB011 | Alunos | CPF com zeros à esquerda (ex: "01234567890") | Salvo como string "01234567890" | ✅ |
| TB012 | Alunos | Aluno com menos de 12 anos | HTTP 400 | ✅ |
| TB013 | TurmaAlunos | Matricular 16º aluno em turma | HTTP 400 (máx 15) | ✅ |
| TB014 | TurmaAlunos | Matricular mesmo aluno duas vezes na mesma turma | HTTP 400 (unique) | ✅ |
| TB015 | Funcionario | CPF duplicado | IntegrityError | ✅ |

### Módulo Técnico

| ID | Módulo | Cenário | Resultado Real | Status |
|---|---|---|---|---|
| TB016 | Aulas | Pressão "120/80" | HTTP 201 (salvo sem erro) | ✅ |
| TB017 | Aulas | Pressão "9999/99" (inválida) | HTTP 400 | ✅ |
| TB018 | Aulas | Intensidade = 11 | HTTP 400 | ✅ |
| TB019 | Aulas | `aul_hora_final` < `aul_hora_inicio` | HTTP 400 | ✅ |
| TB020 | CreditoReposicao | Criar crédito sem `cred_data_expiracao` | Campo calculado automaticamente (+30 dias) | ✅ |
| TB021 | CreditoReposicao Signal | Registrar falta tipo `justificada` | CreditoReposicao criado automaticamente | ✅ |
| TB022 | CreditoReposicao Signal | Registrar falta tipo `atestado` | CreditoReposicao criado automaticamente | ✅ |
| TB023 | CreditoReposicao Signal | Registrar falta tipo `sem_aviso` | Nenhum crédito criado | ✅ |
| TB024 | CreditoReposicao Signal | Aluno já tem 3 créditos `disponivel` | Nenhum novo crédito criado | ✅ |

### Mudanças de Arquitetura (Fase 2.3 — 06/04/2026)

| ID | Módulo | Cenário | Resultado Real | Status |
|---|---|---|---|---|
| TB030 | Turma | Serializer não expõe `func` nem `func_nome` | Confirmado — campo removido | ✅ |
| TB031 | Turma | GET /api/turmas/ retorna campo `id` | `id` presente no response | ✅ |
| TB032 | Turma | GET /api/turmas/ retorna HTTP 200 | Sem erro 500 (filterset_fields corrigido) | ✅ |
| TB033 | Aula | Salvar aula com professor (`func`) | `func` e `func_nome` retornados | ✅ |
| TB034 | Aula | Salvar aula sem professor | Aceito — `func` é nullable | ✅ |
| TB035 | Funcionario | GET /api/funcionarios/ retorna campo `id` | `id` presente — selects do frontend funcionam | ✅ |

---

## Testes de Caixa Preta (Funcionais)

### Autenticação

| ID | Ação | Resultado Real | Status |
|---|---|---|---|
| TP001 | Login com e-mail e senha válidos | HTTP 200 + access_token + refresh_token | ✅ |
| TP002 | Login com senha inválida | HTTP 401 | ✅ |
| TP003 | Acesso a endpoint sem token | HTTP 401 | ✅ |
| TP005 | Refresh de token | HTTP 200 + novo access_token | ✅ |
| TP006 | Logout (`/api/logout/`) | HTTP 200 + token invalidado | ✅ |

> ⚠️ **Nota TP006:** Endpoint de logout é `/api/logout/` (não `/api/token/blacklist/`).

### Financeiro

| ID | Ação | Resultado Real | Status |
|---|---|---|---|
| TP007 | Criar conta a pagar | HTTP 201 | ✅ (coberto por TB001) |
| TP008 | Marcar conta a pagar como paga | HTTP 200 + lançamento LivroCaixa | ✅ (coberto por TB007) |
| TP009 | Tentar editar LivroCaixa | HTTP 405 | ✅ (coberto por TB005) |
| TP011 | Conta com desconto maior que valor | HTTP 400 | ✅ (coberto por TB003) |

### Operacional

| ID | Ação | Resultado Real | Status |
|---|---|---|---|
| TP012 | Cadastrar aluno com CPF único | HTTP 201 | ✅ |
| TP013 | Cadastrar aluno com CPF duplicado | HTTP 400 | ✅ |
| TP014 | Matricular aluno em turma | HTTP 201 | ✅ |
| TP015 | Matricular 16º aluno em turma cheia | HTTP 400 | ✅ (coberto por TB013) |

---

## Testes de Integração

| ID | Fluxo | Resultado Real | Status |
|---|---|---|---|
| TI002 | Falta justificada → crédito criado → reposição | Crédito criado e marcado como `usado` | ✅ |

---

## Pendências de Testes

| ID | Cenário | Observação |
|---|---|---|
| TB025 | Crédito expirado → ValidationError | Pendente (model não tem método `usar()` ainda) |
| TB026 | Crédito já usado → ValidationError | Pendente |
| TB027 | Uso cruzado 2ª vez no mês → ValidationError | Pendente (regra ainda não implementada no backend) |
| TP004 | Acesso com token expirado | Não testado (requer manipular tempo) |
| TP010 | Filtro por status em contas-receber | Não implementado |
| TP016 | Criar pré-agendamento de horário | Não implementado |
| TP017–TP023 | Testes técnicos via API de aulas | Parcialmente cobertos (TB016–TB019) |
| TI001 | Fluxo pagamento completo | Não implementado |
| TI003 | Fluxo matrícula → aula → frequência | Não implementado |
| TI004 | Paginação com 50+ registros | Não implementado |
| TI005 | Controle de acesso por perfil | Não implementado |
| TI006 | Expiração de crédito | Não implementado |

---

## Descobertas dos Testes (bugs identificados e corrigidos)

| Problema | Causa | Corrigido em |
|---|---|---|
| GET /api/turmas/ retornava 500 | `filterset_fields = ['func']` após remoção do campo da Turma | 06/04/2026 |
| Selects de funcionário mostravam nomes concatenados | Todos os serializers sem campo `id` — frontend usava `f.id` que era `undefined` | 06/04/2026 |
| Turma não listava dados | Mesmo bug do filterset acima | 06/04/2026 |

---

## Critérios de Aceite

- [x] Autenticação testada com token válido e inválido
- [x] LivroCaixa verificado como imutável (405 em PUT/PATCH/DELETE)
- [x] Signal de LivroCaixa verificado para ContasPagar e ContasReceber
- [x] FolhaPagamento verificado como NÃO gerando signal
- [x] Sistema de créditos testado em cenários de falta (justificada, atestado, sem_aviso, limite 3)
- [x] Aula com professor (func) testada — campo obrigatório no ministrar aula
- [x] Campo `id` nos serializers verificado
- [ ] Soft delete verificado — registros não devem aparecer em listagens após exclusão
- [ ] Paginação verificada (`response.data.results`, não `response.data`)
- [ ] Permissões por perfil verificadas (Professor sem financeiro, Financeiro sem técnico)
- [ ] Valores monetários verificados como Decimal, não Float
- [ ] Regra de uso cruzado de crédito testada (pendente implementação)

---

*Plano de Testes — Nos Studio Fluir | Versão 2.0 — 06/04/2026 — Uid Software*
