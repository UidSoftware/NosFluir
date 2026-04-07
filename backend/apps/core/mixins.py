from django.db import models
from django.conf import settings
from django.utils import timezone
from rest_framework import mixins
from rest_framework.viewsets import GenericViewSet


class BaseModel(models.Model):
    """
    Model base abstrato com campos de auditoria.
    Todos os models do sistema herdam desta classe.
    Soft delete: NUNCA usar objeto.delete() — setar deleted_at + deleted_by + save().
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='%(app_label)s_%(class)s_created',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='%(app_label)s_%(class)s_updated',
    )
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='%(app_label)s_%(class)s_deleted',
    )

    class Meta:
        abstract = True


class AuditMixin:
    """
    Mixin para ViewSets que preenche automaticamente os campos de auditoria
    (created_by / updated_by) a partir do usuário autenticado na requisição.
    """

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(created_by=user)

    def perform_update(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(updated_by=user)

    def perform_destroy(self, instance):
        user = self.request.user if self.request.user.is_authenticated else None
        instance.deleted_at = timezone.now()
        instance.deleted_by = user
        instance.save(update_fields=['deleted_at', 'deleted_by'])


class ReadCreateViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    GenericViewSet,
):
    """
    ViewSet que permite apenas criação e leitura (GET e POST).
    Usado no LivroCaixa — imutável por design.
    Retorna 405 para PUT, PATCH e DELETE.
    """
    pass
