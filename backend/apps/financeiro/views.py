from decimal import Decimal

import io

from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.core.mixins import AuditMixin, ReadCreateViewSet
from apps.core.permissions import IsFinanceiroOuAdmin
from rest_framework.permissions import IsAdminUser

from rest_framework.decorators import action

from .models import (
    AlunoPlano, Conta, ContasPagar, ContasReceber, FolhaPagamento,
    Fornecedor, LivroCaixa, Pedido, PlanoContas, PlanosPagamentos, Produto, ServicoProduto,
)
from .serializers import (
    AlunoPlanoSerializer, ContaSerializer, ContasPagarSerializer, ContasReceberSerializer,
    FolhaPagamentoSerializer, FornecedorSerializer, LivroCaixaSerializer,
    PedidoSerializer, PlanoContasSerializer, PlanosPagamentosSerializer,
    ProdutoSerializer, ServicoProdutoSerializer,
)


class ContaViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsFinanceiroOuAdmin]
    queryset = Conta.objects.filter(deleted_at__isnull=True).order_by('cont_nome')
    serializer_class = ContaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['cont_tipo', 'cont_ativo']
    search_fields = ['cont_nome']
    ordering_fields = ['cont_nome']


class PlanoContasViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsFinanceiroOuAdmin]
    queryset = PlanoContas.objects.filter(deleted_at__isnull=True).order_by('plc_codigo')
    serializer_class = PlanoContasSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['plc_tipo', 'plc_ativo']
    search_fields = ['plc_codigo', 'plc_nome']
    ordering_fields = ['plc_codigo', 'plc_nome']


class FornecedorViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsFinanceiroOuAdmin]
    queryset = Fornecedor.objects.filter(deleted_at__isnull=True).order_by('forn_nome_empresa')
    serializer_class = FornecedorSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['forn_ativo']
    search_fields = ['forn_nome_empresa', 'forn_cnpj', 'forn_email']
    ordering_fields = ['forn_nome_empresa']


class ServicoProdutoViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsFinanceiroOuAdmin]
    queryset = ServicoProduto.objects.filter(deleted_at__isnull=True).order_by('serv_nome')
    serializer_class = ServicoProdutoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['serv_ativo']
    search_fields = ['serv_nome']
    ordering_fields = ['serv_nome', 'serv_valor_base']


class ContasPagarViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsFinanceiroOuAdmin]
    queryset = (
        ContasPagar.objects
        .filter(deleted_at__isnull=True)
        .select_related('forn', 'serv', 'plano_contas', 'conta')
        .order_by('pag_data_vencimento')
    )
    serializer_class = ContasPagarSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = {
        'pag_status':          ['exact'],
        'forn':                ['exact'],
        'cpa_tipo':            ['exact'],
        'conta':               ['exact'],
        'pag_data_vencimento': ['gte', 'lte'],
    }
    search_fields = ['pag_descricao', 'cpa_nome_credor']
    ordering_fields = ['pag_data_vencimento', 'pag_valor_total']

    def list(self, request, *args, **kwargs):
        ContasPagar.objects.filter(
            pag_status='pendente',
            pag_data_vencimento__lt=timezone.now(),
            deleted_at__isnull=True,
        ).update(pag_status='vencido', updated_at=timezone.now())
        return super().list(request, *args, **kwargs)


class ContasReceberViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsFinanceiroOuAdmin]
    queryset = (
        ContasReceber.objects
        .filter(deleted_at__isnull=True)
        .select_related('alu', 'serv', 'aplano', 'plano_contas', 'conta')
        .order_by('rec_data_vencimento')
    )
    serializer_class = ContasReceberSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = {
        'rec_status':           ['exact'],
        'alu':                  ['exact'],
        'rec_plano_tipo':       ['exact'],
        'rec_tipo':             ['exact'],
        'conta':                ['exact'],
        'rec_data_vencimento':  ['gte', 'lte'],
    }
    search_fields = ['rec_descricao', 'rec_nome_pagador']
    ordering_fields = ['rec_data_vencimento', 'rec_valor_total']

    def list(self, request, *args, **kwargs):
        ContasReceber.objects.filter(
            rec_status='pendente',
            rec_data_vencimento__lt=timezone.now(),
            deleted_at__isnull=True,
        ).update(rec_status='vencido', updated_at=timezone.now())
        return super().list(request, *args, **kwargs)


class PlanosPagamentosViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsFinanceiroOuAdmin]
    queryset = PlanosPagamentos.objects.filter(deleted_at__isnull=True).select_related('serv').order_by('serv__serv_nome', 'plan_tipo_plano')
    serializer_class = PlanosPagamentosSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['plan_tipo_plano']
    search_fields = ['serv__serv_nome']
    ordering_fields = ['plan_valor_plano', 'plan_tipo_plano']


class AlunoPlanoViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsFinanceiroOuAdmin]
    queryset = AlunoPlano.objects.filter(deleted_at__isnull=True).select_related('aluno', 'plano__serv').order_by('-aplano_data_inicio')
    serializer_class = AlunoPlanoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['aluno', 'plano', 'aplano_ativo']
    search_fields = ['aluno__alu_nome', 'plano__serv__serv_nome']
    ordering_fields = ['aplano_data_inicio', 'aplano_ativo']


class LivroCaixaViewSet(AuditMixin, ReadCreateViewSet):
    """
    Livro Caixa — somente leitura e criação manual.
    PUT, PATCH e DELETE retornam 405 por design (ReadCreateViewSet).
    """
    permission_classes = [IsFinanceiroOuAdmin]
    queryset = (
        LivroCaixa.objects.all()
        .select_related('conta', 'conta_destino', 'plano_contas')
        .order_by('-lica_id')
    )
    serializer_class = LivroCaixaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = {
        'lica_tipo_lancamento': ['exact'],
        'lica_origem_tipo':     ['exact'],
        'lcx_tipo_movimento':   ['exact'],
        'conta':                ['exact'],
    }
    search_fields = ['lica_historico']
    ordering_fields = ['lica_id', 'lica_data_lancamento', 'lica_valor']

    def perform_create(self, serializer):
        with transaction.atomic():
            ultimo = LivroCaixa.objects.select_for_update().order_by('-lica_id').first()
            saldo_anterior = ultimo.lica_saldo_atual if ultimo else Decimal('0.00')
            tipo = serializer.validated_data.get('lica_tipo_lancamento')
            valor = serializer.validated_data.get('lica_valor')
            saldo_atual = saldo_anterior + valor if tipo == 'entrada' else saldo_anterior - valor
            serializer.save(
                created_by=self.request.user,
                lica_saldo_anterior=saldo_anterior,
                lica_saldo_atual=saldo_atual,
            )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def gerar_mensalidades(request):
    """Gera ContasReceber de mensalidade para todos os AlunoPlanos ativos no mês seguinte (ou mes/ano informados)."""
    from datetime import date
    from .management.commands.gerar_mensalidades import calcular_proximo_mes, executar, MESES

    mes_param = request.data.get('mes')
    ano_param = request.data.get('ano')
    dry_run   = request.data.get('dry_run', False)

    if mes_param and ano_param:
        mes, ano = int(mes_param), int(ano_param)
    else:
        mes, ano = calcular_proximo_mes()

    criadas, ignoradas, detalhes = executar(mes, ano, dry_run=dry_run)

    return Response({
        'mes_referencia': f"{MESES[mes-1]}/{ano}",
        'criadas':  criadas,
        'ignoradas': ignoradas,
        'dry_run':  dry_run,
        'detalhes': detalhes,
    })


