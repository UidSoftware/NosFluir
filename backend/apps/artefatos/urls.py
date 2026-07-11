from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ArtefatoViewSet

router = DefaultRouter()
router.register('artefatos', ArtefatoViewSet, basename='artefatos')

urlpatterns = [
    path('', include(router.urls)),
]
