from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from django_filters.rest_framework import DjangoFilterBackend

from .models import Artefato
from .serializers import ArtefatoSerializer
from .authentication import ServiceTokenAuthentication
from .permissions import PodeGerenciarArtefatos


class ArtefatoViewSet(viewsets.ModelViewSet):
    serializer_class = ArtefatoSerializer
    authentication_classes = [ServiceTokenAuthentication, JWTAuthentication]
    permission_classes = [PodeGerenciarArtefatos]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['tipo', 'agente']
    search_fields = ['titulo', 'conteudo']
    ordering = ['-criado_em']
    http_method_names = ['get', 'post', 'patch', 'put', 'delete', 'head', 'options']

    def get_queryset(self):
        return Artefato.objects.filter(ativo=True)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save(update_fields=['ativo'])
        return Response(status=status.HTTP_204_NO_CONTENT)
