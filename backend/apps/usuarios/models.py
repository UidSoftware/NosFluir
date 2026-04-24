from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    """
    Usuário do sistema. Autenticação por email (não por username).
    Perfis de acesso controlados via Grupos Django:
    Administrador, Professor, Financeiro, Recepcionista.
    """
    username = None
    email = models.EmailField('e-mail', unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    foto_url = models.URLField(max_length=500, null=True, blank=True)

    objects = UserManager()

    class Meta:
        db_table = 'users'
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'

    def __str__(self):
        return self.email
