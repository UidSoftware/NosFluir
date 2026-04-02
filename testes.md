# Plano de Testes — Nos Studio Fluir

**Versão:** 1.0
**Data:** 02/04/2026
**Autor:** Uid Software

---

## Testes de Caixa Branca (Unitários)

### Módulo Financeiro

| ID | Módulo | Função/Model | Cenário | Resultado Esperado |
|---|---|---|---|---|
| TB001 | ContasPagar | `save()` | Criar conta com qtd=2 e valor_unit=50.00 | `pag_valor_total` = 100.00 |
| TB002 | ContasReceber | `save()` | Criar conta com qtd=1, valor=150.00, desconto=10.00 | `rec_valor_total` = 140.00 |
| TB003 | ContasReceber | `save()` | Desconto maior que valor total | ValidationError |
| TB004 | FolhaPagamento | `save()` | salario_base=3000, descontos=300 | `fopa_valor_liquido` = 2700.00 |
| TB005 | LivroCaixa | `update()` | Tentar editar lançamento existente | HTTP 403 (ReadCreateMixin) |
| TB006 | LivroCaixa | `delete()` | Tentar deletar lançamento existente | HTTP 403 (ReadCreateMixin) |
| TB007 | LivroCaixa | Signal | `pag_status` alterado para `pago` | Lançamento saída criado automaticamente |
| TB008 | LivroCaixa | Signal | `rec_status` alterado para `recebido` | Lançamento entrada criado automaticamente |
| TB009 | LivroCaixa | Signal | Signal chamado duas vezes para o mesmo registro | Apenas 1 lançamento criado (sem duplicata) |
| TB010 | FolhaPagamento | Signal | `fopa_status` alterado para `pago` | Nenhum lançamento automático no LivroCaixa |

### Módulo Operacional

| ID | Módulo | Função/Model | Cenário | Resultado Esperado |
|---|---|---|---|---|
| TB011 | Alunos | `save()` | CPF com zeros à esquerda (ex: "01234567890") | Salvo como string "01234567890" |
| TB012 | Alunos | `save()` | Aluno com menos de 12 anos | ValidationError |
| TB013 | TurmaAlunos | `save()` | Matricular 16º aluno em turma | ValidationError (máx 15) |
| TB014 | TurmaAlunos | `save()` | Matricular mesmo aluno duas vezes na mesma turma | IntegrityError (UNIQUE) |
| TB015 | Funcionario | `save()` | CPF duplicado | IntegrityError (UNIQUE) |

### Módulo Técnico

| ID | Módulo | Função/Model | Cenário | Resultado Esperado |
|---|---|---|---|---|
| TB016 | Aulas | `save()` | Pressão "120/80" | Salvo sem erro |
| TB017 | Aulas | `save()` | Pressão "9999/99" (inválida) | ValidationError |
| TB018 | Aulas | `save()` | Intensidade = 11 | ValidationError |
| TB019 | Aulas | `save()` | `aul_hora_final` < `aul_hora_inicio` | ValidationError |
| TB020 | CreditoReposicao | `save()` | Criar crédito sem `cred_data_expiracao` | Campo calculado automaticamente (+30 dias) |
| TB021 | CreditoReposicao | Signal | Registrar falta tipo `justificada` | CreditoReposicao criado automaticamente |
| TB022 | CreditoReposicao | Signal | Registrar falta tipo `atestado` | CreditoReposicao criado automaticamente |
| TB023 | CreditoReposicao | Signal | Registrar falta tipo `sem_aviso` | Nenhum crédito criado |
| TB024 | CreditoReposicao | Signal | Aluno já tem 3 créditos `disponivel` | Nenhum novo crédito criado |
| TB025 | CreditoReposicao | `usar()` | Crédito expirado | ValidationError |
| TB026 | CreditoReposicao | `usar()` | Crédito já usado | ValidationError |
| TB027 | CreditoReposicao | `usar()` | Aluno já fez 1 reposição cruzada no mês | ValidationError |

---

## Testes de Caixa Preta (Funcionais)

### Autenticação

| ID | RF | Ação | Dados de Entrada | Resultado Esperado |
|---|---|---|---|---|
| TP001 | RF 1FN | Login com e-mail e senha válidos | `{"email":"admin@fluir.com","password":"senha123"}` | HTTP 200 + access_token + refresh_token |
| TP002 | RF 1FN | Login com senha inválida | `{"email":"admin@fluir.com","password":"errada"}` | HTTP 401 |
| TP003 | RF 1FN | Acesso a endpoint sem token | GET /api/alunos/ sem header | HTTP 401 |
| TP004 | RF 1FN | Acesso com token expirado | Token expirado no header | HTTP 401 |
| TP005 | RF 1FN | Refresh de token | `{"refresh":"token_valido"}` | HTTP 200 + novo access_token |
| TP006 | RF 1FN | Logout com blacklist | `{"refresh":"token_valido"}` | HTTP 200 + token invalidado |

### Financeiro

| ID | RF | Ação | Dados de Entrada | Resultado Esperado |
|---|---|---|---|---|
| TP007 | RF 3FN | Criar conta a pagar | payload válido | HTTP 201 + conta criada |
| TP008 | RF 3FN | Marcar conta a pagar como paga | PATCH `{"pag_status":"pago","pag_data_pagamento":"2026-04-02"}` | HTTP 200 + lançamento no LivroCaixa criado |
| TP009 | RF 3FN | Tentar editar lançamento do LivroCaixa | PUT /api/livro-caixa/1/ | HTTP 403 |
| TP010 | RF 3FN | Listar contas a receber filtradas por status | GET /api/contas-receber/?status=pendente | HTTP 200 + apenas pendentes |
| TP011 | RF 3FN | Criar conta com desconto maior que valor | rec_desconto > rec_valor_total | HTTP 400 |