@api_view(['POST'])
@permission_classes([IsFinanceiroOuAdmin])
def transferencia_entre_contas(request):
    """Transferência entre contas — gera 2 lançamentos no LivroCaixa."""
    from rest_framework import serializers as drf_serializers

    conta_origem_id  = request.data.get('conta_origem')
    conta_destino_id = request.data.get('conta_destino')
    valor_raw        = request.data.get('valor')
    data_str         = request.data.get('data')
    descricao        = request.data.get('descricao') or 'Transferência entre contas'

    if not all([conta_origem_id, conta_destino_id, valor_raw, data_str]):
        return Response({'detail': 'Campos obrigatórios: conta_origem, conta_destino, valor, data.'}, status=400)

    if conta_origem_id == conta_destino_id:
        return Response({'detail': 'Conta de origem e destino devem ser diferentes.'}, status=400)

    try:
        valor = Decimal(str(valor_raw))
        if valor <= 0:
            raise ValueError
    except (ValueError, Exception):
        return Response({'detail': 'Valor deve ser um número positivo.'}, status=400)

    with transaction.atomic():
        try:
            plc = PlanoContas.objects.get(plc_codigo='3.1.1')
        except PlanoContas.DoesNotExist:
            plc = None

        # Saída na conta origem
        ultimo = LivroCaixa.objects.select_for_update().order_by('-lica_id').first()
        saldo_ant = ultimo.lica_saldo_atual if ultimo else Decimal('0.00')
        LivroCaixa.objects.create(
            lica_tipo_lancamento='saida',
            lcx_tipo_movimento='transferencia',
            lica_historico=descricao,
            lica_valor=valor,
            lica_origem_tipo='manual',
            lcx_competencia=data_str,
            conta_id=conta_origem_id,
            conta_destino_id=conta_destino_id,
            plano_contas=plc,
            lica_saldo_anterior=saldo_ant,
            lica_saldo_atual=saldo_ant - valor,
            created_by=request.user,
            updated_by=request.user,
        )

        # Entrada na conta destino
        ultimo2 = LivroCaixa.objects.select_for_update().order_by('-lica_id').first()
        saldo_ant2 = ultimo2.lica_saldo_atual
        LivroCaixa.objects.create(
            lica_tipo_lancamento='entrada',
            lcx_tipo_movimento='transferencia',
            lica_historico=descricao,
            lica_valor=valor,
            lica_origem_tipo='manual',
            lcx_competencia=data_str,
            conta_id=conta_destino_id,
            conta_destino_id=conta_origem_id,
            plano_contas=plc,
            lica_saldo_anterior=saldo_ant2,
            lica_saldo_atual=saldo_ant2 + valor,
            created_by=request.user,
            updated_by=request.user,
        )

    return Response({'message': 'Transferência registrada com sucesso.'})


class ProdutoViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsFinanceiroOuAdmin]
    queryset = Produto.objects.filter(deleted_at__isnull=True).order_by('prod_nome')
    serializer_class = ProdutoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['prod_ativo']
    search_fields = ['prod_nome']
    ordering_fields = ['prod_nome', 'prod_estoque_atual']

    @action(detail=False, methods=['get'], url_path='alertas-estoque')
    def alertas_estoque(self, request):
        from django.db.models import F
        qs = self.get_queryset().filter(prod_estoque_atual__lte=F('prod_estoque_minimo'))
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


FORMAS_LABEL = {
    'pix': 'PIX', 'dinheiro': 'Dinheiro',
    'cartao': 'Cartão', 'boleto': 'Boleto',
}


