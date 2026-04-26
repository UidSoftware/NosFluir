from decimal import Decimal

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ContasPagar, ContasReceber, LivroCaixa, Pedido


@receiver(post_save, sender=ContasPagar)
def lancar_contas_pagar(sender, instance, **kwargs):
    """
    Cria lançamento de SAÍDA no Livro Caixa quando uma Conta a Pagar é marcada como 'pago'.
    RN003 — verifica existência antes de criar para evitar duplicatas.
    Usa select_for_update() para evitar race condition no cálculo de saldo.
    """
    if instance.pag_status != 'pago':
        return

    # Pró-labore não gera lançamento automático — registrado manualmente
    if instance.cpa_tipo == 'prolabore':
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
            lcx_tipo_movimento='saida',
            lica_historico=f'Pagamento: {instance.pag_descricao}',
            lica_valor=instance.pag_valor_total,
            lica_origem_tipo='contas_pagar',
            lica_origem_id=instance.pag_id,
            lica_saldo_anterior=saldo_anterior,
            lica_saldo_atual=saldo_anterior - instance.pag_valor_total,
            lica_forma_pagamento=instance.pag_forma_pagamento,
            conta=instance.conta,
            plano_contas=instance.plano_contas,
            lcx_competencia=instance.pag_data_vencimento.date() if instance.pag_data_vencimento else None,
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
            lcx_tipo_movimento='entrada',
            lica_historico=f'Recebimento: {instance.rec_descricao}',
            lica_valor=instance.rec_valor_total,
            lica_origem_tipo='contas_receber',
            lica_origem_id=instance.rec_id,
            lica_saldo_anterior=saldo_anterior,
            lica_saldo_atual=saldo_anterior + instance.rec_valor_total,
            lica_forma_pagamento=instance.rec_forma_recebimento,
            conta=instance.conta,
            plano_contas=instance.plano_contas,
            lcx_competencia=instance.rec_data_vencimento.date() if instance.rec_data_vencimento else None,
            created_by=instance.updated_by or instance.created_by,
        )


@receiver(post_save, sender=Pedido)
def processar_pedido(sender, instance, **kwargs):
    """
    Ao confirmar pagamento (status='pago'):
    - Produtos: reduz estoque
    - Pagamento à vista: cria lançamento no LivroCaixa
    - Pagamento futuro: cria ContasReceber
    """
    if instance.ped_status != 'pago':
        return

    with transaction.atomic():
        if LivroCaixa.objects.filter(lica_origem_tipo='pedido', lica_origem_id=instance.ped_id).exists():
            return

        # Reduz estoque dos produtos
        for item in instance.itens.select_related('prod').all():
            if item.item_tipo == 'produto' and item.prod:
                from django.db.models import F
                item.prod.__class__.objects.filter(pk=item.prod.pk).update(
                    prod_estoque_atual=F('prod_estoque_atual') - item.item_quantidade
                )

        if not instance.ped_pagamento_futuro:
            ultimo = LivroCaixa.objects.select_for_update().order_by('-lica_id').first()
            saldo_ant = ultimo.lica_saldo_atual if ultimo else Decimal('0.00')
            LivroCaixa.objects.create(
                lica_tipo_lancamento='entrada',
                lcx_tipo_movimento='entrada',
                lica_historico=f'Pedido {instance.ped_numero}',
                lica_valor=instance.ped_total,
                lica_origem_tipo='pedido',
                lica_origem_id=instance.ped_id,
                lica_saldo_anterior=saldo_ant,
                lica_saldo_atual=saldo_ant + instance.ped_total,
                conta=instance.conta,
                lica_forma_pagamento=instance.ped_forma_pagamento,
                lcx_competencia=instance.ped_data,
                created_by=instance.updated_by or instance.created_by,
            )
        else:
            ContasReceber.objects.create(
                alu=instance.alu,
                rec_nome_pagador=instance.ped_nome_cliente,
                rec_tipo='produto',
                rec_descricao=f'Pedido {instance.ped_numero}',
                rec_valor_unitario=instance.ped_total,
                rec_quantidade=1,
                rec_desconto=Decimal('0.00'),
                rec_valor_total=instance.ped_total,
                rec_data_emissao=instance.ped_data,
                rec_data_vencimento=instance.ped_data,
                rec_status='pendente',
                conta=instance.conta,
                created_by=instance.updated_by or instance.created_by,
                updated_by=instance.updated_by or instance.created_by,
            )
