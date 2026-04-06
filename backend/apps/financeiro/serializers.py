from decimal import Decimal

from rest_framework import serializers

from .models import (
    ContasPagar, ContasReceber, FolhaPagamento,
    Fornecedor, LivroCaixa, PlanosPagamentos, ServicoProduto,
)


class FornecedorSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)

    class Meta:
        model = Fornecedor
        fields = [
            'id', 'forn_id', 'forn_nome_empresa', 'forn_nome_dono', 'forn_cnpj',
            'forn_endereco', 'forn_telefone', 'forn_email', 'forn_ativo',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['forn_id', 'created_at', 'updated_at']


class ServicoProdutoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)

    class Meta:
        model = ServicoProduto
        fields = [
            'id', 'serv_id', 'serv_nome', 'serv_descricao', 'serv_valor_base',
            'serv_tipo', 'serv_ativo', 'created_at', 'updated_at',
        ]
        read_only_fields = ['serv_id', 'created_at', 'updated_at']


class ContasPagarSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    forn_nome = serializers.CharField(source='forn.forn_nome_empresa', read_only=True)
    serv_nome = serializers.CharField(source='serv.serv_nome', read_only=True)

    class Meta:
        model = ContasPagar
        fields = [
            'id', 'pag_id', 'forn', 'forn_nome', 'serv', 'serv_nome',
            'pag_data_emissao', 'pag_data_vencimento', 'pag_data_pagamento',
            'pag_descricao', 'pag_quantidade', 'pag_valor_unitario', 'pag_valor_total',
            'pag_status', 'pag_forma_pagamento', 'pag_observacoes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['pag_id', 'pag_valor_total', 'created_at', 'updated_at']

    def validate(self, data):
        # RN001: valor_total = quantidade × valor_unitario
        quantidade = data.get('pag_quantidade', getattr(self.instance, 'pag_quantidade', 1))
        valor_unitario = data.get('pag_valor_unitario', getattr(self.instance, 'pag_valor_unitario', Decimal('0')))
        data['pag_valor_total'] = quantidade * valor_unitario

        # RN-CPAG-01: data_pagamento só preenchida quando status = 'pago'
        status = data.get('pag_status', getattr(self.instance, 'pag_status', 'pendente'))
        data_pagamento = data.get('pag_data_pagamento')
        if data_pagamento and status != 'pago':
            raise serializers.ValidationError(
                {'pag_data_pagamento': 'Data de pagamento só pode ser preenchida quando status é "pago".'}
            )
        return data


class ContasReceberSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    alu_nome = serializers.CharField(source='alu.alu_nome', read_only=True)
    serv_nome = serializers.CharField(source='serv.serv_nome', read_only=True)

    class Meta:
        model = ContasReceber
        fields = [
            'id', 'rec_id', 'alu', 'alu_nome', 'serv', 'serv_nome',
            'rec_data_emissao', 'rec_data_vencimento', 'rec_data_recebimento',
            'rec_descricao', 'rec_quantidade', 'rec_valor_unitario', 'rec_desconto', 'rec_valor_total',
            'rec_status', 'rec_forma_recebimento', 'rec_plano_tipo', 'rec_observacoes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['rec_id', 'rec_valor_total', 'created_at', 'updated_at']

    def validate(self, data):
        # RN002: valor_total = (quantidade × valor_unitario) - desconto
        quantidade = data.get('rec_quantidade', getattr(self.instance, 'rec_quantidade', 1))
        valor_unitario = data.get('rec_valor_unitario', getattr(self.instance, 'rec_valor_unitario', Decimal('0')))
        desconto = data.get('rec_desconto', getattr(self.instance, 'rec_desconto', Decimal('0')))

        valor_bruto = quantidade * valor_unitario

        # RN-CREC-03: desconto entre 0 e valor bruto
        if desconto < 0 or desconto > valor_bruto:
            raise serializers.ValidationError(
                {'rec_desconto': f'Desconto deve ser entre R$ 0,00 e R$ {valor_bruto:.2f}.'}
            )

        data['rec_valor_total'] = valor_bruto - desconto

        # RN-CREC-01: data_recebimento só preenchida quando status = 'recebido'
        status = data.get('rec_status', getattr(self.instance, 'rec_status', 'pendente'))
        data_recebimento = data.get('rec_data_recebimento')
        if data_recebimento and status != 'recebido':
            raise serializers.ValidationError(
                {'rec_data_recebimento': 'Data de recebimento só pode ser preenchida quando status é "recebido".'}
            )
        return data


class PlanosPagamentosSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    alu_nome = serializers.CharField(source='alu.alu_nome', read_only=True)
    serv_nome = serializers.CharField(source='serv.serv_nome', read_only=True)

    class Meta:
        model = PlanosPagamentos
        fields = [
            'id', 'plan_id', 'alu', 'alu_nome', 'serv', 'serv_nome',
            'plan_tipo_plano', 'plan_valor_plano', 'plan_data_inicio', 'plan_data_fim',
            'plan_dia_vencimento', 'plan_ativo', 'created_at', 'updated_at',
        ]
        read_only_fields = ['plan_id', 'created_at', 'updated_at']

    def validate(self, data):
        # RN-PLAN-01: dia_vencimento entre 1 e 31
        dia = data.get('plan_dia_vencimento', getattr(self.instance, 'plan_dia_vencimento', None))
        if dia is not None and not (1 <= dia <= 31):
            raise serializers.ValidationError(
                {'plan_dia_vencimento': 'Dia de vencimento deve ser entre 1 e 31.'}
            )

        # RN-PLAN-02: data_fim > data_inicio
        data_inicio = data.get('plan_data_inicio', getattr(self.instance, 'plan_data_inicio', None))
        data_fim = data.get('plan_data_fim')
        if data_fim and data_inicio and data_fim <= data_inicio:
            raise serializers.ValidationError(
                {'plan_data_fim': 'Data de término deve ser maior que a data de início.'}
            )
        return data


class LivroCaixaSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)

    class Meta:
        model = LivroCaixa
        fields = [
            'id', 'lica_id', 'lica_data_lancamento', 'lica_tipo_lancamento', 'lica_historico',
            'lica_valor', 'lica_categoria', 'lica_origem_tipo', 'lica_origem_id',
            'lica_saldo_anterior', 'lica_saldo_atual', 'lica_forma_pagamento',
        ]
        # lica_saldo_anterior e lica_saldo_atual são calculados no backend
        read_only_fields = ['lica_id', 'lica_data_lancamento', 'lica_saldo_anterior', 'lica_saldo_atual']


class FolhaPagamentoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    func_nome = serializers.CharField(source='func.func_nome', read_only=True)

    class Meta:
        model = FolhaPagamento
        fields = [
            'id', 'fopa_id', 'func', 'func_nome',
            'fopa_mes_referencia', 'fopa_ano_referencia',
            'fopa_salario_base', 'fopa_descontos', 'fopa_valor_liquido',
            'fopa_data_pagamento', 'fopa_status', 'created_at', 'updated_at',
        ]
        read_only_fields = ['fopa_id', 'fopa_valor_liquido', 'created_at', 'updated_at']

    def validate(self, data):
        # RN-FOPA-01: mês entre 1 e 12
        mes = data.get('fopa_mes_referencia', getattr(self.instance, 'fopa_mes_referencia', None))
        if mes is not None and not (1 <= mes <= 12):
            raise serializers.ValidationError(
                {'fopa_mes_referencia': 'Mês de referência deve ser entre 1 e 12.'}
            )

        # RN009: valor_liquido = salario_base - descontos
        salario_base = data.get('fopa_salario_base', getattr(self.instance, 'fopa_salario_base', Decimal('0')))
        descontos = data.get('fopa_descontos', getattr(self.instance, 'fopa_descontos', Decimal('0')))
        data['fopa_valor_liquido'] = salario_base - descontos
        return data
