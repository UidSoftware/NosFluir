from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class EmailBackend(ModelBackend):
    """Backend de autenticação por e-mail em vez de username."""

    def authenticate(self, request, email=None, password=None, username=None, **kwargs):
        # Django admin passa como 'username'; JWT/API passa como 'email'
        email = email or username
        if not email:
            return None
        User = get_user_model()
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
