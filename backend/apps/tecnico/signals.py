"""
Signals do módulo técnico — Fase 4: Sistema de Reposições.

Regras implementadas:
- 'justificada' (aviso 1h–48h antes)  → gera crédito ✅
- 'atestado' (médico, qualquer prazo) → gera crédito ✅
- 'cenario3' (aviso +48h antes)       → PENDENTE decisão com clientes ⚠️ (não gera)
- 'sem_aviso'                         → não gera crédito ❌

Restrições:
- Máximo 3 créditos simultâneos por aluno (status='disponivel')
- Sem duplicata: cada aula_origem gera no máximo 1 crédito
"""

from django.db.models.signals import post_save
from django.dispatch import receiver


# Import lazy para evitar circular import
def _get_models():
    from apps.tecnico.models import MinistrarAula, CreditoReposicao
    return MinistrarAula, CreditoReposicao


TIPOS_FALTA_QUE_GERAM_CREDITO = {'justificada', 'atestado'}
LIMITE_CREDITOS_SIMULTANEOS = 3


@receiver(post_save, sender='tecnico.MinistrarAula')
def marcar_credito_usado(sender, instance, **kwargs):
    """
    Quando uma aula de reposição é registrada com um crédito vinculado,
    marca o crédito como usado.
    """
    _, CreditoReposicao = _get_models()

    if instance.miau_tipo_presenca != 'reposicao':
        return
    if not instance.cred_id:
        return

    credito = instance.cred
    if credito.cred_status != 'usado':
        credito.cred_status = 'usado'
        credito.cred_usado = True
        credito.aula_reposicao = instance
        credito.save()


@receiver(post_save, sender='tecnico.MinistrarAula')
def gerar_credito_reposicao(sender, instance, **kwargs):
    """
    Cria um CreditoReposicao quando uma falta justificada ou atestado é registrada.
    Fase 8: verifica se já existe AvisoFalta para não duplicar o crédito.
    """
    _, CreditoReposicao = _get_models()

    if instance.miau_tipo_presenca != 'falta':
        return
    if instance.miau_tipo_falta not in TIPOS_FALTA_QUE_GERAM_CREDITO:
        return

    # Evita duplicata: já existe crédito para esta aula de origem?
    if CreditoReposicao.objects.filter(aula_origem=instance).exists():
        return

    # Fase 8: se já existe AvisoFalta para aluno/turma/data com crédito gerado,
    # não duplicar — o crédito foi criado pelo signal do AvisoFalta
    if instance.aula_id:
        from apps.operacional.models import AvisoFalta
        aviso_existe = AvisoFalta.objects.filter(
            aluno=instance.alu,
            turma=instance.aula.tur,
            avi_data_aula=instance.aula.aul_data,
            avi_gera_credito=True,
        ).exists()
        if aviso_existe:
            return

    creditos_ativos = CreditoReposicao.objects.filter(
        alu=instance.alu,
        cred_status='disponivel',
        deleted_at__isnull=True,
    ).count()

    if creditos_ativos >= LIMITE_CREDITOS_SIMULTANEOS:
        return

    CreditoReposicao.objects.create(
        alu=instance.alu,
        aula_origem=instance,
    )
