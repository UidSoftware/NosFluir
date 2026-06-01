# settings_test.py — configuração exclusiva para o runner do GitHub Actions CI
# Usa SQLite em memória para evitar dependência de PostgreSQL no runner.
# Todas as demais configurações herdam do settings.py de produção.
#
# USO:
#   python manage.py test --settings=config.settings_test

from .settings import *  # noqa: F401, F403

# Banco em memória — sem PostgreSQL no CI
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Chave secreta fixa para o CI (não é segredo — só usado em testes)
SECRET_KEY = 'ci-test-secret-key-not-for-production-use'

# DEBUG ativo facilita diagnóstico de falhas no CI
DEBUG = True

# Domínio de teste
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']

# Desabilita Cloudinary no CI — não há credenciais reais
CLOUDINARY_CLOUD_NAME = ''
CLOUDINARY_API_KEY = ''
CLOUDINARY_API_SECRET = ''

# Decouple não lê .env no CI — sobrescrever variáveis que ele tentaria buscar
import cloudinary  # noqa: E402
cloudinary.config(
    cloud_name='',
    api_key='',
    api_secret='',
)

# JWT com tempos curtos — não importa no CI
from datetime import timedelta  # noqa: E402
SIMPLE_JWT = {
    **SIMPLE_JWT,  # noqa: F405
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
}

# CORS e CSRF — valores mínimos para testes passarem
CORS_ALLOWED_ORIGINS = ['http://localhost:5173']
CSRF_TRUSTED_ORIGINS = ['http://localhost']
