from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AgendamentoExperimentalViewSet, AgendamentoHorarioViewSet, AgendamentoTurmasViewSet,
    AlunoViewSet, AulaExperimentalViewSet, AvisoFaltaViewSet, FichaAlunoViewSet,
    FuncionarioViewSet, ProfissaoViewSet, SlotExperimentalViewSet,
    TurmaViewSet, TurmaAlunosViewSet,
)

router = DefaultRouter()
router.register('alunos', AlunoViewSet, basename='alunos')
router.register('profissoes', ProfissaoViewSet, basename='profissoes')
router.register('funcionarios', FuncionarioViewSet, basename='funcionarios')
router.register('turmas', TurmaViewSet, basename='turmas')
router.register('turma-alunos', TurmaAlunosViewSet, basename='turma-alunos')
router.register('ficha-aluno', FichaAlunoViewSet, basename='ficha-aluno')
router.register('avisos-falta', AvisoFaltaViewSet, basename='avisos-falta')
router.register('agendamentos-horario', AgendamentoHorarioViewSet, basename='agendamentos-horario')
router.register('agendamentos-turmas', AgendamentoTurmasViewSet, basename='agendamentos-turmas')
router.register('slots-experimentais', SlotExperimentalViewSet, basename='slots-experimentais')
router.register('agendamento-experimental', AgendamentoExperimentalViewSet, basename='agendamento-experimental')
router.register('aula-experimental', AulaExperimentalViewSet, basename='aula-experimental')

urlpatterns = [
    path('', include(router.urls)),
]
