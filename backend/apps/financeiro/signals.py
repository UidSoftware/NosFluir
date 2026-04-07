from decimal import Decimal

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ContasPagar, ContasReceber, LivroCaixa


@receiver(post_save, sender=ContasPagar)
def lancar_contas_pagar(sender, instance, **kwargs):
    """
    Cria lançamento de SAÍDA no Livro Caixa quando uma Conta a Pagar é marcada como 'pago'.
    RN003 — verifica existência antes de criar para evitar duplicatas.
    Usa select_for_update() para evitar race condition no cálculo de saldo.
    """
    if instance.pag_status != 'pago':
        return

    with transaction.atomic():
        # Lock do último registro para serializar acessos concorrentes
        ultimo = LivroCaixa.objects.select_for_update().order_by('-lica_id').first()

        if LivroCaixa.objects.filter(
            lica_origem_tipo='contas_pagar',
            lica_origem_id=instance.pag_id,
        ).exists():
            return

        saldo_anterior = ultimo.lica_saldo_atual if ultimo else Decimal('0.00')

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
    Usa select_for_update() para evitar race condition no cálculo de saldo.
    """
    if instance.rec_status != 'recebido':
        return

    with transaction.atomic():
        # Lock do último registro para serializar acessos concorrentes
        ultimo = LivroCaixa.objects.select_for_update().order_by('-lica_id').first()

        if LivroCaixa.objects.filter(
            lica_origem_tipo='contas_receber',
            lica_origem_id=instance.rec_id,
        ).exists():
            return

        saldo_anterior = ultimo.lica_saldo_atual if ultimo else Decimal('0.00')

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
