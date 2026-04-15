from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AcessorioViewSet, AparelhoViewSet, AulasViewSet, MinistrarAulaViewSet,
    CreditoReposicaoViewSet, ExercicioViewSet, FichaTreinoViewSet, FichaTreinoExerciciosViewSet,
    ProgramaTurmaViewSet,
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

urlpatterns = [
    path('', include(router.urls)),
]
