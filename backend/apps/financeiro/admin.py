from django.contrib import admin

from .models import (
    AlunoPlano, Conta, ContasPagar, ContasReceber, FolhaPagamento,
    Fornecedor, LivroCaixa, Pedido, PedidoItem, PlanoContas,
    PlanosPagamentos, Produto, ServicoProduto,
)


@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ['prod_nome', 'prod_valor_venda', 'prod_estoque_atual', 'prod_estoque_minimo', 'prod_ativo']
    list_filter = ['prod_ativo']
    search_fields = ['prod_nome']


class PedidoItemInline(admin.TabularInline):
    model = PedidoItem
    extra = 0
    fields = ['item_tipo', 'prod', 'serv', 'item_descricao', 'item_quantidade', 'item_valor_unitario', 'item_valor_total']
    readonly_fields = ['item_valor_total']


@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ['ped_numero', 'alu', 'ped_nome_cliente', 'ped_total', 'ped_status', 'ped_data']
    list_filter = ['ped_status', 'ped_pagamento_futuro']
    search_fields = ['ped_numero', 'ped_nome_cliente']
    inlines = [PedidoItemInline]


@admin.register(Conta)
class ContaAdmin(admin.ModelAdmin):
    list_display = ['cont_nome', 'cont_tipo', 'cont_saldo_inicial', 'cont_ativo']
    list_filter = ['cont_tipo', 'cont_ativo']
    search_fields = ['cont_nome']


@admin.register(PlanoContas)
class PlanoContasAdmin(admin.ModelAdmin):
    list_display = ['plc_codigo', 'plc_nome', 'plc_tipo', 'plc_ativo']
    list_filter = ['plc_tipo', 'plc_ativo']
    search_fields = ['plc_codigo', 'plc_nome']


@admin.register(Fornecedor)
class FornecedorAdmin(admin.ModelAdmin):
    list_display = ['forn_nome_empresa', 'forn_cnpj', 'forn_telefone', 'forn_ativo']
    list_filter = ['forn_ativo']
    search_fields = ['forn_nome_empresa', 'forn_cnpj']


@admin.register(ServicoProduto)
class ServicoProdutoAdmin(admin.ModelAdmin):
    list_display = ['serv_nome', 'serv_valor_base', 'serv_ativo']
    list_filter = ['serv_ativo']
    search_fields = ['serv_nome']


@admin.register(ContasPagar)
class ContasPagarAdmin(admin.ModelAdmin):
    list_display = ['pag_descricao', 'forn', 'cpa_nome_credor', 'cpa_tipo', 'pag_valor_total', 'pag_status', 'pag_data_vencimento']
    list_filter = ['pag_status', 'cpa_tipo']
    search_fields = ['pag_descricao', 'cpa_nome_credor']
    date_hierarchy = 'pag_data_vencimento'


@admin.register(ContasReceber)
class ContasReceberAdmin(admin.ModelAdmin):
    list_display = ['rec_descricao', 'alu', 'rec_nome_pagador', 'rec_tipo', 'rec_valor_total', 'rec_status', 'rec_data_vencimento']
    list_filter = ['rec_status', 'rec_tipo', 'rec_plano_tipo']
    search_fields = ['rec_descricao', 'rec_nome_pagador']
    date_hierarchy = 'rec_data_vencimento'


@admin.register(PlanosPagamentos)
class PlanosPagamentosAdmin(admin.ModelAdmin):
    list_display = ['serv', 'plan_tipo_plano', 'plan_valor_plano']
    list_filter = ['plan_tipo_plano']
    search_fields = ['serv__serv_nome']


@admin.register(AlunoPlano)
class AlunoPlanoAdmin(admin.ModelAdmin):
    list_display = ['aluno', 'plano', 'aplano_data_inicio', 'aplano_ativo']
    list_filter = ['aplano_ativo', 'plano']
    search_fields = ['aluno__alu_nome', 'plano__serv__serv_nome']


@admin.register(LivroCaixa)
class LivroCaixaAdmin(admin.ModelAdmin):
    list_display = [
        'lica_id', 'lica_data_lancamento', 'lica_tipo_lancamento',
        'lica_historico', 'lica_valor', 'lica_saldo_atual',
    ]
    list_filter = ['lica_tipo_lancamento', 'lica_origem_tipo']
    search_fields = ['lica_historico']
    date_hierarchy = 'lica_data_lancamento'

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(FolhaPagamento)
class FolhaPagamentoAdmin(admin.ModelAdmin):
    list_display = ['func', 'fopa_mes_referencia', 'fopa_ano_referencia', 'fopa_valor_liquido', 'fopa_status']
    list_filter = ['fopa_status', 'fopa_ano_referencia']
    search_fields = ['func__func_nome']
