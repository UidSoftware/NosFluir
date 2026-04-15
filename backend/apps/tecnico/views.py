import django_filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.core.mixins import AuditMixin

from .models import Acessorio, Aparelho, Aulas, CreditoReposicao, Exercicio, FichaTreino, FichaTreinoExercicios, MinistrarAula, ProgramaTurma, RegistroExercicioAluno
from .serializers import (
    AcessorioSerializer, AparelhoSerializer, AulasSerializer, MinistrarAulaSerializer,
    CreditoReposicaoSerializer, ExercicioSerializer, FichaTreinoSerializer, FichaTreinoExerciciosSerializer,
    ProgramaTurmaSerializer, RegistroExercicioAlunoSerializer,
)


class AcessorioViewSet(AuditMixin, ModelViewSet):
    queryset = Acessorio.objects.filter(deleted_at__isnull=True).order_by('acess_nome')
    serializer_class = AcessorioSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['acess_ativo']
    search_fields = ['acess_nome']
    ordering_fields = ['acess_nome']


class AparelhoViewSet(AuditMixin, ModelViewSet):
    queryset = Aparelho.objects.filter(deleted_at__isnull=True).order_by('apar_modalidade', 'apar_nome')
    serializer_class = AparelhoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['apar_modalidade', 'apar_ativo']
    search_fields = ['apar_nome']
    ordering_fields = ['apar_nome', 'apar_modalidade']


class ExercicioViewSet(AuditMixin, ModelViewSet):
    # select_related: evita N+1 ao serializar apar_nome e acess_nome
    queryset = (
        Exercicio.objects
        .filter(deleted_at__isnull=True)
        .select_related('exe_aparelho', 'exe_acessorio')
        .order_by('exe_nome')
    )
    serializer_class = ExercicioSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['exe_modalidade', 'exe_aparelho', 'exe_acessorio']
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
    # select_related: evita N+1 ao serializar exe_nome, apar_nome e combinados
    queryset = (
        FichaTreinoExercicios.objects
        .filter(deleted_at__isnull=True)
        .select_related('exe__exe_aparelho', 'exe2__exe_aparelho')
        .order_by('fitr', 'ftex_ordem')
    )
    serializer_class = FichaTreinoExerciciosSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['fitr', 'exe']
    ordering_fields = ['ftex_ordem']


class AulasFilter(django_filters.FilterSet):
    aul_data_after  = django_filters.DateFilter(field_name='aul_data', lookup_expr='gte')
    aul_data_before = django_filters.DateFilter(field_name='aul_data', lookup_expr='lte')

    class Meta:
        model = Aulas
        fields = ['tur', 'func', 'fitr', 'aul_modalidade', 'aul_data', 'aul_numero_ciclo', 'aul_posicao_ciclo']


class ProgramaTurmaViewSet(AuditMixin, ModelViewSet):
    queryset = ProgramaTurma.objects.filter(deleted_at__isnull=True).select_related('fitr').order_by('turma', 'prog_ordem')
    serializer_class = ProgramaTurmaSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['turma']
    ordering_fields = ['prog_ordem']


class AulasViewSet(AuditMixin, ModelViewSet):
    queryset = (
        Aulas.objects
        .filter(deleted_at__isnull=True)
        .select_related('tur', 'func', 'fitr')
        .prefetch_related('registros')
        .order_by('-aul_data')
    )
    serializer_class = AulasSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = AulasFilter
    search_fields = ['aul_nome', 'tur__tur_nome']
    ordering_fields = ['aul_data']

    def perform_create(self, serializer):
        super().perform_create(serializer)
        aula = serializer.instance
        if aula.fitr_id:
            programa = ProgramaTurma.objects.filter(turma=aula.tur, fitr=aula.fitr).first()
            if programa:
                ciclos_anteriores = Aulas.objects.filter(
                    tur=aula.tur,
                    aul_posicao_ciclo=programa.prog_ordem,
                    deleted_at__isnull=True,
                ).exclude(aul_id=aula.aul_id).count()
                aula.aul_posicao_ciclo = programa.prog_ordem
                aula.aul_numero_ciclo = ciclos_anteriores + 1
                aula.save(update_fields=['aul_posicao_ciclo', 'aul_numero_ciclo'])


class MinistrarAulaViewSet(AuditMixin, ModelViewSet):
    queryset = MinistrarAula.objects.filter(deleted_at__isnull=True).order_by('-aula__aul_data')
    serializer_class = MinistrarAulaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['aula', 'tur', 'alu', 'func', 'miau_tipo_presenca', 'miau_data']
    search_fields = ['alu__alu_nome', 'tur__tur_nome']
    ordering_fields = ['miau_data', 'aula__aul_data']


class RegistroExercicioAlunoFilter(django_filters.FilterSet):
    ministrar_aula__alu        = django_filters.NumberFilter(field_name='ministrar_aula__alu')
    ministrar_aula__aula__fitr = django_filters.NumberFilter(field_name='ministrar_aula__aula__fitr')
    ftex__exe                  = django_filters.NumberFilter(field_name='ftex__exe')

    class Meta:
        model = RegistroExercicioAluno
        fields = ['ministrar_aula', 'ftex']


class RegistroExercicioAlunoViewSet(AuditMixin, ModelViewSet):
    queryset = (
        RegistroExercicioAluno.objects
        .filter(deleted_at__isnull=True)
        .select_related('ftex__exe')
        .order_by('ftex__ftex_ordem')
    )
    serializer_class = RegistroExercicioAlunoSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = RegistroExercicioAlunoFilter
    ordering_fields = ['ftex__ftex_ordem', 'created_at']


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
