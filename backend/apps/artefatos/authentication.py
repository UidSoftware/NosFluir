from django.conf import settings
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed


class AgenteServico:
    """Usuário sintético que representa um agent do Claw Empire autenticado por token de serviço."""
    is_authenticated = True
    is_service = True

    def __str__(self):
        return 'agente-servico'


class ServiceTokenAuthentication(BaseAuthentication):
    """Autentica requisições dos agents do Claw Empire via header 'Authorization: Bearer <ARTEFATOS_API_TOKEN>'."""

    def authenticate(self, request):
        auth = get_authorization_header(request).split()
        if not auth or auth[0].lower() != b'bearer':
            return None
        if len(auth) != 2:
            raise AuthenticationFailed('Cabeçalho de autorização inválido.')

        token = auth[1].decode('utf-8')
        if not settings.ARTEFATOS_API_TOKEN or token != settings.ARTEFATOS_API_TOKEN:
            return None

        return (AgenteServico(), None)
