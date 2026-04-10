from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AgendamentoHorarioViewSet, AgendamentoTurmasViewSet,
    AlunoViewSet, FichaAlunoViewSet, FuncionarioViewSet, ProfissaoViewSet,
    TurmaViewSet, TurmaAlunosViewSet,
)

router = DefaultRouter()
router.register('alunos', AlunoViewSet, basename='alunos')
router.register('profissoes', ProfissaoViewSet, basename='profissoes')
router.register('funcionarios', FuncionarioViewSet, basename='funcionarios')
router.register('turmas', TurmaViewSet, basename='turmas')
router.register('turma-alunos', TurmaAlunosViewSet, basename='turma-alunos')
router.register('ficha-aluno', FichaAlunoViewSet, basename='ficha-aluno')
router.register('agendamentos-horario', AgendamentoHorarioViewSet, basename='agendamentos-horario')
router.register('agendamentos-turmas', AgendamentoTurmasViewSet, basename='agendamentos-turmas')

urlpatterns = [
    path('', include(router.urls)),
]
