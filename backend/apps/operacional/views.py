from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.core.mixins import AuditMixin

from .models import (
    AgendamentoHorario, AgendamentoTurmas,
    Aluno, FichaAluno, Funcionario, Profissao, Turma, TurmaAlunos,
)
from .serializers import (
    AgendamentoHorarioSerializer, AgendamentoTurmasSerializer,
    AlunoSerializer, FichaAlunoSerializer, FuncionarioSerializer, ProfissaoSerializer,
    TurmaSerializer, TurmaAlunosSerializer,
)


class AlunoViewSet(AuditMixin, ModelViewSet):
    queryset = Aluno.objects.filter(deleted_at__isnull=True).order_by('alu_nome')
    serializer_class = AlunoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['alu_nome', 'alu_documento', 'alu_email', 'alu_telefone']
    ordering_fields = ['alu_nome', 'alu_data_nascimento']


class ProfissaoViewSet(AuditMixin, ModelViewSet):
    queryset = Profissao.objects.filter(deleted_at__isnull=True).order_by('prof_nome')
    serializer_class = ProfissaoSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['prof_nome']
    ordering_fields = ['prof_nome']


class FuncionarioViewSet(AuditMixin, ModelViewSet):
    queryset = Funcionario.objects.filter(deleted_at__isnull=True).order_by('func_nome')
    serializer_class = FuncionarioSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['prof']
    search_fields = ['func_nome', 'func_documento']
    ordering_fields = ['func_nome', 'func_salario']


class TurmaViewSet(AuditMixin, ModelViewSet):
    queryset = Turma.objects.filter(deleted_at__isnull=True).order_by('tur_nome')
    serializer_class = TurmaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tur_modalidade']
    search_fields = ['tur_nome', 'tur_horario']
    ordering_fields = ['tur_nome']


class TurmaAlunosViewSet(AuditMixin, ModelViewSet):
    queryset = TurmaAlunos.objects.filter(deleted_at__isnull=True).order_by('tur__tur_nome', 'alu__alu_nome')
    serializer_class = TurmaAlunosSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tur', 'alu', 'ativo']
    search_fields = ['alu__alu_nome', 'tur__tur_nome']
    ordering_fields = ['data_matricula']


class FichaAlunoViewSet(AuditMixin, ModelViewSet):
    queryset = FichaAluno.objects.filter(deleted_at__isnull=True).order_by('-fial_data')
    serializer_class = FichaAlunoSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['aluno']
    ordering_fields = ['fial_data']


class AgendamentoHorarioViewSet(AuditMixin, ModelViewSet):
    """Pré-agendamentos via site — aceita criação sem autenticação."""
    queryset = AgendamentoHorario.objects.filter(deleted_at__isnull=True).order_by('-created_at')
    serializer_class = AgendamentoHorarioSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['alu']
    search_fields = ['alu__alu_nome']

    def get_permissions(self):
        # Site institucional pode criar agendamentos sem login
        if self.action == 'create':
            return [AllowAny()]
        return super().get_permissions()


class AgendamentoTurmasViewSet(AuditMixin, ModelViewSet):
    """Pré-cadastro em turmas via site — aceita criação sem autenticação."""
    queryset = AgendamentoTurmas.objects.filter(deleted_at__isnull=True).order_by('-created_at')
    serializer_class = AgendamentoTurmasSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['alu']
    search_fields = ['alu__alu_nome']

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return super().get_permissions()
