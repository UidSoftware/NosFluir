import calendar
import datetime
from decimal import Decimal
from io import BytesIO

from django.db.models import Sum, Q
from django.http import HttpResponse
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.core.permissions import IsFinanceiroOuAdmin
from .models import Conta, ContasPagar, ContasReceber, LivroCaixa

_CY = colors.HexColor('#6366f1')
_MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']


def _pdf_styles():
    styles = getSampleStyleSheet()
    marca   = ParagraphStyle('marca',   parent=styles['Normal'], fontSize=16, fontName='Helvetica-Bold', textColor=_CY, spaceAfter=2)
    site    = ParagraphStyle('site',    parent=styles['Normal'], fontSize=8,  textColor=colors.HexColor('#888888'), spaceAfter=8)
    titulo  = ParagraphStyle('titulo',  parent=styles['Normal'], fontSize=13, fontName='Helvetica-Bold', spaceAfter=4)
    periodo = ParagraphStyle('periodo', parent=styles['Normal'], fontSize=9,  textColor=colors.HexColor('#555555'), spaceAfter=12)
    rodape  = ParagraphStyle('rodape',  parent=styles['Normal'], fontSize=7,  textColor=colors.HexColor('#aaaaaa'), alignment=1)
    label   = ParagraphStyle('label',   parent=styles['Normal'], fontSize=8,  fontName='Helvetica-Bold', textColor=colors.HexColor('#555555'), spaceAfter=2, spaceBefore=10)
    return marca, site, titulo, periodo, rodape, label


def _cabecalho(story, titulo_str, periodo_str):
    marca, site, titulo, periodo, *_ = _pdf_styles()
    story += [
        Paragraph('Nos Studio Fluir', marca),
        Paragraph('nostudiofluir.com.br', site),
        Paragraph(titulo_str, titulo),
        Paragraph(periodo_str, periodo),
    ]


def _rodape(story):
    *_, rodape, _ = _pdf_styles()
    agora = datetime.datetime.now().strftime('%d/%m/%Y às %H:%M')
    story += [Spacer(1, 1*cm), Paragraph(f'Gerado em {agora}', rodape)]


def _fmt(valor):
    return f'R$ {float(valor):,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')


