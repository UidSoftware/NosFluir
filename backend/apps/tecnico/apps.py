from django.apps import AppConfig


class TecnicoConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.tecnico'
    verbose_name = 'Técnico'

    def ready(self):
        import apps.tecnico.signals  # noqa: F401
