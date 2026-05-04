import django_filters
from django.db.models import Avg, Count
from rest_framework.decorators import action, api_view, permission_classes as perm_classes
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.core.mixins import AuditMixin
from apps.core.permissions import IsProfessorOuAdmin

from .models import Acessorio, Aparelho, Aulas, CreditoReposicao, Exercicio, FichaTreino, FichaTreinoExercicios, MinistrarAula, ProgramaTurma, RegistroExercicioAluno
from rest_framework.pagination import PageNumberPagination

from .serializers import (
    AcessorioSerializer, AparelhoSerializer, AulasSerializer, MinistrarAulaSerializer,
    CreditoReposicaoSerializer, ExercicioSerializer, FaltaSemJustificativaSerializer,
    FichaTreinoSerializer, FichaTreinoExerciciosSerializer,
    ProgramaTurmaSerializer, RegistroExercicioAlunoSerializer,
)


class AcessorioViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsProfessorOuAdmin]
    queryset = Acessorio.objects.filter(deleted_at__isnull=True).order_by('acess_nome')
    serializer_class = AcessorioSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['acess_ativo']
    search_fields = ['acess_nome']
    ordering_fields = ['acess_nome']


class AparelhoViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsProfessorOuAdmin]
    queryset = Aparelho.objects.filter(deleted_at__isnull=True).order_by('apar_modalidade', 'apar_nome')
    serializer_class = AparelhoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['apar_modalidade', 'apar_ativo']
    search_fields = ['apar_nome']
    ordering_fields = ['apar_nome', 'apar_modalidade']


class ExercicioViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsProfessorOuAdmin]
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
    permission_classes = [IsProfessorOuAdmin]
    queryset = FichaTreino.objects.filter(deleted_at__isnull=True).order_by('fitr_nome')
    serializer_class = FichaTreinoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['fitr_modalidade']
    search_fields = ['fitr_nome']
    ordering_fields = ['fitr_nome']


class FichaTreinoExerciciosViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsProfessorOuAdmin]
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
    permission_classes = [IsProfessorOuAdmin]
    queryset = ProgramaTurma.objects.filter(deleted_at__isnull=True).select_related('fitr').order_by('turma', 'prog_ordem')
    serializer_class = ProgramaTurmaSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['turma']
    ordering_fields = ['prog_ordem']


class AulasViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsProfessorOuAdmin]
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
    permission_classes = [IsProfessorOuAdmin]
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
    permission_classes = [IsProfessorOuAdmin]
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
    permission_classes = [IsProfessorOuAdmin]
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


@api_view(['GET'])
@perm_classes([IsProfessorOuAdmin])
def evolucao_carga(request):
    """GET /api/relatorios/evolucao-carga/?alu=X&exe=Y"""
    alu_id = request.query_params.get('alu')
    exe_id = request.query_params.get('exe')
    if not alu_id or not exe_id:
        return Response({'detail': 'Parâmetros alu e exe são obrigatórios.'}, status=400)

    registros = (
        RegistroExercicioAluno.objects
        .filter(
            ministrar_aula__alu=alu_id,
            ftex__exe=exe_id,
            deleted_at__isnull=True,
        )
        .select_related('ministrar_aula__aula')
        .order_by(
            'ministrar_aula__aula__aul_numero_ciclo',
            'ministrar_aula__aula__aul_posicao_ciclo',
        )
    )

    data = []
    for reg in registros:
        aula = reg.ministrar_aula.aula if reg.ministrar_aula else None
        data.append({
            'ciclo':       aula.aul_numero_ciclo    if aula else None,
            'posicao':     aula.aul_posicao_ciclo   if aula else None,
            'data':        aula.aul_data.isoformat() if aula and aula.aul_data else None,
            'carga':       reg.reg_carga,
            'series':      reg.reg_series,
            'repeticoes':  reg.reg_repeticoes,
            'observacoes': reg.reg_observacoes,
        })
    return Response(data)


@api_view(['GET'])
@perm_classes([IsProfessorOuAdmin])
def evolucao_pse(request):
    """GET /api/relatorios/evolucao-pse/?tur=X&modalidade=pilates|funcional"""
    tur_id = request.query_params.get('tur')
    if not tur_id:
        return Response({'detail': 'Parâmetro tur é obrigatório.'}, status=400)

    qs = MinistrarAula.objects.filter(
        aula__tur=tur_id,
        miau_tipo_presenca='presente',
        miau_pse__isnull=False,
        deleted_at__isnull=True,
    )

    modalidade = request.query_params.get('modalidade')
    if modalidade:
        qs = qs.filter(aula__aul_modalidade=modalidade)

    dados = (
        qs
        .values(
            'aula__aul_id',
            'aula__aul_numero_ciclo',
            'aula__aul_posicao_ciclo',
            'aula__aul_data',
            'aula__fitr__fitr_nome',
        )
        .annotate(pse_medio=Avg('miau_pse'), total=Count('miau_id'))
        .order_by('aula__aul_posicao_ciclo', 'aula__aul_id')
    )

    result = [
        {
            'aula_id':   d['aula__aul_id'],
            'ciclo':     d['aula__aul_numero_ciclo'],
            'posicao':   d['aula__aul_posicao_ciclo'],
            'data':      d['aula__aul_data'].isoformat() if d['aula__aul_data'] else None,
            'fitr_nome': d['aula__fitr__fitr_nome'],
            'pse_medio': round(d['pse_medio'], 1) if d['pse_medio'] else None,
            'total':     d['total'],
        }
        for d in dados
    ]
    return Response(result)


@api_view(['GET'])
def faltas_sem_justificativa(request):
    """GET /api/faltas-sem-justificativa/?alu=X&tur=Y&aul_data=Z"""
    qs = (
        MinistrarAula.objects
        .filter(miau_tipo_presenca='falta', miau_tipo_falta='sem_aviso', deleted_at__isnull=True)
        .select_related('alu', 'tur', 'aula')
        .order_by('-aula__aul_data')
    )

    if alu := request.query_params.get('alu'):
        qs = qs.filter(alu=alu)
    if tur := request.query_params.get('tur'):
        qs = qs.filter(tur=tur)
    if aul_data := request.query_params.get('aul_data'):
        qs = qs.filter(aula__aul_data=aul_data)

    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(qs, request)
    serializer = FaltaSemJustificativaSerializer(page if page is not None else qs, many=True)
    return paginator.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)
