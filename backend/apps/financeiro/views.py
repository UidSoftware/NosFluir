from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.core.mixins import AuditMixin, ReadCreateViewSet

from .models import (
    ContasPagar, ContasReceber, FolhaPagamento,
    Fornecedor, LivroCaixa, PlanosPagamentos, ServicoProduto,
)
from .serializers import (
    ContasPagarSerializer, ContasReceberSerializer, FolhaPagamentoSerializer,
    FornecedorSerializer, LivroCaixaSerializer, PlanosPagamentosSerializer,
    ServicoProdutoSerializer,
)


class FornecedorViewSet(AuditMixin, ModelViewSet):
    queryset = Fornecedor.objects.filter(deleted_at__isnull=True).order_by('forn_nome_empresa')
    serializer_class = FornecedorSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['forn_ativo']
    search_fields = ['forn_nome_empresa', 'forn_cnpj', 'forn_email']
    ordering_fields = ['forn_nome_empresa']


class ServicoProdutoViewSet(AuditMixin, ModelViewSet):
    queryset = ServicoProduto.objects.filter(deleted_at__isnull=True).order_by('serv_nome')
    serializer_class = ServicoProdutoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['serv_tipo', 'serv_ativo']
    search_fields = ['serv_nome']
    ordering_fields = ['serv_nome', 'serv_valor_base']


class ContasPagarViewSet(AuditMixin, ModelViewSet):
    queryset = ContasPagar.objects.filter(deleted_at__isnull=True).order_by('pag_data_vencimento')
    serializer_class = ContasPagarSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['pag_status', 'forn']
    search_fields = ['pag_descricao']
    ordering_fields = ['pag_data_vencimento', 'pag_valor_total']

    def list(self, request, *args, **kwargs):
        # RN010: atualiza status para 'vencido' antes de listar
        ContasPagar.objects.filter(
            pag_status='pendente',
            pag_data_vencimento__lt=timezone.now(),
            deleted_at__isnull=True,
        ).update(pag_status='vencido', updated_at=timezone.now())
        return super().list(request, *args, **kwargs)


class ContasReceberViewSet(AuditMixin, ModelViewSet):
    queryset = ContasReceber.objects.filter(deleted_at__isnull=True).order_by('rec_data_vencimento')
    serializer_class = ContasReceberSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['rec_status', 'alu', 'rec_plano_tipo']
    search_fields = ['rec_descricao']
    ordering_fields = ['rec_data_vencimento', 'rec_valor_total']

    def list(self, request, *args, **kwargs):
        # RN010: atualiza status para 'vencido' antes de listar
        ContasReceber.objects.filter(
            rec_status='pendente',
            rec_data_vencimento__lt=timezone.now(),
            deleted_at__isnull=True,
        ).update(rec_status='vencido', updated_at=timezone.now())
        return super().list(request, *args, **kwargs)


class PlanosPagamentosViewSet(AuditMixin, ModelViewSet):
    queryset = PlanosPagamentos.objects.filter(deleted_at__isnull=True).order_by('-plan_data_inicio')
    serializer_class = PlanosPagamentosSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['alu', 'plan_tipo_plano', 'plan_ativo']
    ordering_fields = ['plan_data_inicio', 'plan_valor_plano']


class LivroCaixaViewSet(AuditMixin, ReadCreateViewSet):
    """
    Livro Caixa — somente leitura e criação manual.
    PUT, PATCH e DELETE retornam 405 por design (ReadCreateViewSet).
    """
    queryset = LivroCaixa.objects.all().order_by('-lica_id')
    serializer_class = LivroCaixaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['lica_tipo_lancamento', 'lica_origem_tipo']
    search_fields = ['lica_historico']
    ordering_fields = ['lica_id', 'lica_data_lancamento', 'lica_valor']

    def perform_create(self, serializer):
        with transaction.atomic():
            # Lock do último registro para serializar criações manuais concorrentes
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


class FolhaPagamentoViewSet(AuditMixin, ModelViewSet):
    queryset = FolhaPagamento.objects.filter(deleted_at__isnull=True).order_by(
        '-fopa_ano_referencia', '-fopa_mes_referencia'
    )
    serializer_class = FolhaPagamentoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['func', 'fopa_status', 'fopa_mes_referencia', 'fopa_ano_referencia']
    ordering_fields = ['fopa_ano_referencia', 'fopa_mes_referencia']
