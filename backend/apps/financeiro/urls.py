from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AlunoPlanoViewSet, ContaViewSet, ContasPagarViewSet, ContasReceberViewSet,
    FolhaPagamentoViewSet, FornecedorViewSet, LivroCaixaViewSet,
    PedidoViewSet, PlanoContasViewSet, PlanosPagamentosViewSet,
    ProdutoViewSet, ServicoProdutoViewSet, transferencia_entre_contas,
    gerar_mensalidades,
)
from .relatorios import relatorio_dre, relatorio_extrato, relatorio_fluxo_caixa

router = DefaultRouter()
router.register('contas', ContaViewSet, basename='contas')
router.register('produtos', ProdutoViewSet, basename='produtos')
router.register('pedidos', PedidoViewSet, basename='pedidos')
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
    path('transferencia/',        transferencia_entre_contas, name='transferencia'),
    path('gerar-mensalidades/',   gerar_mensalidades,         name='gerar-mensalidades'),
    path('relatorios/dre/',       relatorio_dre,              name='relatorio-dre'),
    path('relatorios/fluxo-caixa/', relatorio_fluxo_caixa,   name='relatorio-fluxo-caixa'),
    path('relatorios/extrato/',   relatorio_extrato,          name='relatorio-extrato'),
]
