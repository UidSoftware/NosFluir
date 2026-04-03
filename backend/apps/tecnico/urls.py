from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AulaViewSet, CreditoReposicaoViewSet, ExercicioViewSet,
    FichaTreinoViewSet, FichaTreinoExerciciosViewSet,
)

router = DefaultRouter()
router.register('exercicios', ExercicioViewSet, basename='exercicios')
router.register('fichas-treino', FichaTreinoViewSet, basename='fichas-treino')
router.register('fichas-treino-exercicios', FichaTreinoExerciciosViewSet, basename='fichas-treino-exercicios')
router.register('aulas', AulaViewSet, basename='aulas')
router.register('creditos', CreditoReposicaoViewSet, basename='creditos')

urlpatterns = [
    path('', include(router.urls)),
]
