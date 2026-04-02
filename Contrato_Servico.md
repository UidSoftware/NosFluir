# Contrato de Prestação de Serviços de Desenvolvimento de Software
## Nos Studio Fluir — Uid Software

> ⚠️ **RASCUNHO GERADO AUTOMATICAMENTE**
> Este documento é um rascunho baseado no levantamento de requisitos.
> Revisão jurídica obrigatória pela Uid Software antes da assinatura.

---

**CONTRATO Nº:** [PREENCHER]
**DATA:** [PREENCHER]

---

## 1. IDENTIFICAÇÃO DAS PARTES

**CONTRATANTE:**
- **Razão Social:** Studio Fluir
- **Sócia:** Giulia Fagionato
- **Sócia:** Tássia Magnaboso
- **CNPJ:** [PREENCHER]
- **Endereço:** Uberlândia, Minas Gerais
- **E-mail:** giuliaruffino015@gmail.com / tassiamagnabosco@hotmail.com
- **Telefone:** [PREENCHER]

**CONTRATADA:**
- **Razão Social:** Uid Software e Tecnologia
- **CNPJ:** [PREENCHER]
- **Endereço:** [PREENCHER]
- **E-mail:** [PREENCHER]
- **Telefone:** [PREENCHER]
- **Representante Legal:** [PREENCHER]

---

## 2. OBJETO DO CONTRATO

O presente contrato tem como objeto a prestação de serviços de **desenvolvimento, implantação e manutenção** do sistema web denominado **"Nos Studio Fluir"**, um sistema de gestão completo para o Studio Fluir, conforme especificações detalhadas neste instrumento e nos documentos técnicos anexos.

O sistema é composto por:
- **Sistema de Gestão Web** (backend + frontend) — acessível em `nostudiofluir.com.br/sistema/`
- **Site Institucional** — acessível em `nostudiofluir.com.br/`
- **Infraestrutura** — servidor VPS, banco de dados PostgreSQL, SSL, Docker

---

## 3. ESCOPO DETALHADO

### 3.1 Módulo Financeiro
- Livro Caixa com lançamentos automáticos e imutabilidade para auditoria
- Contas a Pagar com controle de status e lançamento automático ao pagar
- Contas a Receber com controle de status e lançamento automático ao receber
- Planos de Pagamento recorrentes (mensal, trimestral, semestral)
- Folha de Pagamento com cálculo de valor líquido
- Cadastro de Fornecedores e Serviços/Produtos

### 3.2 Módulo Operacional
- Cadastro completo de Alunos com dados antropométricos
- Cadastro de Funcionários com profissão e formação
- Gestão de Turmas com limite de 15 alunos por turma
- Matrícula de alunos em turmas
- Pré-agendamentos via site institucional (horários e turmas)

### 3.3 Módulo Técnico
- Biblioteca de Exercícios por aparelho (Solo, Reformer, Cadillac, Chair, Barrel)
- Fichas de Treino compostas com ordem, séries e repetições
- Ministrar Aulas com coleta de pressão arterial (início e fim) e intensidade de esforço
- Sistema de Créditos de Reposição com regras de validade, limite e uso cruzado

### 3.4 Relatórios
- Frequência de Alunos
- Pressão Arterial Aferida
- Contas a Pagar
- Contas a Receber
- Livro Caixa

### 3.5 Site Institucional
- Página Home, Quem Somos, Serviços, Artigos
- Formulário de Agendamento e Contato
- Design nas cores do Studio Fluir (`#151329`, degradê `#5D5CE0` → `#01E2CD`)

### 3.6 Infraestrutura
- VPS Ubuntu 24.04 com Docker e Docker Compose
- Nginx com SSL Let's Encrypt (certificado renovado automaticamente)
- Banco de dados PostgreSQL 16+
- Deploy automatizado via script

### 3.7 Controle de Acesso
- 4 perfis de usuário: Administrador, Professor, Financeiro, Recepcionista
- Autenticação por e-mail e senha com token JWT
- Logs de auditoria em todas as operações

---

## 4. FORA DO ESCOPO

Os itens abaixo **não fazem parte** do escopo deste contrato na versão atual:

- Gateway de pagamento / integração com meios de pagamento online
- Integração com Instagram ou YouTube (feed ao vivo)
- Aplicativo mobile nativo (iOS/Android) — o sistema é PWA instalável
- Cálculo de impostos ou emissão de nota fiscal
- Integração com sistemas de contabilidade externos
- Backup automático offsite (responsabilidade do cliente)
- Suporte a múltiplas unidades / filiais
- Qualquer funcionalidade não descrita na Seção 3

---

## 5. PRAZO E CRONOGRAMA

| Fase | Descrição | Status | Prazo |
|---|---|---|---|
| Fase 1 | Backend base (API, auth, models, Docker, deploy) | ✅ Concluído | [PREENCHER] |
| Fase 2 | Frontend React + PWA | ✅ Concluído | [PREENCHER] |
| Fase 3 | Site Institucional | ✅ Concluído | [PREENCHER] |
| Fase 4 | Sistema de Reposições | 🔄 Em andamento | [PREENCHER] |
| Fase 5 | Telas restantes + Relatórios completos | ⏳ Planejado | [PREENCHER] |

**Data de início:** [PREENCHER]
**Prazo total estimado:** [PREENCHER]

---

## 6. VALORES E FORMA DE PAGAMENTO

### 6.1 Valor Total do Contrato
**R$ [PREENCHER]** (reais)

