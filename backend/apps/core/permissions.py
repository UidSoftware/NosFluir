from rest_framework.permissions import BasePermission


class IsAdministrador(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return (
            request.user.is_superuser or
            request.user.groups.filter(name='Administrador').exists()
        )


class IsProfessorOuAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return (
            request.user.is_superuser or
            request.user.groups.filter(
                name__in=['Administrador', 'Professor']
            ).exists()
        )


class IsFinanceiroOuAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return (
            request.user.is_superuser or
            request.user.groups.filter(
                name__in=['Administrador', 'Financeiro']
            ).exists()
        )


class IsRecepcionistaOuAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return (
            request.user.is_superuser or
            request.user.groups.filter(
                name__in=['Administrador', 'Recepcionista']
            ).exists()
        )
