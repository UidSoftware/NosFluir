from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AcessorioViewSet, AparelhoViewSet, AulasViewSet, MinistrarAulaViewSet,
    CreditoReposicaoViewSet, ExercicioViewSet, FichaTreinoViewSet, FichaTreinoExerciciosViewSet,
    ProgramaTurmaViewSet, RegistroExercicioAlunoViewSet,
    evolucao_carga, evolucao_pse, faltas_sem_justificativa,
)

router = DefaultRouter()
router.register('acessorios', AcessorioViewSet, basename='acessorios')
router.register('aparelhos', AparelhoViewSet, basename='aparelhos')
router.register('aulas', AulasViewSet, basename='aulas')
router.register('programa-turma', ProgramaTurmaViewSet, basename='programa-turma')
router.register('exercicios', ExercicioViewSet, basename='exercicios')
router.register('fichas-treino', FichaTreinoViewSet, basename='fichas-treino')
router.register('fichas-treino-exercicios', FichaTreinoExerciciosViewSet, basename='fichas-treino-exercicios')
router.register('ministrar-aula', MinistrarAulaViewSet, basename='ministrar-aula')
router.register('creditos', CreditoReposicaoViewSet, basename='creditos')
router.register('registro-exercicio-aluno', RegistroExercicioAlunoViewSet, basename='registro-exercicio-aluno')

urlpatterns = [
    path('', include(router.urls)),
    path('relatorios/evolucao-carga/',   evolucao_carga,             name='evolucao-carga'),
    path('relatorios/evolucao-pse/',     evolucao_pse,               name='evolucao-pse'),
    path('faltas-sem-justificativa/',    faltas_sem_justificativa,   name='faltas-sem-justificativa'),
]
