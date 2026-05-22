# Hotfix — Fase 16 — NosFluir (Studio Fluir)

> Rodar pelo Uid Office via Hotfix agent.
> CLAUDE.md em /var/www/studio-fluir/CLAUDE.md

---

## Script para o Hotfix agent

```
Hotfix, sistema NosFluir (Studio Fluir — Uberlândia MG).
CLAUDE.md em /var/www/studio-fluir/CLAUDE.md. Inicie.

Tarefas:

[BACKEND] 1. AlunoPlano → gerar ContasReceber automático por tipo de plano
   - Ao criar AlunoPlano, gerar recorrências baseadas em plan_tipo_plano:
     mensal=1 cobrança, trimestral=3, semestral=6
   - Usar aplano_dia_vencimento para calcular as datas de vencimento
   - Idempotente: não duplicar se já existir ContasReceber para o mesmo
     aplano + mês/ano
   - Similar ao management command gerar_mensalidades mas disparado no
     perform_create do AlunoPlanoViewSet

[BACKEND+FRONTEND] 2. Confirmar pagamento de pedido não atualiza ContasReceber
   - Ao confirmar pedido como pago (ped_status='pago'), o signal
     processar_pedido cria ContasReceber com status='pendente'
   - Bug: ContasReceber deveria já nascer como 'recebido' se o pedido
     for pago à vista (ped_forma_pagamento != 'futuro')
   - Frontend: invalidar queryKey 'contas-receber' ao confirmar pedido
     na PedidosPage

[FRONTEND] 3. ContasReceberPage — botão recorrência ausente no modo editar
   - O formulário de edição não exibe o toggle/botão de recorrência
     que existe no formulário de criação (Nova Conta)
   - Exibir o mesmo bloco de recorrência no edit, desabilitado se já
     existirem recorrências criadas

[FRONTEND] 4. ContasReceberPage — auto-preencher ao selecionar aluno
   - Ao selecionar aluno no formulário, buscar AlunoPlano ativo do aluno
     via /api/aluno-plano/?alu=X e pré-preencher:
     rec_tipo='mensalidade', plano_contas (ID 1 receita mensalidade),
     rec_valor_unitario com o valor do plano

[FRONTEND] 5. Topbar — botão toggle dia/noite
   - Adicionar botão Sun/Moon na Topbar (ao lado do botão de sair)
   - Cores light mode baseadas na identidade Fluir:
     background #F5F0FF (lilás claro), primary #5D5CE0 (roxo),
     accent #01E2CD (cyan), texto #1a1033
   - Persistir preferência em localStorage

[BACKEND+FRONTEND] 6. Agendamentos — inverter lógica dos slots
   - Lógica atual: admin cria slots manualmente, padrão é vazio
   - Nova lógica: todos os horários Seg-Sex 07:00-18:00 (horas cheias)
     são ativos por padrão com 2 vagas; admin BLOQUEIA ou ajusta vagas
   - Backend: endpoint POST /api/slots-experimentais/gerar-grade/
     que cria todos os slots Seg-Sex 07:00-18:00 idempotente
   - Frontend AgendamentosPage: grade mostra todos os horários,
     slot ativo = verde/clicável, slot bloqueado = cinza;
     clique toggle bloqueia/desbloqueia; input de vagas inline

[BACKEND+FRONTEND] 7. FichaTreinoExercicios — campo apelido do exercício
   - Migration: ftex_apelido CharField(100, null=True, blank=True)
   - FichasTreinoPage modal "Adicionar Exercício": input
     "Apelido (como chamam na aula)" abaixo do select Exercício
   - MinistrarAulaPage: exibe ftex_apelido se preenchido,
     senão exe_nome
   - Motivação: mesmo exercício tem nomes diferentes entre professoras;
     apelido é por ficha (não global no cadastro do exercício)
```

---

## Distribuição por agent

| Agent | Itens |
|---|---|
| **Forge** (backend) | 1, 2, 6, 7 |
| **Loom** (frontend) | 2, 3, 4, 5, 6, 7 |
| **Sentinel** | valida tudo |
| **Pilot** | deploy |

## Notas técnicas

- Item 1: similar ao `gerar_mensalidades` management command — reaproveitar lógica de `_add_months()`
- Item 2: signal `processar_pedido` em `financeiro/signals.py:105` — checar `ped_forma_pagamento`
- Item 6: SlotExperimental model em `operacional/models.py:212` — `slot_ativo`, `vagas_totais`
- Item 7: `FichaTreinoExercicios` model em `tecnico/models.py` — adicionar após `ftex_obs`; MinistrarAulaPage linha ~85 exibe `exe_nome`
