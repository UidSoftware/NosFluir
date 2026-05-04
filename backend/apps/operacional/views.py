from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework import status
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.core.mixins import AuditMixin
from apps.core.permissions import IsRecepcionistaOuAdmin

from .models import (
    AgendamentoHorario, AgendamentoTurmas,
    Aluno, AvisoFalta, FichaAluno, Funcionario, Profissao, Turma, TurmaAlunos,
)
from .serializers import (
    AgendamentoHorarioSerializer, AgendamentoTurmasSerializer,
    AlunoSerializer, AvisoFaltaSerializer, FichaAlunoSerializer, FuncionarioSerializer,
    ProfissaoSerializer, TurmaSerializer, TurmaAlunosSerializer,
)


class AlunoViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsRecepcionistaOuAdmin]
    queryset = Aluno.objects.filter(deleted_at__isnull=True).order_by('alu_nome')
    serializer_class = AlunoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['alu_ativo']
    search_fields = ['alu_nome', 'alu_documento', 'alu_email', 'alu_telefone']
    ordering_fields = ['alu_nome', 'alu_data_nascimento']


class ProfissaoViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsRecepcionistaOuAdmin]
    queryset = Profissao.objects.filter(deleted_at__isnull=True).order_by('prof_nome')
    serializer_class = ProfissaoSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['prof_nome']
    ordering_fields = ['prof_nome']


class FuncionarioViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsRecepcionistaOuAdmin]
    queryset = Funcionario.objects.filter(deleted_at__isnull=True).order_by('func_nome')
    serializer_class = FuncionarioSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['prof']
    search_fields = ['func_nome', 'func_documento']
    ordering_fields = ['func_nome', 'func_salario']


class TurmaViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsRecepcionistaOuAdmin]
    queryset = Turma.objects.filter(deleted_at__isnull=True).order_by('tur_nome')
    serializer_class = TurmaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tur_modalidade']
    search_fields = ['tur_nome', 'tur_horario']
    ordering_fields = ['tur_nome']


class TurmaAlunosViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsRecepcionistaOuAdmin]
    queryset = TurmaAlunos.objects.filter(deleted_at__isnull=True).order_by('tur__tur_nome', 'alu__alu_nome')
    serializer_class = TurmaAlunosSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tur', 'alu', 'ativo', 'alu__alu_ativo']
    search_fields = ['alu__alu_nome', 'tur__tur_nome']
    ordering_fields = ['data_matricula']

    def create(self, request, *args, **kwargs):
        # Se o aluno já foi removido (soft-delete) da turma, restaura em vez de criar novo
        tur_id = request.data.get('tur')
        alu_id = request.data.get('alu')
        existing = TurmaAlunos.objects.filter(
            tur_id=tur_id, alu_id=alu_id, deleted_at__isnull=False
        ).first()
        if existing:
            total = TurmaAlunos.objects.filter(
                tur_id=tur_id, ativo=True, deleted_at__isnull=True
            ).count()
            if total >= 15:
                return Response(
                    {'tur': 'Turma já atingiu o limite de 15 alunos.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            existing.deleted_at = None
            existing.deleted_by = None
            existing.ativo = True
            existing.updated_by = request.user
            existing.save()
            serializer = self.get_serializer(existing)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return super().create(request, *args, **kwargs)


class FichaAlunoViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsRecepcionistaOuAdmin]
    queryset = FichaAluno.objects.filter(deleted_at__isnull=True).order_by('-fial_data')
    serializer_class = FichaAlunoSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['aluno']
    ordering_fields = ['fial_data']


class AvisoFaltaViewSet(AuditMixin, ModelViewSet):
    permission_classes = [IsRecepcionistaOuAdmin]
    queryset = AvisoFalta.objects.filter(deleted_at__isnull=True).select_related('aluno', 'turma').order_by('-avi_data_hora_aviso')
    serializer_class = AvisoFaltaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['aluno', 'turma', 'avi_data_aula', 'avi_tipo', 'avi_gera_credito']
    search_fields = ['aluno__alu_nome', 'turma__tur_nome']
    ordering_fields = ['avi_data_hora_aviso', 'avi_data_aula']


class AgendamentoHorarioViewSet(AuditMixin, ModelViewSet):
    """Pré-agendamentos via site — aceita criação sem autenticação."""
    permission_classes = [IsRecepcionistaOuAdmin]
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
    permission_classes = [IsRecepcionistaOuAdmin]
    queryset = AgendamentoTurmas.objects.filter(deleted_at__isnull=True).order_by('-created_at')
    serializer_class = AgendamentoTurmasSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['alu']
    search_fields = ['alu__alu_nome']

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return super().get_permissions()
