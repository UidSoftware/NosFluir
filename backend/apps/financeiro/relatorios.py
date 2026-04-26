import datetime
from decimal import Decimal

from django.db.models import Sum, Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.permissions import IsFinanceiroOuAdmin
from .models import Conta, ContasPagar, ContasReceber, LivroCaixa


def _mes_range(ano, mes):
    inicio = datetime.date(ano, mes, 1)
    if mes == 12:
        fim = datetime.date(ano + 1, 1, 1) - datetime.timedelta(days=1)
    else:
        fim = datetime.date(ano, mes + 1, 1) - datetime.timedelta(days=1)
    return inicio, fim


def _lancamentos_periodo(ano, mes):
    inicio, fim = _mes_range(ano, mes)
    return LivroCaixa.objects.filter(
        Q(lcx_competencia__range=[inicio, fim]) |
        Q(lcx_competencia__isnull=True, lica_data_lancamento__date__range=[inicio, fim])
    ).select_related('plano_contas')


def _agrupar_por_nome(itens):
    agg = {}
    for it in itens:
        agg.setdefault(it['nome'], Decimal('0.00'))
        agg[it['nome']] += Decimal(str(it['valor']))
    return sorted([{'nome': k, 'valor': float(v)} for k, v in agg.items()], key=lambda x: x['nome'])


@api_view(['GET'])
@permission_classes([IsFinanceiroOuAdmin])
def relatorio_dre(request):
    """DRE simples agrupado por plano de contas."""
    mes = int(request.GET.get('mes', timezone.now().month))
    ano = int(request.GET.get('ano', timezone.now().year))

    grupos = {t: [] for t in [
        'receita_operacional', 'receita_nao_operacional',
        'despesa_operacional', 'despesa_nao_operacional', 'sem_classificacao',
    ]}

    for lanc in _lancamentos_periodo(ano, mes):
        if lanc.lcx_tipo_movimento == 'transferencia':
            continue
        plc_tipo = lanc.plano_contas.plc_tipo if lanc.plano_contas else None
        nome     = lanc.plano_contas.plc_nome if lanc.plano_contas else (lanc.lica_categoria or lanc.lica_historico[:40])
        key      = plc_tipo if plc_tipo in grupos else 'sem_classificacao'
        grupos[key].append({'nome': nome, 'valor': float(lanc.lica_valor)})

    def total(key): return sum(i['valor'] for i in grupos[key])

    tot_rec_op   = total('receita_operacional')
    tot_rec_nop  = total('receita_nao_operacional')
    tot_desp_op  = total('despesa_operacional')
    tot_desp_nop = total('despesa_nao_operacional')
    res_op  = tot_rec_op  - tot_desp_op
    res_liq = res_op + tot_rec_nop - tot_desp_nop

    return Response({
        'periodo': f'{mes:02d}/{ano}',
        'receitas_operacionais':     {'itens': _agrupar_por_nome(grupos['receita_operacional']),     'total': round(tot_rec_op, 2)},
        'receitas_nao_operacionais': {'itens': _agrupar_por_nome(grupos['receita_nao_operacional']), 'total': round(tot_rec_nop, 2)},
        'despesas_operacionais':     {'itens': _agrupar_por_nome(grupos['despesa_operacional']),     'total': round(tot_desp_op, 2)},
        'despesas_nao_operacionais': {'itens': _agrupar_por_nome(grupos['despesa_nao_operacional']), 'total': round(tot_desp_nop, 2)},
        'sem_classificacao':         {'itens': _agrupar_por_nome(grupos['sem_classificacao']),       'total': round(total('sem_classificacao'), 2)},
        'resultado_operacional': round(res_op,  2),
        'resultado_liquido':     round(res_liq, 2),
    })


@api_view(['GET'])
@permission_classes([IsFinanceiroOuAdmin])
def relatorio_fluxo_caixa(request):
    """Fluxo de caixa projetado com base em contas pendentes."""
    meses = min(int(request.GET.get('meses', 6)), 12)
    hoje  = timezone.now().date()

    resultado = []
    for i in range(meses):
        total_meses = (hoje.month - 1 + i)
        mes = total_meses % 12 + 1
        ano = hoje.year + total_meses // 12
        inicio, fim = _mes_range(ano, mes)

        entradas = ContasReceber.objects.filter(
            rec_status__in=['pendente', 'vencido'],
            rec_data_vencimento__date__range=[inicio, fim],
            deleted_at__isnull=True,
        ).aggregate(t=Sum('rec_valor_total'))['t'] or Decimal('0.00')

        saidas = ContasPagar.objects.filter(
            pag_status__in=['pendente', 'vencido'],
            pag_data_vencimento__date__range=[inicio, fim],
            deleted_at__isnull=True,
        ).exclude(cpa_tipo='prolabore').aggregate(t=Sum('pag_valor_total'))['t'] or Decimal('0.00')

        resultado.append({
            'mes': mes, 'ano': ano,
            'mes_ano':  f'{mes:02d}/{ano}',
            'entradas': float(entradas),
            'saidas':   float(saidas),
            'saldo':    float(entradas - saidas),
        })

    return Response(resultado)


@api_view(['GET'])
@permission_classes([IsFinanceiroOuAdmin])
def relatorio_extrato(request):
    """Extrato de movimentações de uma conta em um período."""
    conta_id = request.GET.get('conta')
    mes      = int(request.GET.get('mes', timezone.now().month))
    ano      = int(request.GET.get('ano', timezone.now().year))

    if not conta_id:
        return Response({'detail': 'Informe a conta.'}, status=400)

    try:
        conta = Conta.objects.get(pk=conta_id)
    except Conta.DoesNotExist:
        return Response({'detail': 'Conta não encontrada.'}, status=404)

    inicio, fim = _mes_range(ano, mes)

    lancamentos = LivroCaixa.objects.filter(conta_id=conta_id).filter(
        Q(lcx_competencia__range=[inicio, fim]) |
        Q(lcx_competencia__isnull=True, lica_data_lancamento__date__range=[inicio, fim])
    ).select_related('plano_contas').order_by('lica_id')

    saldo  = Decimal(str(conta.cont_saldo_inicial))
    itens  = []
    for lanc in lancamentos:
        delta = lanc.lica_valor if lanc.lica_tipo_lancamento == 'entrada' else -lanc.lica_valor
        saldo += delta
        data   = str(lanc.lcx_competencia or lanc.lica_data_lancamento.date())
        itens.append({
            'data':         data,
            'historico':    lanc.lica_historico,
            'tipo':         lanc.lica_tipo_lancamento,
            'valor':        float(lanc.lica_valor),
            'saldo':        float(saldo),
            'plano_contas': lanc.plano_contas.plc_nome if lanc.plano_contas else None,
        })

    return Response({
        'conta_id':      conta.cont_id,
        'conta_nome':    conta.cont_nome,
        'periodo':       f'{mes:02d}/{ano}',
        'saldo_inicial': float(conta.cont_saldo_inicial),
        'saldo_final':   float(saldo),
        'lancamentos':   itens,
    })
