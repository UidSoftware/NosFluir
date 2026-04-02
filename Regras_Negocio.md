# Regras de Negócio — Sistema Nos Studio Fluir

**Versão:** 1.0
**Data:** 02/04/2026
**Autor:** Uid Software
**Origem:** Levantamento de Requisitos + CLAUDE.md + Dicionário de Dados v2.1

---

## Índice

- [Módulo Financeiro](#módulo-financeiro)
- [Módulo Operacional](#módulo-operacional)
- [Módulo Técnico](#módulo-técnico)
- [Sistema de Créditos de Reposição](#sistema-de-créditos-de-reposição)
- [Autenticação e Acesso](#autenticação-e-acesso)

---

## Módulo Financeiro

---

### RN001 — Cálculo de Valor Total em Contas a Pagar

**Módulo:** Financeiro — Contas a Pagar
**Origem:** RF 3FN
**Descrição:** O valor total de uma conta a pagar deve ser calculado automaticamente.
**Condição:** Sempre que `pag_quantidade` ou `pag_valor_unitario` forem informados.
**Fórmula:** `pag_valor_total = pag_quantidade × pag_valor_unitario`
**Exceções:** Nenhuma — campo não é editável manualmente.
**Impacto:** Valor incorreto compromete o Livro Caixa e os relatórios financeiros.

---

### RN002 — Cálculo de Valor Total em Contas a Receber

**Módulo:** Financeiro — Contas a Receber
**Origem:** RF 3FN
**Descrição:** O valor total de uma conta a receber deve considerar descontos.
**Condição:** Sempre que os campos de valor forem informados.
**Fórmula:** `rec_valor_total = (rec_quantidade × rec_valor_unitario) - rec_desconto`
**Exceções:** `rec_desconto` deve ser >= 0 e <= `rec_quantidade × rec_valor_unitario`.
**Impacto:** Desconto inválido gera inconsistência financeira.

---

### RN003 — Lançamento Automático no Livro Caixa ao Pagar

**Módulo:** Financeiro — Contas a Pagar / Livro Caixa
**Origem:** RF 3FN
**Descrição:** Ao marcar uma Conta a Pagar como `pago`, o sistema cria automaticamente um lançamento de **saída** no Livro Caixa via Django Signal.
**Condição:** `pag_status` alterado de qualquer valor para `pago`.
**Exceções:** Signal já verifica existência de lançamento — não cria duplicatas.
**Impacto:** Saldo do caixa desatualizado se o signal não funcionar.

---

### RN004 — Lançamento Automático no Livro Caixa ao Receber

**Módulo:** Financeiro — Contas a Receber / Livro Caixa
**Origem:** RF 3FN
**Descrição:** Ao marcar uma Conta a Receber como `recebido`, o sistema cria automaticamente um lançamento de **entrada** no Livro Caixa via Django Signal.
**Condição:** `rec_status` alterado de qualquer valor para `recebido`.
**Exceções:** Signal já verifica existência de lançamento — não cria duplicatas.
**Impacto:** Saldo do caixa desatualizado se o signal não funcionar.

---

### RN005 — Imutabilidade do Livro Caixa

**Módulo:** Financeiro — Livro Caixa
**Origem:** RF 3FN
**Descrição:** Lançamentos no Livro Caixa são imutáveis — nunca devem ser editados ou deletados.
**Condição:** Qualquer tentativa de UPDATE ou DELETE em `livro_caixa`.
**Exceções:** Nenhuma.
**Como corrigir:** Criar lançamento de estorno com valor e tipo inversos.
**Impacto técnico:** Implementado via `ReadCreateMixin` no Django — retorna 403 em PUT/PATCH/DELETE.

---

### RN006 — Saldo Calculado no Livro Caixa

**Módulo:** Financeiro — Livro Caixa
**Origem:** RF 3FN
**Descrição:** Cada lançamento deve registrar o saldo anterior e calcular o saldo atual.
**Fórmula entrada:** `lica_saldo_atual = lica_saldo_anterior + lica_valor`
**Fórmula saída:** `lica_saldo_atual = lica_saldo_anterior - lica_valor`
**Condição:** Sempre que um lançamento for criado.
**Impacto:** Saldo inconsistente compromete a auditoria financeira.

---

### RN007 — Folha de Pagamento NÃO gera lançamento automático

**Módulo:** Financeiro — Folha de Pagamento
**Origem:** CLAUDE.md
**Descrição:** A Folha de Pagamento **NÃO** dispara signal para o Livro Caixa. O administrador deve criar o lançamento manualmente ao marcar a folha como `pago`.
**Condição:** `fopa_status` alterado para `pago`.
**Ação manual:** Criar lançamento de saída no LivroCaixa com `origem_tipo='folha_pagamento'` e `origem_id=fopa_id`.
**Impacto:** Folha paga sem lançamento manual = saldo errado no caixa.

---

### RN008 — Folha de Pagamento única por funcionário/mês/ano

**Módulo:** Financeiro — Folha de Pagamento
**Origem:** Dicionário de Dados
**Descrição:** Não pode existir mais de uma folha de pagamento para o mesmo funcionário no mesmo mês e ano.
**Constraint:** `UNIQUE(func_id, fopa_mes_referencia, fopa_ano_referencia)`
**Impacto:** Duplicidade gera pagamento em dobro.

---

### RN009 — Valor líquido da Folha de Pagamento

**Módulo:** Financeiro — Folha de Pagamento
**Origem:** Levantamento de Requisitos
**Fórmula:** `fopa_valor_liquido = fopa_salario_base - fopa_descontos`
**Condição:** Calculado automaticamente ao salvar.
**Impacto:** Valor líquido incorreto = funcionário recebe valor errado.

---

### RN010 — Status vencido automático

**Módulo:** Financeiro — Contas a Pagar e Contas a Receber
**Origem:** Dicionário de Dados
**Descrição:** Contas com `data_vencimento < data_atual` e status ainda `pendente` devem ter status atualizado para `vencido` automaticamente.
**Condição:** Verificado em job periódico ou ao listar contas.
**Impacto:** Relatórios financeiros imprecisos.

---

### RN011 — CNPJ armazenado sem formatação

**Módulo:** Financeiro — Fornecedores
**Origem:** Convenções gerais
**Descrição:** CNPJ deve ser armazenado apenas com os 14 dígitos numéricos, sem pontos, barras ou hífens. A formatação é responsabilidade do frontend.
**Impacto:** Formatação no banco causa problemas de comparação e busca.

---

## Módulo Operacional

---

### RN012 — CPF armazenado sem formatação

**Módulo:** Operacional — Alunos e Funcionários
**Origem:** CLAUDE.md
**Descrição:** CPF deve ser armazenado como string com 11 dígitos numéricos, sem pontos ou hífens. Zeros à esquerda devem ser preservados. A formatação é responsabilidade do frontend.
**Impacto:** CPF como número perde zeros à esquerda e quebra a unicidade.

---

### RN013 — Aluno com idade mínima

**Módulo:** Operacional — Alunos
**Origem:** Dicionário de Dados
**Descrição:** Alunos devem ter no mínimo 12 anos de idade no momento do cadastro.
**Condição:** Calculado a partir de `alu_data_nascimento` na validação do serializer.
**Impacto:** Menores de 12 anos não devem ser cadastrados no sistema.

---

### RN014 — Limite máximo de alunos por turma

**Módulo:** Operacional — Turmas
**Origem:** CLAUDE.md
**Descrição:** Cada turma comporta no máximo 15 alunos simultaneamente.
**Condição:** Verificado ao criar novo registro em `TurmaAlunos`.
**Exceções:** Nenhuma — administrador não pode ultrapassar o limite.
**Impacto:** Superlotação compromete a qualidade das aulas de Pilates.

---

### RN015 — Matrícula única por turma

**Módulo:** Operacional — TurmaAlunos
**Origem:** Dicionário de Dados
**Descrição:** Um aluno não pode estar matriculado duas vezes na mesma turma.
**Constraint:** `UNIQUE(tur_id, alu_id)` na tabela `turma_alunos`.
**Como remover:** Setar `ativo = FALSE` (soft delete).
**Impacto:** Duplicidade afeta contagem de alunos e gera registros de aula duplicados.

---

### RN016 — Reutilização de tabela Alunos no pré-agendamento

**Módulo:** Operacional — Agendamentos
**Origem:** RF 8FN
**Descrição:** Pré-agendamentos (horários e turmas) utilizam a tabela Alunos como referência, não criam nome/telefone redundantes. O Django salva as informações do aluno e busca pelo ID.
**Condição:** Ao registrar um agendamento via site.
**Impacto:** Dados duplicados dificultam gestão e geram inconsistências.

---

### RN017 — Soft Delete obrigatório

**Módulo:** Todos
**Origem:** CLAUDE.md
**Descrição:** Nenhum registro deve ser removido do banco com `objeto.delete()`. Sempre usar exclusão lógica: setar `deleted_at` com a data/hora atual e `deleted_by` com o ID do usuário.
**Exceções:** Nenhuma.
**Impacto:** Exclusão física perde histórico e quebra integridade referencial.

---

### RN018 — Dinheiro sempre como DECIMAL

**Módulo:** Todos
**Origem:** CLAUDE.md
**Descrição:** Todos os campos monetários devem ser do tipo `DECIMAL(10,2)`. Nunca usar Float ou Double para valores financeiros.
**Impacto:** Float causa arredondamentos incorretos em cálculos financeiros (ex: R$0.01 de diferença acumulada).

---

## Módulo Técnico

---

### RN019 — Formato de Pressão Arterial

**Módulo:** Técnico — Aulas
**Origem:** RF 9FN + CLAUDE.md
**Descrição:** A pressão arterial deve ser registrada no formato "sistólica/diastólica".
**Regex de validação:** `^\d{2,3}/\d{2}$`
**Limites válidos:** Sistólica: 50–250 / Diastólica: 30–150
**Exemplos válidos:** `120/80`, `130/85`, `100/70`
**Impacto:** Formato inválido impossibilita análise de dados de saúde dos alunos.

---

### RN020 — Coleta de Pressão no Início e Fim da Aula

**Módulo:** Técnico — Aulas
**Origem:** RF 9FN + Levantamento de Requisitos
**Descrição:** Ao ministrar uma aula, o professor deve coletar a pressão arterial dos alunos no início e ao finalizar a aula.
**Condição:** `aul_pressao_inicio` coletada ao iniciar. `aul_pressao_final` e `aul_intensidade_esforco` coletados ao finalizar.
**Impacto:** Dados incompletos de saúde dos alunos.

---

### RN021 — Escala de Intensidade de Esforço

**Módulo:** Técnico — Aulas
**Origem:** RF 9FN
**Descrição:** A intensidade de esforço percebido pelo aluno ao final da aula deve ser registrada em escala de 0 a 10.
**Condição:** Campo preenchido ao finalizar a aula.
**Validação:** Valor inteiro entre 0 e 10 (inclusive).
**Impacto:** Valores fora da escala tornam os relatórios de evolução inválidos.

---

### RN022 — Nome da Aula vs Nome da Turma

**Módulo:** Técnico — Aulas
**Origem:** RF 10FN
**Descrição:** O nome da aula é diferente do nome da turma. Uma turma pode ter múltiplas aulas em dias diferentes. Cada registro de aula é único por `(tur_id, alu_id, aul_data, aul_hora_inicio)`.
**Constraint:** `UNIQUE(tur_id, alu_id, aul_data, aul_hora_inicio)`
**Impacto:** Sem constraint, o mesmo aluno poderia ter duas presenças registradas na mesma aula.

---

### RN023 — Exercício por Aparelho = Registros Independentes

**Módulo:** Técnico — Exercícios
**Origem:** RF 5FN + RF 6FN
**Descrição:** O mesmo exercício executado em aparelhos diferentes é cadastrado como registros independentes, pois possuem variações técnicas distintas.
**Exemplo:** "The Hundred no Solo" e "The Hundred no Reformer" são dois registros diferentes com o mesmo nome mas aparelhos distintos.
**Impacto:** Registro único para múltiplos aparelhos não permite descrição técnica específica.

---

### RN024 — Ficha de Treino é separada dos Exercícios

**Módulo:** Técnico — FichaTreino
**Origem:** RF 6FN
**Descrição:** A FichaTreino apenas armazena o nome do treino. Os exercícios, séries, repetições e observações ficam na tabela intermediária `FichaTreinoExercicios`, permitindo reutilizar exercícios em múltiplas fichas.
**Impacto:** Acoplamento direto impede reutilização de exercícios entre fichas.

---

## Sistema de Créditos de Reposição

---

### RN025 — Direito ao Crédito de Reposição

**Módulo:** Técnico — Créditos de Reposição
**Origem:** RF 11FN + CLAUDE.md
**Descrição:** O aluno tem direito ao crédito de reposição apenas nas seguintes situações:

| Situação | Gera crédito? |
|---|---|
| Atestado médico (qualquer prazo) | ✅ Sim — pula regra de antecedência |
| Aviso entre 48h e 1h antes da aula | ✅ Sim |
| Aviso com mais de 48h antes | ⚠️ Pendente — definir em reunião |
| Aviso com menos de 1h / sem aviso | ❌ Não |

**Impacto:** Crédito indevido gera injustiça com outros alunos e sobrecarga nas turmas.

---

### RN026 — Geração Automática de Crédito via Signal

**Módulo:** Técnico — Créditos de Reposição
**Origem:** RF 11FN + CLAUDE.md
**Descrição:** Ao registrar uma falta do tipo `justificada` ou `atestado` no campo `aul_tipo_falta`, o sistema deve gerar automaticamente um registro em `CreditoReposicao` via Django Signal.
**Condição:** `aul_tipo_presenca = 'falta'` e `aul_tipo_falta IN ('justificada', 'atestado')`
**Impacto:** Crédito não gerado = aluno prejudicado sem poder repor.

---

### RN027 — Validade e Limite de Créditos

**Módulo:** Técnico — Créditos de Reposição
**Origem:** RF 11FN + CLAUDE.md
**Descrição:** Cada crédito tem validade de 30 dias corridos a partir da data de geração. Um aluno pode ter no máximo 3 créditos com status `disponivel` simultaneamente.
**Fórmula:** `cred_data_expiracao = cred_data_geracao + 30 dias`
**Impacto:** Crédito expirado = perdido definitivamente. Mais de 3 créditos ativos não pode ser criado.

---

### RN028 — Prioridade FIFO na Utilização de Créditos

**Módulo:** Técnico — Créditos de Reposição
**Origem:** CLAUDE.md
**Descrição:** Ao utilizar um crédito, o sistema deve consumir primeiro o crédito com a data de expiração mais próxima (FIFO por validade).
**Condição:** Sempre que o aluno usar um crédito de reposição.
**Impacto:** Consumir crédito mais novo deixa o mais velho expirar — aluno perde sem saber.

---

### RN029 — Reposição em Modalidade Diferente (Cruzada)

**Módulo:** Técnico — Créditos de Reposição
**Origem:** RF 12FN + CLAUDE.md
**Descrição:** O aluno pode usar o crédito em uma modalidade diferente (ex: crédito de Pilates em aula Funcional), com as seguintes restrições:
- Máximo 1 reposição cruzada por mês
- Só pode usar em modalidade diferente novamente após 2 créditos usados na modalidade própria
**Condição:** Verificado pelo sistema ao confirmar o uso do crédito.
**Impacto:** Reposição cruzada excessiva desequilibra as turmas.

---

### RN030 — Falta na Reposição = Crédito Perdido

**Módulo:** Técnico — Créditos de Reposição
**Origem:** CLAUDE.md
**Descrição:** Se o aluno não comparecer à aula de reposição (falta sem aviso), o crédito utilizado é perdido definitivamente. O status é alterado para `expirado`.
**Condição:** `aul_tipo_presenca = 'falta'` e `aul_tipo_presenca = 'reposicao'` na aula vinculada ao crédito.
**Impacto:** Crédito não pode ser "devolvido" — perda definitiva.

---

## Autenticação e Acesso

---

### RN031 — Autenticação por E-mail

**Módulo:** Autenticação
**Origem:** RF 1FN + CLAUDE.md
**Descrição:** A autenticação no sistema deve ser feita por **e-mail e senha**, não por username. O campo `username` do Django não deve ser utilizado como campo de login.
**Impacto:** Login por username não funciona no sistema.

---

### RN032 — Token JWT com Blacklist

**Módulo:** Autenticação
**Origem:** RF não-funcional 6NFN
**Descrição:** A autenticação usa tokens JWT via `djangorestframework-simplejwt` com blacklist habilitada. Ao fazer logout, o refresh token deve ser invalidado na blacklist.
**Impacto:** Sem blacklist, tokens de usuários deslogados continuam válidos.

---

### RN033 — Perfis de Acesso por Grupos Django

**Módulo:** Autenticação
**Origem:** CLAUDE.md
**Descrição:** O controle de acesso é feito via Grupos do Django com 4 perfis:

| Perfil | Acesso |
|---|---|
| Administrador | Tudo sem restrição |
| Professor | Suas turmas, ministrar aula, fichas de treino — sem módulo financeiro |
| Financeiro | Módulo financeiro completo — sem módulo técnico |
| Recepcionista | Cadastros, agendamentos, turmas — sem módulo financeiro |

**Impacto:** Permissão incorreta expõe dados financeiros ou permite ações indevidas.

---

### RN034 — Auditoria em Todos os Registros

**Módulo:** Todos
**Origem:** CLAUDE.md
**Descrição:** Todos os models herdam `BaseModel` (abstract) que adiciona automaticamente os campos de auditoria: `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`, `deleted_by`.
**Condição:** Sempre que um registro for criado, atualizado ou deletado.
**Impacto:** Sem auditoria, não é possível rastrear quem fez o quê e quando.

---

### RN035 — Paginação obrigatória nas listagens

**Módulo:** API / Frontend
**Origem:** CLAUDE.md
**Descrição:** Todas as listagens da API usam `PageNumberPagination` com `PAGE_SIZE = 20`. O frontend **sempre** deve acessar `response.data.results` para obter os dados, nunca `response.data` diretamente.
**Estrutura da resposta:**
```json
{
  "count": 100,
  "next": "url",
  "previous": null,
  "results": []
}
```
**Impacto:** `response.data` retorna o objeto de paginação, não o array — quebra o frontend.

---

## Pendências em Aberto

As seguintes regras ainda precisam ser definidas em reunião com as clientes (Giulia e Tássia):

| ID | Assunto | Impacto |
|---|---|---|
| PEND-01 | Aviso com mais de 48h antes da aula → gera crédito ou não? | RN025 |
| PEND-02 | Mistura de níveis na aula de reposição → fluxo de aprovação pelo professor | RN029 |

---

*Regras de Negócio — Nos Studio Fluir | Versão 1.0 — 02/04/2026 — Uid Software*
