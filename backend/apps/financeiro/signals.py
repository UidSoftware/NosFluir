from decimal import Decimal

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import ContasPagar, ContasReceber, LivroCaixa


def _calcular_saldo_anterior():
    """Retorna o saldo atual do último lançamento do Livro Caixa."""
    ultimo = LivroCaixa.objects.order_by('-lica_id').first()
    return ultimo.lica_saldo_atual if ultimo else Decimal('0.00')


@receiver(post_save, sender=ContasPagar)
def lancar_contas_pagar(sender, instance, **kwargs):
    """
    Cria lançamento de SAÍDA no Livro Caixa quando uma Conta a Pagar é marcada como 'pago'.
    RN003 — verifica existência antes de criar para evitar duplicatas.
    """
    if instance.pag_status != 'pago':
        return

    if LivroCaixa.objects.filter(
        lica_origem_tipo='contas_pagar',
        lica_origem_id=instance.pag_id,
    ).exists():
        return

    saldo_anterior = _calcular_saldo_anterior()

    LivroCaixa.objects.create(
        lica_tipo_lancamento='saida',
        lica_historico=f'Pagamento: {instance.pag_descricao}',
        lica_valor=instance.pag_valor_total,
        lica_origem_tipo='contas_pagar',
        lica_origem_id=instance.pag_id,
        lica_saldo_anterior=saldo_anterior,
        lica_saldo_atual=saldo_anterior - instance.pag_valor_total,
        lica_forma_pagamento=instance.pag_forma_pagamento,
        created_by=instance.updated_by or instance.created_by,
    )


@receiver(post_save, sender=ContasReceber)
def lancar_contas_receber(sender, instance, **kwargs):
    """
    Cria lançamento de ENTRADA no Livro Caixa quando uma Conta a Receber é marcada como 'recebido'.
    RN004 — verifica existência antes de criar para evitar duplicatas.
    """
    if instance.rec_status != 'recebido':
        return

    if LivroCaixa.objects.filter(
        lica_origem_tipo='contas_receber',
        lica_origem_id=instance.rec_id,
    ).exists():
        return

    saldo_anterior = _calcular_saldo_anterior()

    LivroCaixa.objects.create(
        lica_tipo_lancamento='entrada',
        lica_historico=f'Recebimento: {instance.rec_descricao}',
        lica_valor=instance.rec_valor_total,
        lica_origem_tipo='contas_receber',
        lica_origem_id=instance.rec_id,
        lica_saldo_anterior=saldo_anterior,
        lica_saldo_atual=saldo_anterior + instance.rec_valor_total,
        lica_forma_pagamento=instance.rec_forma_recebimento,
        created_by=instance.updated_by or instance.created_by,
    )
