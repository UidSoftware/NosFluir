"""
Signals do módulo operacional — Fase 8: Sistema de Avisos de Falta.

Regras:
- AvisoFalta com avi_gera_credito=True → cria CreditoReposicao automaticamente
- Limite de 3 créditos simultâneos por aluno
- 1 aviso = no máximo 1 crédito (OneToOne)
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction

LIMITE_CREDITOS_SIMULTANEOS = 3


@receiver(post_save, sender='operacional.AvisoFalta')
def gerar_credito_por_aviso(sender, instance, created, **kwargs):
    if not created:
        return
    if not instance.avi_gera_credito:
        return

    from apps.tecnico.models import CreditoReposicao

    with transaction.atomic():
        if CreditoReposicao.objects.filter(aviso_falta=instance).exists():
            return

        creditos_ativos = CreditoReposicao.objects.filter(
            alu=instance.aluno,
            cred_status='disponivel',
            deleted_at__isnull=True,
        ).count()
        if creditos_ativos >= LIMITE_CREDITOS_SIMULTANEOS:
            return

        CreditoReposicao.objects.create(
            alu=instance.aluno,
            aviso_falta=instance,
            created_by=instance.created_by,
            updated_by=instance.updated_by,
        )