### 6.2 Forma de Pagamento
- [PREENCHER] % na assinatura do contrato: R$ [PREENCHER]
- [PREENCHER] % na entrega da Fase [X]: R$ [PREENCHER]
- [PREENCHER] % na entrega final e aceite: R$ [PREENCHER]

### 6.3 Forma de Recebimento
- PIX: [PREENCHER]
- Conta bancária: [PREENCHER]

### 6.4 Mensalidade de Manutenção (pós-entrega)
**R$ [PREENCHER]/mês** — inclui:
- Hospedagem VPS
- Suporte técnico ([X] horas/mês)
- Correção de bugs
- Renovação de SSL
- Backup semanal

### 6.5 Valores fora da mensalidade
Novas funcionalidades não previstas neste contrato serão orçadas separadamente mediante aditivo contratual.

---

## 7. RESPONSABILIDADES

### 7.1 Da Contratada (Uid Software):
- Desenvolver o sistema conforme especificações acordadas
- Manter o sistema em funcionamento durante o horário comercial
- Corrigir bugs e falhas sem custo adicional dentro do prazo de garantia
- Manter sigilo sobre os dados do Studio Fluir e seus alunos
- Fornecer treinamento básico para uso do sistema
- Fazer backup semanal dos dados (conforme plano de manutenção)

### 7.2 Da Contratante (Studio Fluir):
- Fornecer informações corretas e completas para o desenvolvimento
- Participar das reuniões de validação nos prazos acordados
- Efetuar os pagamentos nos prazos estabelecidos
- Comunicar problemas e bugs com o máximo de detalhes possível
- Não compartilhar credenciais de acesso com terceiros
- Manter backup dos seus dados localmente (responsabilidade compartilhada)

---

## 8. PROPRIEDADE INTELECTUAL

O código-fonte e todos os artefatos produzidos neste projeto são de propriedade da **Uid Software** até o pagamento integral do contrato.

Após o pagamento integral, a licença de uso do sistema é transferida ao Studio Fluir para uso exclusivo em seu negócio.

A Uid Software mantém o direito de referenciar o projeto em seu portfólio, sem divulgar dados sensíveis do cliente.

---

## 9. GARANTIA

- **Período de garantia:** [PREENCHER] meses após a entrega final
- Durante a garantia: correção gratuita de bugs identificados na funcionalidade entregue
- **Não coberto pela garantia:** alterações solicitadas após a entrega, problemas causados por uso incorreto ou alterações feitas por terceiros

---

## 10. SUPORTE E MANUTENÇÃO PÓS-ENTREGA

O suporte e manutenção após o período de garantia serão cobertos pelo plano de manutenção mensal descrito na Seção 6.4.

Em caso de rescisão do plano de manutenção, a Uid Software fornecerá o acesso ao repositório e documentação técnica para que o cliente possa contratar outro fornecedor.

---

## 11. CONFIDENCIALIDADE

Ambas as partes comprometem-se a manter sigilo sobre:
- Dados dos alunos do Studio Fluir (LGPD)
- Informações financeiras do Studio Fluir
- Código-fonte e soluções técnicas desenvolvidas

O tratamento de dados pessoais seguirá as diretrizes da **Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)**.

---

## 12. RESCISÃO

### 12.1 Por parte da Contratante:
Notificação prévia de [PREENCHER] dias. Pagamento proporcional ao trabalho já executado.

### 12.2 Por parte da Contratada:
Notificação prévia de [PREENCHER] dias. Devolução proporcional de valores pagos por serviços não entregues.

### 12.3 Rescisão imediata:
Possível por qualquer das partes em caso de descumprimento grave das obrigações contratuais, após notificação formal sem resposta em [PREENCHER] dias.

---

## 13. FORO

As partes elegem o foro da **Comarca de Uberlândia, Estado de Minas Gerais**, para dirimir quaisquer conflitos decorrentes deste contrato, renunciando a qualquer outro, por mais privilegiado que seja.

---

## 14. DISPOSIÇÕES GERAIS

- Este contrato substitui todos os entendimentos anteriores entre as partes sobre o objeto aqui descrito.
- Qualquer alteração deste contrato deve ser feita por escrito e assinada por ambas as partes (aditivo contratual).
- O presente instrumento é regido pelas leis brasileiras, especialmente o **Código Civil (Lei nº 10.406/2002)**.

---

**Uberlândia, [DIA] de [MÊS] de [ANO].**

---

**CONTRATANTE:**

```
___________________________________
Studio Fluir
Giulia Fagionato
CPF: [PREENCHER]

___________________________________
Studio Fluir
Tássia Magnaboso
CPF: [PREENCHER]
```

**CONTRATADA:**

```
___________________________________
Uid Software e Tecnologia
[Nome do representante legal]
CPF/CNPJ: [PREENCHER]
```

**TESTEMUNHAS:**

```
1. ___________________________________
   Nome: [PREENCHER]
   CPF:  [PREENCHER]

2. ___________________________________
   Nome: [PREENCHER]
   CPF:  [PREENCHER]
```

---

## Anexos

- Anexo A: Levantamento de Requisitos — Nos Studio Fluir (Uid Software, 2026)
- Anexo B: Dicionário de Dados v2.1
- Anexo C: Regras de Negócio v1.0

---

> ⚠️ **LEMBRETE:** Preencher todos os campos marcados com `[PREENCHER]` antes de enviar para assinatura.
> Revisão jurídica recomendada antes da assinatura.

*Rascunho gerado por Uid Software — doc-generator v1.0 — 02/04/2026*
