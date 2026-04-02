# Dicionário de Dados — Sistema Nos Studio Fluir

**Versão:** 2.1
**Data:** 02/04/2026
**Autor:** Uid Software
**Projeto:** Nos Studio Fluir — Sistema Oficial em Produção

---

## Índice

1. [Módulo Financeiro](#módulo-financeiro)
2. [Módulo Operacional](#módulo-operacional)
3. [Módulo Técnico](#módulo-técnico)
4. [Módulo Autenticação](#módulo-autenticação)
5. [Tabelas Intermediárias N:N](#tabelas-intermediárias-nn)
6. [Convenções Gerais](#convenções-gerais)

---

## Convenções Gerais

### Tipos de Dados

| Tipo | Descrição |
|---|---|
| INTEGER | Número inteiro |
| DECIMAL(p,s) | Número decimal — p=total dígitos, s=casas decimais |
| VARCHAR(n) | Texto com limite de n caracteres |
| TEXT | Texto sem limite definido |
| DATE | Data (YYYY-MM-DD) |
| TIME | Hora (HH:MM:SS) |
| DATETIME | Data e hora (YYYY-MM-DD HH:MM:SS) |
| TIMESTAMP | Data/hora automática |
| BOOLEAN | Verdadeiro/Falso |

### Campos Padrão de Auditoria (BaseModel)

Todas as tabelas herdam de `BaseModel` (abstract) e possuem:

| Campo | Tipo | Descrição |
|---|---|---|
| created_at | TIMESTAMP | Data/hora de criação — automático |
| updated_at | TIMESTAMP | Data/hora da última atualização — automático |
| deleted_at | TIMESTAMP (nullable) | Data/hora de exclusão lógica (soft delete) |
| created_by | INTEGER FK | ID do usuário que criou |
| updated_by | INTEGER FK | ID do usuário que atualizou |
| deleted_by | INTEGER FK (nullable) | ID do usuário que deletou |

### Notações

- **PK**: Primary Key (Chave Primária)
- **FK**: Foreign Key (Chave Estrangeira)
- **NOT NULL**: Campo obrigatório
- **NULL**: Campo opcional
- **UNIQUE**: Valor único na tabela
- **ENUM**: Lista fechada de valores permitidos
- **Soft Delete**: NUNCA usar `objeto.delete()` — setar `deleted_at` + `deleted_by`

---

## Módulo Financeiro

### 1. Fornecedor

**Tabela:** `fornecedor`
**Descrição:** Cadastro de fornecedores de produtos e serviços para o Studio Fluir.

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| forn_id | INTEGER | NÃO | AUTO | PK | Identificador único do fornecedor |
| forn_nome_empresa | VARCHAR(200) | NÃO | — | — | Razão social ou nome fantasia |
| forn_nome_dono | VARCHAR(150) | SIM | NULL | — | Nome do proprietário/responsável |
| forn_cnpj | VARCHAR(18) | SIM | NULL | UNIQUE | CNPJ — somente números (14 dígitos) |
| forn_endereco | VARCHAR(300) | SIM | NULL | — | Endereço completo |
| forn_telefone | VARCHAR(20) | SIM | NULL | — | Telefone de contato |
| forn_email | VARCHAR(150) | SIM | NULL | — | E-mail para contato |
| forn_ativo | BOOLEAN | NÃO | TRUE | — | Indica se o fornecedor está ativo |

**Regras de Negócio:**
- RN-FORN-01: CNPJ deve ter 14 dígitos — armazenar sem formatação
- RN-FORN-02: CNPJ deve ser único no sistema
- RN-FORN-03: Fornecedores inativos não podem ser selecionados em novas compras

---

### 2. ServicoProduto

**Tabela:** `servico_produto`
**Descrição:** Catálogo de serviços e produtos comercializados pelo Studio Fluir.

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| serv_id | INTEGER | NÃO | AUTO | PK | Identificador único |
| serv_nome | VARCHAR(125) | NÃO | — | — | Nome do serviço/produto |
| serv_descricao | TEXT | SIM | NULL | — | Descrição detalhada |
| serv_valor_base | DECIMAL(10,2) | NÃO | — | — | Valor base em R$ |
| serv_tipo | VARCHAR(20) | NÃO | — | ENUM | Tipo: 'servico' ou 'produto' |
| serv_ativo | BOOLEAN | NÃO | TRUE | — | Disponível para venda |

**Valores ENUM:**
- `serv_tipo`: `servico`, `produto`

**Regras de Negócio:**
- RN-SERV-01: Valor base deve ser maior que zero
- RN-SERV-02: Serviços inativos não aparecem para seleção em novos contratos

**Exemplos:**
```
Avaliação Física, Funcional e de Saúde — R$ 70,00
Treinamento Funcional (Mensal) — R$ 150,00
Mat Pilates (Trimestral) — R$ 140,00
```

---

### 3. ContasPagar

**Tabela:** `contas_pagar`
**Descrição:** Controle de contas a pagar (despesas) do Studio Fluir.

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| pag_id | INTEGER | NÃO | AUTO | PK | Identificador único da conta |
| forn_id | INTEGER | NÃO | — | FK → Fornecedor | Fornecedor relacionado |
| serv_id | INTEGER | SIM | NULL | FK → ServicoProduto | Serviço/produto comprado |
| pag_data_emissao | DATETIME | NÃO | — | — | Data de emissão da conta |
| pag_data_vencimento | DATETIME | NÃO | — | — | Data de vencimento |
| pag_data_pagamento | DATETIME | SIM | NULL | — | Data efetiva do pagamento |
| pag_descricao | VARCHAR(300) | NÃO | — | — | Descrição da despesa |
| pag_quantidade | INTEGER | NÃO | 1 | — | Quantidade de itens |
| pag_valor_unitario | DECIMAL(10,2) | NÃO | — | — | Valor unitário |
| pag_valor_total | DECIMAL(10,2) | NÃO | — | — | Valor total = qtd × valor_unitario |
| pag_status | VARCHAR(20) | NÃO | 'pendente' | ENUM | Status do pagamento |
| pag_forma_pagamento | VARCHAR(50) | SIM | NULL | — | Forma de pagamento |
| pag_observacoes | TEXT | SIM | NULL | — | Observações adicionais |

**Valores ENUM:**
- `pag_status`: `pendente`, `pago`, `vencido`, `cancelado`

**Regras de Negócio:**
- RN-CPAG-01: `pag_data_pagamento` só pode ser preenchida se `pag_status = 'pago'`
- RN-CPAG-02: `pag_valor_total` = `pag_quantidade × pag_valor_unitario`
- RN-CPAG-03: Status `vencido` atribuído automaticamente quando `pag_data_vencimento < hoje` e status ainda é `pendente`
- RN-CPAG-04: Ao pagar → signal cria lançamento automático no LivroCaixa (tipo `saida`)

---

### 4. ContasReceber

**Tabela:** `contas_receber`
**Descrição:** Controle de contas a receber (receitas) do Studio Fluir.

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| rec_id | INTEGER | NÃO | AUTO | PK | Identificador único da conta |
| alu_id | INTEGER | NÃO | — | FK → Alunos | Aluno relacionado |
| serv_id | INTEGER | SIM | NULL | FK → ServicoProduto | Serviço contratado |
| rec_data_emissao | DATETIME | NÃO | — | — | Data de emissão da cobrança |
| rec_data_vencimento | DATETIME | NÃO | — | — | Data de vencimento |
| rec_data_recebimento | DATETIME | SIM | NULL | — | Data efetiva do recebimento |
| rec_descricao | VARCHAR(300) | NÃO | — | — | Descrição da receita |
| rec_quantidade | INTEGER | NÃO | 1 | — | Quantidade |
| rec_valor_unitario | DECIMAL(10,2) | NÃO | — | — | Valor unitário |
| rec_desconto | DECIMAL(10,2) | NÃO | 0.00 | — | Desconto concedido |
| rec_valor_total | DECIMAL(10,2) | NÃO | — | — | Valor total = (qtd × unit) - desconto |
| rec_status | VARCHAR(20) | NÃO | 'pendente' | ENUM | Status do recebimento |
| rec_forma_recebimento | VARCHAR(50) | SIM | NULL | — | Forma de recebimento |
| rec_plano_tipo | VARCHAR(20) | SIM | NULL | ENUM | Tipo de plano |
| rec_observacoes | TEXT | SIM | NULL | — | Observações adicionais |

**Valores ENUM:**
- `rec_status`: `pendente`, `recebido`, `vencido`, `cancelado`
- `rec_plano_tipo`: `mensal`, `trimestral`, `semestral`

**Regras de Negócio:**
- RN-CREC-01: `rec_data_recebimento` só pode ser preenchida se `rec_status = 'recebido'`
- RN-CREC-02: `rec_valor_total` = (`rec_quantidade × rec_valor_unitario`) - `rec_desconto`
- RN-CREC-03: `rec_desconto` >= 0 e <= `rec_quantidade × rec_valor_unitario`
- RN-CREC-04: Ao receber → signal cria lançamento automático no LivroCaixa (tipo `entrada`)
- RN-CREC-05: Status `vencido` atribuído automaticamente quando vencimento passou

---

### 5. PlanosPagamentos

**Tabela:** `planos_pagamentos`
**Descrição:** Planos de pagamento recorrentes (mensalidades) dos alunos.

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| plan_id | INTEGER | NÃO | AUTO | PK | Identificador único do plano |
| alu_id | INTEGER | NÃO | — | FK → Alunos | Aluno vinculado |
| serv_id | INTEGER | NÃO | — | FK → ServicoProduto | Serviço contratado |
| plan_tipo_plano | VARCHAR(20) | NÃO | — | ENUM | Tipo do plano |
| plan_valor_plano | DECIMAL(10,2) | NÃO | — | — | Valor mensal do plano |
| plan_data_inicio | DATE | NÃO | — | — | Data de início |
| plan_data_fim | DATE | SIM | NULL | — | Data de término (NULL = indeterminado) |
| plan_dia_vencimento | INTEGER | NÃO | — | — | Dia do mês para vencimento (1-31) |
| plan_ativo | BOOLEAN | NÃO | TRUE | — | Plano ativo |

**Valores ENUM:**
- `plan_tipo_plano`: `mensal`, `trimestral`, `semestral`

**Regras de Negócio:**
- RN-PLAN-01: `plan_dia_vencimento` entre 1 e 31
- RN-PLAN-02: `plan_data_fim` deve ser maior que `plan_data_inicio`
- RN-PLAN-03: Planos inativos não geram novas cobranças
- RN-PLAN-04: Sistema gera Contas_Receber mensalmente baseado neste plano

---

### 6. LivroCaixa

**Tabela:** `livro_caixa`
**Descrição:** Registro imutável de todos os lançamentos financeiros (entradas e saídas).
**⚠️ IMUTÁVEL** — via `ReadCreateMixin`. Nunca editar ou deletar. Correções via estorno.

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| lica_id | INTEGER | NÃO | AUTO | PK | Identificador único do lançamento |
| lica_data_lancamento | DATETIME | NÃO | NOW() | — | Data/hora do lançamento |
| lica_tipo_lancamento | VARCHAR(20) | NÃO | — | ENUM | Tipo: `entrada` ou `saida` |
| lica_historico | VARCHAR(300) | NÃO | — | — | Descrição do lançamento |
| lica_valor | DECIMAL(10,2) | NÃO | — | — | Valor do lançamento |
| lica_categoria | VARCHAR(100) | SIM | NULL | — | Categoria (despesa/receita) |
| lica_origem_tipo | VARCHAR(20) | SIM | NULL | ENUM | Origem do lançamento |
| lica_origem_id | INTEGER | SIM | NULL | — | ID do registro de origem |
| lica_saldo_anterior | DECIMAL(10,2) | NÃO | — | — | Saldo antes deste lançamento |
| lica_saldo_atual | DECIMAL(10,2) | NÃO | — | — | Saldo após este lançamento |
| lica_forma_pagamento | VARCHAR(50) | SIM | NULL | — | Forma de pagamento/recebimento |

**Valores ENUM:**
- `lica_tipo_lancamento`: `entrada`, `saida`
- `lica_origem_tipo`: `contas_pagar`, `contas_receber`, `folha_pagamento`, `manual`

**Relacionamento Polimórfico:**
```
lica_origem_tipo = 'contas_pagar'    → lica_origem_id = ContasPagar.pag_id
lica_origem_tipo = 'contas_receber'  → lica_origem_id = ContasReceber.rec_id
lica_origem_tipo = 'folha_pagamento' → lica_origem_id = FolhaPagamento.fopa_id
lica_origem_tipo = 'manual'          → lica_origem_id = NULL
```

**Regras de Negócio:**
- RN-LICA-01: Lançamentos **NUNCA** devem ser editados ou deletados
- RN-LICA-02: Correções devem ser feitas via lançamentos de estorno
- RN-LICA-03: `lica_saldo_atual` = `lica_saldo_anterior` + valor (entrada) ou - valor (saída)
- RN-LICA-04: Se `lica_origem_tipo != 'manual'`, deve ter `lica_origem_id` preenchido
- RN-LICA-05: Signals já checam existência — não remover nem duplicar

---

### 7. FolhaPagamento

**Tabela:** `folha_pagamento`
**Descrição:** Controle da folha de pagamento dos funcionários.

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| fopa_id | INTEGER | NÃO | AUTO | PK | Identificador único da folha |
| func_id | INTEGER | NÃO | — | FK → Funcionario | Funcionário relacionado |
| fopa_mes_referencia | INTEGER | NÃO | — | — | Mês de referência (1-12) |
| fopa_ano_referencia | INTEGER | NÃO | — | — | Ano de referência (ex: 2026) |
| fopa_salario_base | DECIMAL(10,2) | NÃO | — | — | Salário base |
| fopa_descontos | DECIMAL(10,2) | NÃO | 0.00 | — | Total de descontos |
| fopa_valor_liquido | DECIMAL(10,2) | NÃO | — | — | Valor líquido a pagar |
| fopa_data_pagamento | DATE | SIM | NULL | — | Data efetiva do pagamento |
| fopa_status | VARCHAR(20) | NÃO | 'pendente' | ENUM | Status do pagamento |

**Valores ENUM:**
- `fopa_status`: `pendente`, `pago`, `cancelado`

**Constraints:**
- `UNIQUE(func_id, fopa_mes_referencia, fopa_ano_referencia)` — evita folha duplicada

**Regras de Negócio:**
- RN-FOPA-01: `fopa_mes_referencia` entre 1 e 12
- RN-FOPA-02: `fopa_valor_liquido` = `fopa_salario_base` - `fopa_descontos`
- RN-FOPA-03: **Folha NÃO gera lançamento automático no LivroCaixa**
- RN-FOPA-04: Ao marcar como `pago`, administrador DEVE criar manualmente o lançamento no LivroCaixa com `origem_tipo='folha_pagamento'`

---

## Módulo Operacional

### 8. Alunos

**Tabela:** `alunos`
**Descrição:** Cadastro de alunos do Studio Fluir.

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| alu_id | INTEGER | NÃO | AUTO | PK | Identificador único do aluno |
| alu_nome | VARCHAR(150) | NÃO | — | — | Nome completo |
| alu_documento | VARCHAR(14) | NÃO | — | UNIQUE | CPF — somente números (11 dígitos) |
| alu_data_nascimento | DATE | NÃO | — | — | Data de nascimento |
| alu_endereco | VARCHAR(300) | SIM | NULL | — | Endereço completo |
| alu_email | VARCHAR(150) | SIM | NULL | — | E-mail de contato |
| alu_telefone | VARCHAR(20) | SIM | NULL | — | Telefone de contato |
| alu_peso | DECIMAL(5,2) | SIM | NULL | — | Peso em kg |
| alu_massa_muscular | DECIMAL(5,2) | SIM | NULL | — | Massa muscular em kg |
| alu_massa_gorda | DECIMAL(5,2) | SIM | NULL | — | Massa gorda em kg |
| alu_porcentagem_gordura | DECIMAL(5,2) | SIM | NULL | — | Percentual de gordura (%) |
| alu_circunferencia_abdominal | DECIMAL(5,2) | SIM | NULL | — | Circunferência abdominal em cm |

**Regras de Negócio:**
- RN-ALU-01: CPF deve ter 11 dígitos — armazenar sem formatação (preserva zeros à esquerda)
- RN-ALU-02: CPF deve ser único no sistema
- RN-ALU-03: Idade mínima: 12 anos (calculado a partir de `alu_data_nascimento`)
- RN-ALU-04: Campos de medidas corporais são opcionais — atualizados nas avaliações

---

### 9. Funcionario

**Tabela:** `funcionario`
**Descrição:** Cadastro de funcionários (professores, administrativo, etc).

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| func_id | INTEGER | NÃO | AUTO | PK | Identificador único do funcionário |
| prof_id | INTEGER | SIM | NULL | FK → Profissao | Profissão do funcionário |
| func_nome | VARCHAR(150) | NÃO | — | — | Nome completo |
| func_documento | VARCHAR(14) | NÃO | — | UNIQUE | CPF — somente números (11 dígitos) |
| func_endereco | VARCHAR(300) | SIM | NULL | — | Endereço completo |
| func_telefone | VARCHAR(20) | SIM | NULL | — | Telefone de contato |
| func_formacao | VARCHAR(200) | SIM | NULL | — | Formação acadêmica |
| func_salario | DECIMAL(10,2) | NÃO | — | — | Salário mensal |

**Regras de Negócio:**
- RN-FUNC-01: CPF deve ter 11 dígitos e ser único
- RN-FUNC-02: Salário deve ser maior que zero
- RN-FUNC-03: Professores devem ter formação cadastrada

---

### 10. Profissao

**Tabela:** `profissao`
**Descrição:** Catálogo de profissões/cargos dos funcionários.

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| prof_id | INTEGER | NÃO | AUTO | PK | Identificador único da profissão |
| prof_nome | VARCHAR(100) | NÃO | — | UNIQUE | Nome da profissão |

**Exemplos:** Professor de Pilates, Fisioterapeuta, Recepcionista, Administrador

---

### 11. Turma

**Tabela:** `turma`
**Descrição:** Turmas/grupos de aulas. Máximo de 15 alunos por turma.

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| tur_id | INTEGER | NÃO | AUTO | PK | Identificador único da turma |
| func_id | INTEGER | NÃO | — | FK → Funcionario | Professor responsável |
| tur_nome | VARCHAR(100) | NÃO | — | UNIQUE | Nome da turma (ex: "PlSeg_Qua17:00") |
| tur_horario | VARCHAR(50) | NÃO | — | — | Horário da turma |

**Regras de Negócio:**
- RN-TUR-01: Máximo 15 alunos por turma (verificado via TurmaAlunos)
- RN-TUR-02: Nome da turma deve ser único
- RN-TUR-03: Relacionamento N:N com Alunos via tabela `TurmaAlunos`

---

### 12. TurmaAlunos

**Tabela:** `turma_alunos`
**Descrição:** Relacionamento N:N entre Turmas e Alunos (matrícula).

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| tual_id | INTEGER | NÃO | AUTO | PK | Identificador único |
| tur_id | INTEGER | NÃO | — | FK → Turma | Turma |
| alu_id | INTEGER | NÃO | — | FK → Alunos | Aluno |
| data_matricula | DATE | NÃO | — | — | Data da matrícula |
| ativo | BOOLEAN | NÃO | TRUE | — | Matrícula ativa |

**Constraints:**
- `UNIQUE(tur_id, alu_id)` — aluno não pode estar matriculado duas vezes na mesma turma

**Regras de Negócio:**
- RN-TUAL-01: Não pode haver registro duplicado (mesma turma + mesmo aluno ativo)
- RN-TUAL-02: Para remover aluno da turma, setar `ativo = FALSE` (soft delete)

---

### 13. AgendamentoHorario

**Tabela:** `agendamento_horario`
**Descrição:** Pré-agendamento de horários disponíveis dos alunos (via site).

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| agho_id | INTEGER | NÃO | AUTO | PK | Identificador único |
| alu_id | INTEGER | NÃO | — | FK → Alunos | Aluno |
| agho_dias_disponiveis | VARCHAR(100) | NÃO | — | — | Dias separados por vírgula (seg,qua,sex) |
| agho_horarios_disponiveis | VARCHAR(200) | NÃO | — | — | Horários separados por vírgula (07:00,17:00) |

**Regras de Negócio:**
- RN-AGHO-01: Dias válidos: `seg`, `ter`, `qua`, `qui`, `sex`, `sab`, `dom`
- RN-AGHO-02: Horários no formato HH:MM

---

### 14. AgendamentoTurmas

**Tabela:** `agendamento_turmas`
**Descrição:** Pré-cadastro de alunos interessados em turmas específicas (via site).

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| agtu_id | INTEGER | NÃO | AUTO | PK | Identificador único |
| alu_id | INTEGER | NÃO | — | FK → Alunos | Aluno interessado |
| agtu_dias_disponiveis | VARCHAR(100) | NÃO | — | — | Dias separados por vírgula |
| agtu_horarios_disponiveis | VARCHAR(200) | NÃO | — | — | Horários separados por vírgula |
| agtu_nivelamento | VARCHAR(50) | SIM | NULL | — | Nível (iniciante, intermediário, avançado) |

**Regras de Negócio:**
- RN-AGTU-01: Após criação de turma, administrador matricula aluno via TurmaAlunos

---

## Módulo Técnico

### 15. Exercicios

**Tabela:** `exercicios`
**Descrição:** Biblioteca/catálogo de exercícios de Pilates e funcional.

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| exe_id | INTEGER | NÃO | AUTO | PK | Identificador único do exercício |
| exe_nome | VARCHAR(125) | NÃO | — | — | Nome do exercício (ex: "The Hundred") |
| exe_aparelho | VARCHAR(20) | NÃO | — | ENUM | Aparelho utilizado |
| exe_descricao_tecnica | TEXT | SIM | NULL | — | Descrição técnica do movimento |

**Valores ENUM:**
- `exe_aparelho`: `solo`, `reformer`, `cadillac`, `chair`, `barrel`

**Regras de Negócio:**
- RN-EXE-01: O mesmo exercício em aparelhos diferentes = registros independentes
- RN-EXE-02: Ex: "The Hundred - Solo" e "The Hundred - Reformer" são dois registros distintos

---

### 16. FichaTreino

**Tabela:** `ficha_treino`
**Descrição:** Fichas/programas de treino montados pelos professores.

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| fitr_id | INTEGER | NÃO | AUTO | PK | Identificador único da ficha |
| fitr_nome | VARCHAR(150) | NÃO | — | — | Nome da ficha (ex: "Core Nível 1") |

**Relacionamentos:**
- N:N com Exercicios via tabela `FichaTreinoExercicios`

---

### 17. FichaTreinoExercicios

**Tabela:** `ficha_treino_exercicios`
**Descrição:** Relacionamento N:N entre FichaTreino e Exercicios, com dados do exercício na ficha.

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| ftex_id | INTEGER | NÃO | AUTO | PK | Identificador único |
| fitr_id | INTEGER | NÃO | — | FK → FichaTreino | Ficha de treino |
| exe_id | INTEGER | NÃO | — | FK → Exercicios | Exercício |
| ftex_ordem | INTEGER | NÃO | — | — | Ordem do exercício na ficha (1, 2, 3...) |
| ftex_repeticoes | INTEGER | NÃO | — | — | Número de repetições |
| ftex_series | INTEGER | SIM | NULL | — | Número de séries |
| ftex_observacoes | TEXT | SIM | NULL | — | Observações específicas |

**Regras de Negócio:**
- RN-FTEX-01: `ftex_ordem` deve ser sequencial dentro da mesma ficha
- RN-FTEX-02: `ftex_repeticoes` deve ser > 0
- RN-FTEX-03: Não pode haver exercício duplicado na mesma ficha

---

### 18. Aulas

**Tabela:** `aulas`
**Descrição:** Registro de aulas ministradas. 1 linha = 1 aluno em 1 aula.

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| aul_id | INTEGER | NÃO | AUTO | PK | Identificador único da aula |
| tur_id | INTEGER | NÃO | — | FK → Turma | Turma que teve a aula |
| alu_id | INTEGER | NÃO | — | FK → Alunos | Aluno na aula |
| fitr_id | INTEGER | SIM | NULL | FK → FichaTreino | Ficha de treino utilizada |
| cred_id | INTEGER | SIM | NULL | FK → CreditoReposicao | Crédito usado (se reposição) |
| aul_data | DATE | NÃO | — | — | Data da aula |
| aul_hora_inicio | TIME | NÃO | — | — | Hora de início |
| aul_pressao_inicio | VARCHAR(10) | SIM | NULL | — | Pressão arterial inicial (formato: "120/80") |
| aul_pressao_final | VARCHAR(10) | SIM | NULL | — | Pressão arterial final (formato: "130/85") |
| aul_tipo_falta | VARCHAR(20) | SIM | NULL | ENUM | Tipo de falta (se houver) |
| aul_hora_final | TIME | SIM | NULL | — | Hora de término |
| aul_tipo_presenca | VARCHAR(20) | NÃO | 'regular' | ENUM | Tipo de presença |
| aul_intensidade_esforco | INTEGER | SIM | NULL | — | Intensidade do esforço (0-10) |

**Constraints:**
- `UNIQUE(tur_id, alu_id, aul_data, aul_hora_inicio)` — evita duplicação de registro de aula

**Valores ENUM:**
- `aul_tipo_presenca`: `regular`, `falta`, `reposicao`
- `aul_tipo_falta`: `sem_aviso`, `justificada`, `atestado`, `cenario3`

**Regras de Negócio:**
- RN-AUL-01: `aul_hora_final` deve ser maior que `aul_hora_inicio`
- RN-AUL-02: Pressão arterial no formato "999/99" ou "99/99" — regex `^\d{2,3}/\d{2}$`
- RN-AUL-03: Sistólica entre 50-250 / diastólica entre 30-150
- RN-AUL-04: Intensidade do esforço entre 0 e 10
- RN-AUL-05: `aul_tipo_falta` só preenchido quando `aul_tipo_presenca = 'falta'`
- RN-AUL-06: `cred_id` só preenchido quando `aul_tipo_presenca = 'reposicao'`
- RN-AUL-07: Falta `justificada` ou `atestado` → gera CreditoReposicao automaticamente via signal

---

### 19. CreditoReposicao ⭐ NOVO — Fase 4

**Tabela:** `creditos_reposicao`
**Descrição:** Créditos de reposição gerados quando aluno falta justificadamente.

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| cred_id | INTEGER | NÃO | AUTO | PK | Identificador único |
| alu_id | INTEGER | NÃO | — | FK → Alunos | Aluno dono do crédito |
| aula_origem_id | INTEGER | NÃO | — | FK → Aulas | Aula que gerou o crédito (falta) |
| aula_reposicao_id | INTEGER | SIM | NULL | FK → Aulas | Aula onde o crédito foi usado |
| cred_data_geracao | DATETIME | NÃO | — | — | Data/hora de geração |
| cred_data_expiracao | DATETIME | NÃO | — | — | Data de expiração (geração + 30 dias) |
| cred_usado | BOOLEAN | NÃO | FALSE | — | FALSE = disponível / TRUE = usado |
| cred_status | VARCHAR(20) | NÃO | 'disponivel' | ENUM | Status atual do crédito |

**Valores ENUM:**
- `cred_status`: `disponivel`, `usado`, `expirado`

**Regras de Negócio:**
- RN-CRED-01: `cred_data_expiracao` = `cred_data_geracao` + 30 dias corridos (calculado no `save()`)
- RN-CRED-02: Máximo 3 créditos simultâneos com status `disponivel` por aluno
- RN-CRED-03: Ao usar crédito → `cred_usado = True`, `cred_status = 'usado'`, preencher `aula_reposicao_id`
- RN-CRED-04: Crédito com `cred_data_expiracao < hoje` → atualizar status para `expirado`
- RN-CRED-05: Uso cruzado (Pilates ↔ Funcional): máximo 1x por mês
- RN-CRED-06: Se aluno faltou na reposição → crédito perdido definitivamente (`expirado`)
- RN-CRED-07: Prioridade de consumo: crédito mais próximo de expirar primeiro (FIFO por validade)
- RN-CRED-08: Gerado automaticamente via signal quando `aul_tipo_falta` = `justificada` ou `atestado`

**⚠️ Pendências (definir em reunião com clientes):**
- Aviso com mais de 48h antes → gera crédito ou não?
- Mistura de níveis na aula de reposição → fluxo de aprovação

---

## Módulo Autenticação

### 20. User

**Tabela:** `users`
**Descrição:** Usuários do sistema. Autenticação por **email** (não username).
**Herda:** `AbstractUser` do Django.

| Campo | Tipo | Nulo? | Padrão | Constraints | Descrição |
|---|---|---|---|---|---|
| id | INTEGER | NÃO | AUTO | PK | Identificador único |
| email | VARCHAR(150) | NÃO | — | UNIQUE | E-mail — campo de login |
| password | VARCHAR(255) | NÃO | — | — | Senha criptografada (bcrypt) |
| is_active | BOOLEAN | NÃO | TRUE | — | Usuário ativo |
| is_staff | BOOLEAN | NÃO | FALSE | — | Acesso ao admin Django |
| is_superuser | BOOLEAN | NÃO | FALSE | — | Superusuário |
| last_login | TIMESTAMP | SIM | NULL | — | Último acesso |
| date_joined | TIMESTAMP | NÃO | NOW() | — | Data de criação |

**Perfis de Acesso (Grupos Django):**

| Grupo | Permissões |
|---|---|
| Administrador | Acesso total sem restrição |
| Professor | Suas turmas, ministrar aula, fichas — sem financeiro |
| Financeiro | Módulo financeiro completo — sem técnico |
| Recepcionista | Cadastros, agendamentos, turmas — sem financeiro |

**Regras de Negócio:**
- RN-USER-01: Autenticação por email (não por username)
- RN-USER-02: Token JWT com blacklist habilitada
- RN-USER-03: Senha mínima 8 caracteres

---

## Glossário

| Termo | Definição |
|---|---|
| Soft Delete | Exclusão lógica — marca `deleted_at` sem remover do banco |
| ENUM | Lista fechada de valores permitidos |
| FK | Foreign Key (chave estrangeira) |
| PK | Primary Key (chave primária) |
| Signal | Evento Django disparado automaticamente após save/update |
| LivroCaixa | Registro imutável de toda movimentação financeira |
| CreditoReposicao | Direito do aluno de repor uma aula faltada justificadamente |
| Reposição Cruzada | Uso de crédito de Pilates em aula Funcional ou vice-versa |

---

*Dicionário de Dados — Nos Studio Fluir | Versão 2.1 — 02/04/2026 — Uid Software*
*Sistema oficial em produção — atualizar a cada mudança de modelo*
