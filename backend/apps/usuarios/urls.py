from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from .views import EmailTokenObtainPairView, LogoutView, MeView, UserViewSet, upload_foto, remover_foto

router = DefaultRouter()
router.register('usuarios', UserViewSet, basename='usuarios')

urlpatterns = [
    path('token/', EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    path('usuarios/upload-foto/', upload_foto, name='upload-foto'),
    path('usuarios/remover-foto/', remover_foto, name='remover-foto'),
    path('', include(router.urls)),
]
