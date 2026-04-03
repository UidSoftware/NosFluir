"""
Signals do módulo técnico.

Fase 4 — Sistema de Reposições (EM ANDAMENTO).
Os signals de geração automática de CreditoReposicao serão implementados aqui.

Pendências (aguardando reunião com clientes):
- Aviso com mais de 48h antes (cenario3) → gera crédito ou não?
- Mistura de níveis na aula de reposição → fluxo de aprovação
"""

# TODO Fase 4: implementar signal post_save em Aula
# Gatilho: aul_tipo_presenca = 'falta' e aul_tipo_falta IN ('justificada', 'atestado')
# Ação: criar CreditoReposicao (validar máximo 3 simultâneos, evitar duplicata)