### Operacional

| ID | RF | Ação | Dados de Entrada | Resultado Esperado |
|---|---|---|---|---|
| TP012 | RF 7FN | Cadastrar aluno com CPF único | payload com CPF novo | HTTP 201 |
| TP013 | RF 7FN | Cadastrar aluno com CPF duplicado | payload com CPF já existente | HTTP 400 |
| TP014 | RF 7FN | Matricular aluno em turma | POST /api/turma-alunos/ com tur_id e alu_id | HTTP 201 |
| TP015 | RF 7FN | Matricular 16º aluno em turma com 15 | POST /api/turma-alunos/ | HTTP 400 (limite atingido) |
| TP016 | RF 8FN | Criar pré-agendamento de horário | payload com alu_id e dias/horários | HTTP 201 |

### Técnico

| ID | RF | Ação | Dados de Entrada | Resultado Esperado |
|---|---|---|---|---|
| TP017 | RF 9FN | Iniciar aula (registrar pressão inicial) | PATCH /api/aulas/1/ `{"aul_pressao_inicio":"120/80"}` | HTTP 200 |
| TP018 | RF 9FN | Finalizar aula (pressão final + intensidade) | PATCH com pressão_final e intensidade | HTTP 200 |
| TP019 | RF 11FN | Registrar falta justificada | PATCH `{"aul_tipo_presenca":"falta","aul_tipo_falta":"justificada"}` | HTTP 200 + crédito criado |
| TP020 | RF 11FN | Registrar falta sem aviso | PATCH `{"aul_tipo_presenca":"falta","aul_tipo_falta":"sem_aviso"}` | HTTP 200 + sem crédito |
| TP021 | RF 12FN | Listar créditos disponíveis de um aluno | GET /api/alunos/1/creditos/?status=disponivel | HTTP 200 + lista ordenada por expiração |
| TP022 | RF 12FN | Usar crédito em reposição | POST /api/creditos/usar/ com cred_id e aula_id | HTTP 200 + crédito marcado como usado |
| TP023 | RF 12FN | Usar crédito em modalidade cruzada (2ª vez no mês) | POST /api/creditos/usar/ cruzado | HTTP 400 (regra de cruzamento) |

---

## Testes de Integração

| ID | Fluxo | Endpoint | Payload | Status Esperado |
|---|---|---|---|---|
| TI001 | Fluxo de pagamento completo | POST → PATCH → GET LivroCaixa | Criar conta → marcar paga → verificar lançamento | 201 → 200 → lançamento presente |
| TI002 | Fluxo de falta e reposição | POST Aula falta → GET crédito → POST reposição | Registrar falta justificada → verificar crédito → usar crédito | Crédito criado e consumido |
| TI003 | Fluxo de matrícula e aula | POST TurmaAluno → POST Aula → GET Frequência | Matricular → registrar aula → verificar frequência | Frequência refletida |
| TI004 | Fluxo de paginação | GET /api/alunos/ com 50 alunos cadastrados | sem filtros | count=50, results com 20 itens, next preenchido |
| TI005 | Fluxo de controle de acesso | GET /api/contas-pagar/ com token de Professor | token de perfil Professor | HTTP 403 |
| TI006 | Expiração de crédito | Criar crédito com data_expiracao = ontem | GET /api/creditos/?status=disponivel | Crédito não listado (ou status=expirado) |

---

## Testes de Performance (referência)

| ID | Cenário | Meta |
|---|---|---|
| TPERF001 | Listagem de alunos (50 registros) | < 300ms |
| TPERF002 | Login com geração de JWT | < 500ms |
| TPERF003 | Ministrar aula (salvar + signal de crédito) | < 500ms |
| TPERF004 | Relatório de frequência (1 mês de dados) | < 2s |

---

## Critérios de Aceite

- [ ] Todos os Requisitos Funcionais cobertos por ao menos 1 teste
- [ ] Autenticação testada com token válido e inválido
- [ ] Soft delete verificado — registros não devem aparecer em listagens após exclusão lógica
- [ ] LivroCaixa verificado como imutável (403 em PUT/PATCH/DELETE)
- [ ] Signal de LivroCaixa verificado para ContasPagar e ContasReceber
- [ ] FolhaPagamento verificado como NÃO gerando signal
- [ ] Sistema de créditos testado em todos os cenários de falta
- [ ] Regra de uso cruzado de crédito testada
- [ ] Paginação verificada (`response.data.results`, não `response.data`)
- [ ] Permissões por perfil verificadas (Professor sem financeiro, Financeiro sem técnico)
- [ ] Valores monetários verificados como Decimal, não Float

---

## Como Rodar os Testes

```bash
# Todos os testes
docker-compose exec backend python manage.py test

# Por app
docker-compose exec backend python manage.py test apps.financeiro
docker-compose exec backend python manage.py test apps.tecnico
docker-compose exec backend python manage.py test apps.operacional

# Com coverage
docker-compose exec backend coverage run manage.py test
docker-compose exec backend coverage report
```

---

*Plano de Testes — Nos Studio Fluir | Versão 1.0 — 02/04/2026 — Uid Software*
