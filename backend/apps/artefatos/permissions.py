from rest_framework.permissions import BasePermission


class PodeGerenciarArtefatos(BasePermission):
    """Libera agents de serviço (Claw Empire) ou superusers Django — não usa
    Grupos de negócio (Administrador/Professor/...), pois artefatos aqui são
    documentação técnica da Uid, não do negócio do cliente."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'is_service', False):
            return True
        return bool(getattr(user, 'is_superuser', False))
