from django.apps import AppConfig


class OperacionalConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.operacional'
    verbose_name = 'Operacional'

    def ready(self):
        import apps.operacional.signals  # noqa: F401
