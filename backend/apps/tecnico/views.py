from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.core.mixins import AuditMixin

from .models import Aparelho, Aula, CreditoReposicao, Exercicio, FichaTreino, FichaTreinoExercicios
from .serializers import (
    AparelhoSerializer, AulaSerializer, CreditoReposicaoSerializer, ExercicioSerializer,
    FichaTreinoSerializer, FichaTreinoExerciciosSerializer,
)


class AparelhoViewSet(AuditMixin, ModelViewSet):
    queryset = Aparelho.objects.filter(deleted_at__isnull=True).order_by('apar_modalidade', 'apar_nome')
    serializer_class = AparelhoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['apar_modalidade', 'apar_ativo']
    search_fields = ['apar_nome']
    ordering_fields = ['apar_nome', 'apar_modalidade']


class ExercicioViewSet(AuditMixin, ModelViewSet):
    # select_related: evita N+1 ao serializar apar_nome
    queryset = (
        Exercicio.objects
        .filter(deleted_at__isnull=True)
        .select_related('exe_aparelho')
        .order_by('exe_nome')
    )
    serializer_class = ExercicioSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['exe_modalidade', 'exe_aparelho']
    search_fields = ['exe_nome']
    ordering_fields = ['exe_nome', 'exe_modalidade']


class FichaTreinoViewSet(AuditMixin, ModelViewSet):
    queryset = FichaTreino.objects.filter(deleted_at__isnull=True).order_by('fitr_nome')
    serializer_class = FichaTreinoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['fitr_modalidade']
    search_fields = ['fitr_nome']
    ordering_fields = ['fitr_nome']


class FichaTreinoExerciciosViewSet(AuditMixin, ModelViewSet):
    # select_related: evita N+1 ao serializar exe_nome e apar_nome
    queryset = (
        FichaTreinoExercicios.objects
        .filter(deleted_at__isnull=True)
        .select_related('exe__exe_aparelho')
        .order_by('fitr', 'ftex_ordem')
    )
    serializer_class = FichaTreinoExerciciosSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['fitr', 'exe']
    ordering_fields = ['ftex_ordem']


class AulaViewSet(AuditMixin, ModelViewSet):
    queryset = Aula.objects.filter(deleted_at__isnull=True).order_by('-aul_data', '-aul_hora_inicio')
    serializer_class = AulaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tur', 'alu', 'func', 'aul_tipo_presenca', 'aul_data']
    search_fields = ['alu__alu_nome', 'tur__tur_nome']
    ordering_fields = ['aul_data', 'aul_hora_inicio']


class CreditoReposicaoViewSet(AuditMixin, ModelViewSet):
    queryset = CreditoReposicao.objects.filter(deleted_at__isnull=True).order_by('cred_data_expiracao')
    serializer_class = CreditoReposicaoSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['alu', 'cred_status', 'cred_usado']
    ordering_fields = ['cred_data_expiracao', 'cred_data_geracao']

    @action(detail=False, methods=['get'], url_path='aluno/(?P<alu_id>[^/.]+)')
    def por_aluno(self, request, alu_id=None):
        """
        GET /api/creditos/aluno/{alu_id}/
        Retorna créditos disponíveis de um aluno, ordenados por validade (FIFO).
        """
        creditos = self.queryset.filter(
            alu_id=alu_id,
            cred_status='disponivel',
        ).order_by('cred_data_expiracao')
        page = self.paginate_queryset(creditos)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(creditos, many=True)
        return Response(serializer.data)