def _gerar_recibo_pdf(pedido):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    cy = colors.HexColor('#00bcd4')

    title_style  = ParagraphStyle('title',  parent=styles['Normal'], fontSize=20, textColor=cy, spaceAfter=4, alignment=TA_CENTER)
    sub_style    = ParagraphStyle('sub',    parent=styles['Normal'], fontSize=10, textColor=colors.grey, spaceAfter=2, alignment=TA_CENTER)
    label_style  = ParagraphStyle('label',  parent=styles['Normal'], fontSize=9,  textColor=colors.grey)
    value_style  = ParagraphStyle('value',  parent=styles['Normal'], fontSize=10, spaceAfter=2)
    right_style  = ParagraphStyle('right',  parent=styles['Normal'], fontSize=10, alignment=TA_RIGHT)
    total_style  = ParagraphStyle('total',  parent=styles['Normal'], fontSize=14, textColor=cy, alignment=TA_RIGHT)

    cliente = pedido.alu.alu_nome if pedido.alu else (pedido.ped_nome_cliente or '—')
    data_fmt = pedido.ped_data.strftime('%d/%m/%Y') if pedido.ped_data else '—'
    forma = FORMAS_LABEL.get(pedido.ped_forma_pagamento or '', pedido.ped_forma_pagamento or '—')

    story = [
        Paragraph('Nos Studio Fluir', title_style),
        Paragraph('Recibo de Pagamento', sub_style),
        Spacer(1, 0.4*cm),
    ]

    # info block
    info_data = [
        [Paragraph('Número', label_style),   Paragraph(pedido.ped_numero or '—', value_style),
         Paragraph('Data', label_style),      Paragraph(data_fmt, value_style)],
        [Paragraph('Cliente', label_style),   Paragraph(cliente, value_style),
         Paragraph('Pagamento', label_style), Paragraph(forma, value_style)],
    ]
    info_table = Table(info_data, colWidths=[3*cm, 7*cm, 3*cm, 4*cm])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story += [info_table, Spacer(1, 0.5*cm)]

    # itens
    header = [['Descrição', 'Qtd', 'Unit. (R$)', 'Total (R$)']]
    rows = []
    for item in pedido.itens.all():
        rows.append([
            item.item_descricao or '—',
            str(item.item_quantidade),
            f'{item.item_valor_unitario:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.'),
            f'{item.item_valor_total:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.'),
        ])

    itens_table = Table(header + rows, colWidths=[9.5*cm, 2*cm, 3.5*cm, 3.5*cm])
    itens_table.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), cy),
        ('TEXTCOLOR',    (0,0), (-1,0), colors.white),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,-1), 9),
        ('ALIGN',        (1,0), (-1,-1), 'RIGHT'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f5f5f5')]),
        ('GRID',         (0,0), (-1,-1), 0.4, colors.HexColor('#dddddd')),
        ('BOTTOMPADDING',(0,0), (-1,-1), 5),
        ('TOPPADDING',   (0,0), (-1,-1), 5),
    ]))
    story += [itens_table, Spacer(1, 0.4*cm)]

    # total
    total_fmt = f'R$ {pedido.ped_total:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    story.append(Paragraph(f'<b>Total: {total_fmt}</b>', total_style))

    if pedido.ped_observacoes:
        story += [Spacer(1, 0.4*cm), Paragraph(f'Obs: {pedido.ped_observacoes}', label_style)]

    story.append(Spacer(1, 1.5*cm))
    story.append(Paragraph('Nos Studio Fluir — nostudiofluir.com.br', sub_style))

    doc.build(story)
    return buf.getvalue()


class PedidoViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsFinanceiroOuAdmin]
    queryset = (
        Pedido.objects
        .filter(deleted_at__isnull=True)
        .select_related('alu', 'conta')
        .prefetch_related('itens__prod', 'itens__serv')
        .order_by('-ped_data', '-ped_numero')
    )
    serializer_class = PedidoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['ped_status', 'alu']
    search_fields = ['ped_numero', 'ped_nome_cliente']
    ordering_fields = ['ped_data', 'ped_total']

    @action(detail=True, methods=['post'])
    def confirmar(self, request, pk=None):
        pedido = self.get_object()
        if pedido.ped_status != 'pendente':
            return Response({'detail': 'Pedido não está pendente.'}, status=400)
        conta_id = request.data.get('conta')
        forma    = request.data.get('forma')
        data_pag = request.data.get('data')
        if conta_id:
            pedido.conta_id = conta_id
        if forma:
            pedido.ped_forma_pagamento = forma
        if data_pag:
            pedido.ped_data = data_pag
        pedido.ped_status = 'pago'
        pedido.updated_by = request.user
        pedido.save()
        return Response(PedidoSerializer(pedido).data)

    @action(detail=True, methods=['get'], url_path='recibo')
    def recibo(self, request, pk=None):
        pedido = self.get_object()
        pdf = _gerar_recibo_pdf(pedido)
        filename = f"recibo-{pedido.ped_numero}.pdf"
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response


class FolhaPagamentoViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = FolhaPagamento.objects.filter(deleted_at__isnull=True).order_by(
        '-fopa_ano_referencia', '-fopa_mes_referencia'
    )
    serializer_class = FolhaPagamentoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['func', 'fopa_status', 'fopa_mes_referencia', 'fopa_ano_referencia']
    ordering_fields = ['fopa_ano_referencia', 'fopa_mes_referencia']
