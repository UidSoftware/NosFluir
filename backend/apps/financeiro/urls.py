from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ContasPagarViewSet, ContasReceberViewSet, FolhaPagamentoViewSet,
    FornecedorViewSet, LivroCaixaViewSet, PlanosPagamentosViewSet, ServicoProdutoViewSet,
)

router = DefaultRouter()
router.register('fornecedores', FornecedorViewSet, basename='fornecedores')
router.register('servicos-produtos', ServicoProdutoViewSet, basename='servicos-produtos')
router.register('contas-pagar', ContasPagarViewSet, basename='contas-pagar')
router.register('contas-receber', ContasReceberViewSet, basename='contas-receber')
router.register('planos-pagamentos', PlanosPagamentosViewSet, basename='planos-pagamentos')
router.register('livro-caixa', LivroCaixaViewSet, basename='livro-caixa')
router.register('folha-pagamento', FolhaPagamentoViewSet, basename='folha-pagamento')

urlpatterns = [
    path('', include(router.urls)),
]