def _tabela_estilo(header_color=None):
    cor = header_color or _CY
    return TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0), cor),
        ('TEXTCOLOR',     (0, 0), (-1, 0), colors.white),
        ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, -1), 8),
        ('ALIGN',         (1, 0), (-1, -1), 'RIGHT'),
        ('ROWBACKGROUNDS',(0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ('GRID',          (0, 0), (-1, -1), 0.3, colors.HexColor('#dddddd')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING',    (0, 0), (-1, -1), 4),
    ])


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


def _calcular_dre(ano, mes):
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
    return {
        'periodo': f'{mes:02d}/{ano}',
        'receitas_operacionais':     {'itens': _agrupar_por_nome(grupos['receita_operacional']),     'total': round(tot_rec_op, 2)},
        'receitas_nao_operacionais': {'itens': _agrupar_por_nome(grupos['receita_nao_operacional']), 'total': round(tot_rec_nop, 2)},
        'despesas_operacionais':     {'itens': _agrupar_por_nome(grupos['despesa_operacional']),     'total': round(tot_desp_op, 2)},
        'despesas_nao_operacionais': {'itens': _agrupar_por_nome(grupos['despesa_nao_operacional']), 'total': round(tot_desp_nop, 2)},
        'sem_classificacao':         {'itens': _agrupar_por_nome(grupos['sem_classificacao']),       'total': round(total('sem_classificacao'), 2)},
        'resultado_operacional': round(res_op,  2),
        'resultado_liquido':     round(res_liq, 2),
    }


@api_view(['GET'])
@permission_classes([IsFinanceiroOuAdmin])
def relatorio_dre(request):
    """DRE simples agrupado por plano de contas."""
    mes = int(request.GET.get('mes', timezone.now().month))
    ano = int(request.GET.get('ano', timezone.now().year))
    return Response(_calcular_dre(ano, mes))


@api_view(['GET'])
@permission_classes([IsFinanceiroOuAdmin])
def relatorio_dre_pdf(request):
    mes = int(request.GET.get('mes', timezone.now().month))
    ano = int(request.GET.get('ano', timezone.now().year))
    data = _calcular_dre(ano, mes)

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    story = []
    marca, site, titulo_s, periodo_s, rodape_s, label_s = _pdf_styles()

    _cabecalho(story, 'Demonstração de Resultado do Exercício', f'Período: {_MESES[mes-1]} {ano}')

    def _secao(titulo_sec, grupo, cor_valor, sinal=''):
        itens = grupo.get('itens', [])
        total = grupo.get('total', 0)
        if not itens and total == 0:
            return
        story.append(Paragraph(titulo_sec, label_s))
        rows = [[i['nome'], f'{sinal}{_fmt(i["valor"])}'] for i in itens]
        rows.append(['Total ' + titulo_sec, f'{sinal}{_fmt(total)}'])
        t = Table(rows, colWidths=[13*cm, 4*cm])
        t.setStyle(TableStyle([
            ('FONTSIZE',      (0, 0), (-1, -1), 8),
            ('ALIGN',         (1, 0), (-1, -1), 'RIGHT'),
            ('TEXTCOLOR',     (1, 0), (-1, -2), colors.HexColor('#555555')),
            ('TEXTCOLOR',     (1, -1), (-1, -1), cor_valor),
            ('FONTNAME',      (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('LINEABOVE',     (0, -1), (-1, -1), 0.5, colors.HexColor('#cccccc')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING',    (0, 0), (-1, -1), 3),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.2*cm))

    _secao('Receitas Operacionais',     data['receitas_operacionais'],     colors.HexColor('#16a34a'))
    _secao('Receitas Não Operacionais', data['receitas_nao_operacionais'], colors.HexColor('#16a34a'))
    _secao('Despesas Operacionais',     data['despesas_operacionais'],     colors.HexColor('#dc2626'), sinal='(')
    _secao('Despesas Não Operacionais', data['despesas_nao_operacionais'], colors.HexColor('#dc2626'), sinal='(')
    if data['sem_classificacao']['total'] > 0:
        _secao('Sem Classificação', data['sem_classificacao'], colors.HexColor('#555555'))

    res_op  = data['resultado_operacional']
    res_liq = data['resultado_liquido']
    cor_op  = colors.HexColor('#16a34a') if res_op  >= 0 else colors.HexColor('#dc2626')
    cor_liq = colors.HexColor('#16a34a') if res_liq >= 0 else colors.HexColor('#dc2626')
    res_rows = [
        ['Resultado Operacional', _fmt(abs(res_op))  if res_op  >= 0 else f'({_fmt(abs(res_op))})'],
        ['Resultado Líquido',     _fmt(abs(res_liq)) if res_liq >= 0 else f'({_fmt(abs(res_liq))})'],
    ]
    res_table = Table(res_rows, colWidths=[13*cm, 4*cm])
    res_table.setStyle(TableStyle([
        ('FONTNAME',      (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, -1), 9),
        ('ALIGN',         (1, 0), (-1, -1), 'RIGHT'),
        ('TEXTCOLOR',     (1, 0), (1, 0), cor_op),
        ('TEXTCOLOR',     (1, 1), (1, 1), cor_liq),
        ('LINEABOVE',     (0, 0), (-1, 0), 1, colors.HexColor('#888888')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
    ]))
    story.append(Spacer(1, 0.3*cm))
    story.append(res_table)

    _rodape(story)
    doc.build(story)
    nome_mes = _MESES[mes-1].lower()
    resp = HttpResponse(buf.getvalue(), content_type='application/pdf')
    resp['Content-Disposition'] = f'inline; filename="dre-{nome_mes}-{ano}.pdf"'
    return resp


def _calcular_fluxo_caixa(n_meses):
    hoje = timezone.now().date()
    resultado = []
    for i in range(n_meses):
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
            'mes_nome': _MESES[mes - 1],
            'entradas': float(entradas),
            'saidas':   float(saidas),
            'saldo':    float(entradas - saidas),
        })
    return resultado


@api_view(['GET'])
@permission_classes([IsFinanceiroOuAdmin])
def relatorio_fluxo_caixa(request):
    """Fluxo de caixa projetado com base em contas pendentes."""
    meses = min(int(request.GET.get('meses', 6)), 12)
    return Response(_calcular_fluxo_caixa(meses))


@api_view(['GET'])
@permission_classes([IsFinanceiroOuAdmin])
def relatorio_fluxo_caixa_pdf(request):
    meses = min(int(request.GET.get('meses', 6)), 12)
    dados = _calcular_fluxo_caixa(meses)

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    story = []

    _cabecalho(story, 'Fluxo de Caixa Projetado', f'Próximos {meses} {"mês" if meses == 1 else "meses"}')

    header = [['Mês', 'Entradas Previstas', 'Saídas Previstas', 'Saldo Projetado']]
    rows = []
    tot_e = tot_s = 0.0
    for r in dados:
        cor_s = '+' if r['saldo'] >= 0 else ''
        rows.append([
            f'{r["mes_nome"]} {r["ano"]}',
            _fmt(r['entradas']),
            _fmt(r['saidas']),
            _fmt(abs(r['saldo'])) if r['saldo'] >= 0 else f'({_fmt(abs(r["saldo"]))})',
        ])
        tot_e += r['entradas']
        tot_s += r['saidas']

    tot_sal = tot_e - tot_s
    rows.append([
        'Total',
        _fmt(tot_e),
        _fmt(tot_s),
        _fmt(abs(tot_sal)) if tot_sal >= 0 else f'({_fmt(abs(tot_sal))})',
    ])

    t = Table(header + rows, colWidths=[5*cm, 4.5*cm, 4.5*cm, 4.5*cm])
    estilo = _tabela_estilo()
    # linha de total em negrito
    idx_total = len(rows)
    estilo.add('FONTNAME',   (0, idx_total), (-1, idx_total), 'Helvetica-Bold')
    estilo.add('LINEABOVE',  (0, idx_total), (-1, idx_total), 0.8, colors.HexColor('#888888'))
    estilo.add('BACKGROUND', (0, idx_total), (-1, idx_total), colors.HexColor('#f0f0f0'))
    # cores de saldo por linha
    for i, r in enumerate(dados):
        cor = colors.HexColor('#16a34a') if r['saldo'] >= 0 else colors.HexColor('#dc2626')
        estilo.add('TEXTCOLOR', (3, i + 1), (3, i + 1), cor)
    cor_tot = colors.HexColor('#16a34a') if tot_sal >= 0 else colors.HexColor('#dc2626')
    estilo.add('TEXTCOLOR', (3, idx_total), (3, idx_total), cor_tot)
    t.setStyle(estilo)
    story.append(t)

    _rodape(story)
    doc.build(story)
    resp = HttpResponse(buf.getvalue(), content_type='application/pdf')
    resp['Content-Disposition'] = f'inline; filename="fluxo-caixa-{meses}meses.pdf"'
    return resp


@api_view(['GET'])
@permission_classes([IsFinanceiroOuAdmin])
def relatorio_extrato(request):
    """Extrato de movimentações de uma conta. Se mes/ano omitidos, retorna todos os lançamentos."""
    conta_id = request.GET.get('conta')
    mes_raw  = request.GET.get('mes')
    ano_raw  = request.GET.get('ano')

    if not conta_id:
        return Response({'detail': 'Informe a conta.'}, status=400)

    try:
        conta = Conta.objects.get(pk=conta_id)
    except Conta.DoesNotExist:
        return Response({'detail': 'Conta não encontrada.'}, status=404)

    qs = LivroCaixa.objects.filter(conta_id=conta_id, deleted_at__isnull=True).select_related('plano_contas')

    if mes_raw and ano_raw:
        mes, ano = int(mes_raw), int(ano_raw)
        inicio, fim = _mes_range(ano, mes)
        qs = qs.filter(
            Q(lcx_competencia__range=[inicio, fim]) |
            Q(lcx_competencia__isnull=True, lica_data_lancamento__date__range=[inicio, fim])
        )
        periodo = f'{mes:02d}/{ano}'
    else:
        mes, ano = None, None
        periodo  = 'todos'

    lancamentos = qs.order_by('lica_data_lancamento', 'lica_id')

    saldo  = Decimal(str(conta.cont_saldo_inicial))
    itens  = []
    for lanc in lancamentos:
        delta = lanc.lica_valor if lanc.lica_tipo_lancamento == 'entrada' else -lanc.lica_valor
        saldo += delta
        data   = str(lanc.lcx_competencia or lanc.lica_data_lancamento.date())
        itens.append({
            'id':           lanc.lica_id,
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
        'periodo':       periodo,
        'saldo_inicial': float(conta.cont_saldo_inicial),
        'saldo_final':   float(saldo),
        'lancamentos':   itens,
    })
