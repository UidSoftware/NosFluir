import cloudinary.uploader
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import EmailTokenObtainPairSerializer, UserSerializer, UserCreateSerializer

User = get_user_model()


class EmailTokenObtainPairView(TokenObtainPairView):
    """Login com e-mail e senha. Retorna access + refresh tokens."""
    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [AllowAny]


class LogoutView(APIView):
    """Invalida o refresh token (blacklist). Requer autenticação."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'detail': 'Logout realizado com sucesso.'}, status=status.HTTP_200_OK)
        except KeyError:
            return Response({'detail': 'Campo refresh é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'detail': 'Token inválido ou já expirado.'}, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    """Retorna os dados do usuário autenticado."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class UserViewSet(ModelViewSet):
    """CRUD de usuários — apenas Administradores."""
    queryset = User.objects.filter(is_active=True).order_by('email')
    permission_classes = [IsAdminUser]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['email', 'date_joined']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_foto(request):
    arquivo = request.FILES.get('foto')

    if not arquivo:
        return Response({'error': 'Nenhum arquivo enviado.'}, status=status.HTTP_400_BAD_REQUEST)

    if arquivo.content_type not in ['image/jpeg', 'image/png']:
        return Response({'error': 'Formato inválido. Use JPG ou PNG.'}, status=status.HTTP_400_BAD_REQUEST)

    if arquivo.size > 2 * 1024 * 1024:
        return Response({'error': 'Arquivo muito grande. Máximo 2MB.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        resultado = cloudinary.uploader.upload(
            arquivo,
            folder='nosfluir/avatars',
            public_id=f'user_{request.user.id}',
            overwrite=True,
            transformation=[
                {'width': 200, 'height': 200, 'crop': 'fill', 'gravity': 'face'}
            ]
        )
        request.user.foto_url = resultado['secure_url']
        request.user.save(update_fields=['foto_url'])
        return Response({'foto_url': resultado['secure_url']})
    except Exception as e:
        return Response({'error': f'Erro no upload: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remover_foto(request):
    if request.user.foto_url:
        public_id = f'nosfluir/avatars/user_{request.user.id}'
        cloudinary.uploader.destroy(public_id)
        request.user.foto_url = None
        request.user.save(update_fields=['foto_url'])
    return Response({'message': 'Foto removida com sucesso.'})
