from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AlunoPlanoViewSet, ContaViewSet, ContasPagarViewSet, ContasReceberViewSet,
    FolhaPagamentoViewSet, FornecedorViewSet, LivroCaixaViewSet,
    PlanoContasViewSet, PlanosPagamentosViewSet, ServicoProdutoViewSet,
)

router = DefaultRouter()
router.register('contas', ContaViewSet, basename='contas')
router.register('plano-contas', PlanoContasViewSet, basename='plano-contas')
router.register('fornecedores', FornecedorViewSet, basename='fornecedores')
router.register('servicos-produtos', ServicoProdutoViewSet, basename='servicos-produtos')
router.register('contas-pagar', ContasPagarViewSet, basename='contas-pagar')
router.register('contas-receber', ContasReceberViewSet, basename='contas-receber')
router.register('planos-pagamentos', PlanosPagamentosViewSet, basename='planos-pagamentos')
router.register('aluno-plano', AlunoPlanoViewSet, basename='aluno-plano')
router.register('livro-caixa', LivroCaixaViewSet, basename='livro-caixa')
router.register('folha-pagamento', FolhaPagamentoViewSet, basename='folha-pagamento')

urlpatterns = [
    path('', include(router.urls)),
]
