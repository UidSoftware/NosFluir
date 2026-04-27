from decimal import Decimal

from rest_framework import serializers

from .models import (
    AlunoPlano, Conta, ContasPagar, ContasReceber, FolhaPagamento,
    Fornecedor, LivroCaixa, Pedido, PedidoItem, PlanoContas,
    PlanosPagamentos, Produto, ServicoProduto,
)


class ContaSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    saldo_atual = serializers.SerializerMethodField()

    def get_saldo_atual(self, obj):
        from django.db.models import Sum
        qs = LivroCaixa.objects.filter(conta=obj, deleted_at__isnull=True)
        entradas = qs.filter(lica_tipo_lancamento='entrada').aggregate(v=Sum('lica_valor'))['v'] or Decimal('0')
        saidas   = qs.filter(lica_tipo_lancamento='saida').aggregate(v=Sum('lica_valor'))['v'] or Decimal('0')
        return float(obj.cont_saldo_inicial + entradas - saidas)

    class Meta:
        model = Conta
        fields = [
            'id', 'cont_id', 'cont_nome', 'cont_tipo',
            'cont_saldo_inicial', 'cont_ativo', 'saldo_atual',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['cont_id', 'created_at', 'updated_at']


class PlanoContasSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    plc_tipo_display = serializers.CharField(source='get_plc_tipo_display', read_only=True)

    class Meta:
        model = PlanoContas
        fields = [
            'id', 'plc_id', 'plc_codigo', 'plc_nome',
            'plc_tipo', 'plc_tipo_display', 'plc_ativo',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['plc_id', 'created_at', 'updated_at']


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
            'serv_ativo', 'created_at', 'updated_at',
        ]
        read_only_fields = ['serv_id', 'created_at', 'updated_at']


class ContasPagarSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    forn_nome         = serializers.CharField(source='forn.forn_nome_empresa', read_only=True, default=None)
    serv_nome         = serializers.CharField(source='serv.serv_nome', read_only=True, default=None)
    plano_contas_nome = serializers.CharField(source='plano_contas.plc_nome', read_only=True, default=None)
    conta_nome        = serializers.CharField(source='conta.cont_nome', read_only=True, default=None)

    class Meta:
        model = ContasPagar
        fields = [
            'id', 'pag_id',
            'forn', 'forn_nome', 'cpa_nome_credor',
            'serv', 'serv_nome',
            'plano_contas', 'plano_contas_nome',
            'conta', 'conta_nome',
            'cpa_tipo',
            'pag_data_emissao', 'pag_data_vencimento', 'pag_data_pagamento',
            'pag_descricao', 'pag_quantidade', 'pag_valor_unitario', 'pag_valor_total',
            'pag_status', 'pag_forma_pagamento', 'pag_observacoes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['pag_id', 'pag_valor_total', 'created_at', 'updated_at']

    def validate(self, data):
        # RN001: valor_total = quantidade × valor_unitario
        quantidade     = data.get('pag_quantidade',     getattr(self.instance, 'pag_quantidade',     1))
        valor_unitario = data.get('pag_valor_unitario', getattr(self.instance, 'pag_valor_unitario', Decimal('0')))
        data['pag_valor_total'] = quantidade * valor_unitario

        status = data.get('pag_status', getattr(self.instance, 'pag_status', 'pendente'))
        if data.get('pag_data_pagamento') and status != 'pago':
            raise serializers.ValidationError(
                {'pag_data_pagamento': 'Data de pagamento só pode ser preenchida quando status é "pago".'}
            )

        forn      = data.get('forn',            getattr(self.instance, 'forn',            None))
        nome_cred = data.get('cpa_nome_credor', getattr(self.instance, 'cpa_nome_credor', None))
        if not forn and not nome_cred:
            raise serializers.ValidationError(
                {'cpa_nome_credor': 'Informe o fornecedor ou o nome do credor.'}
            )
        return data


class ContasReceberSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    alu_nome          = serializers.CharField(source='alu.alu_nome', read_only=True, default=None)
    serv_nome         = serializers.CharField(source='serv.serv_nome', read_only=True, default=None)
    plano_contas_nome = serializers.CharField(source='plano_contas.plc_nome', read_only=True, default=None)
    conta_nome        = serializers.CharField(source='conta.cont_nome', read_only=True, default=None)

    class Meta:
        model = ContasReceber
        fields = [
            'id', 'rec_id',
            'alu', 'alu_nome', 'rec_nome_pagador',
            'aplano', 'serv', 'serv_nome',
            'plano_contas', 'plano_contas_nome',
            'conta', 'conta_nome',
            'rec_tipo',
            'rec_data_emissao', 'rec_data_vencimento', 'rec_data_recebimento',
            'rec_descricao', 'rec_quantidade', 'rec_valor_unitario', 'rec_desconto', 'rec_valor_total',
            'rec_status', 'rec_forma_recebimento', 'rec_plano_tipo', 'rec_observacoes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['rec_id', 'rec_valor_total', 'created_at', 'updated_at']

    TIPOS_COM_ALUNO = {'mensalidade', 'avaliacao', 'consultoria', 'personal'}

    def validate(self, data):
        # RN002: valor_total = (quantidade × valor_unitario) - desconto
        quantidade     = data.get('rec_quantidade',     getattr(self.instance, 'rec_quantidade',     1))
        valor_unitario = data.get('rec_valor_unitario', getattr(self.instance, 'rec_valor_unitario', Decimal('0')))
        desconto       = data.get('rec_desconto',       getattr(self.instance, 'rec_desconto',       Decimal('0')))
        valor_bruto = quantidade * valor_unitario

        if desconto < 0 or desconto > valor_bruto:
            raise serializers.ValidationError(
                {'rec_desconto': f'Desconto deve ser entre R$ 0,00 e R$ {valor_bruto:.2f}.'}
            )
        data['rec_valor_total'] = valor_bruto - desconto

        status = data.get('rec_status', getattr(self.instance, 'rec_status', 'pendente'))
        if data.get('rec_data_recebimento') and status != 'recebido':
            raise serializers.ValidationError(
                {'rec_data_recebimento': 'Data de recebimento só pode ser preenchida quando status é "recebido".'}
            )

        # Validação inteligente: aluno x tipo
        rec_tipo = data.get('rec_tipo', getattr(self.instance, 'rec_tipo', None))
        alu      = data.get('alu',      getattr(self.instance, 'alu',      None))
        nome_pag = data.get('rec_nome_pagador', getattr(self.instance, 'rec_nome_pagador', None))

        if rec_tipo in self.TIPOS_COM_ALUNO and not alu:
            raise serializers.ValidationError(
                {'alu': 'Aluno obrigatório para este tipo de receita.'}
            )
        if not alu and not nome_pag:
            raise serializers.ValidationError(
                {'rec_nome_pagador': 'Informe o nome do pagador quando não há aluno selecionado.'}
            )
        return data


class PlanosPagamentosSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    serv_nome = serializers.CharField(source='serv.serv_nome', read_only=True)
    total_alunos_ativos = serializers.SerializerMethodField()

    class Meta:
        model = PlanosPagamentos
        fields = [
            'id', 'plan_id', 'serv', 'serv_nome',
            'plan_tipo_plano', 'plan_valor_plano',
            'total_alunos_ativos', 'created_at', 'updated_at',
        ]
        read_only_fields = ['plan_id', 'created_at', 'updated_at']

    def get_total_alunos_ativos(self, obj):
        return obj.alunos.filter(aplano_ativo=True, deleted_at__isnull=True).count()


class AlunoPlanoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    alu_nome = serializers.CharField(source='aluno.alu_nome', read_only=True)
    plan_descricao = serializers.SerializerMethodField()
    plan_valor_plano = serializers.SerializerMethodField()

    class Meta:
        model = AlunoPlano
        fields = [
            'id', 'aplano_id', 'aluno', 'alu_nome',
            'plano', 'plan_descricao', 'plan_valor_plano',
            'aplano_dia_vencimento',
            'aplano_data_inicio', 'aplano_data_fim',
            'aplano_ativo', 'aplano_observacoes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['aplano_id', 'created_at', 'updated_at']

    def validate_aplano_dia_vencimento(self, value):
        if value is not None and not (1 <= value <= 31):
            raise serializers.ValidationError('Dia de vencimento deve ser entre 1 e 31.')
        return value

    def get_plan_descricao(self, obj):
        return f"{obj.plano.serv.serv_nome} — {obj.plano.get_plan_tipo_plano_display()}"

    def get_plan_valor_plano(self, obj):
        return obj.plano.plan_valor_plano


class LivroCaixaSerializer(serializers.ModelSerializer):
    id               = serializers.IntegerField(source='pk', read_only=True)
    conta_nome       = serializers.CharField(source='conta.cont_nome',        read_only=True, default=None)
    conta_dest_nome  = serializers.CharField(source='conta_destino.cont_nome',read_only=True, default=None)
    plano_contas_nome= serializers.CharField(source='plano_contas.plc_nome',  read_only=True, default=None)

    class Meta:
        model = LivroCaixa
        fields = [
            'id', 'lica_id', 'lica_data_lancamento', 'lica_tipo_lancamento', 'lica_historico',
            'lica_valor', 'lica_categoria', 'lica_origem_tipo', 'lica_origem_id',
            'lica_saldo_anterior', 'lica_saldo_atual', 'lica_forma_pagamento',
            'conta', 'conta_nome', 'conta_destino', 'conta_dest_nome',
            'plano_contas', 'plano_contas_nome',
            'lcx_tipo_movimento', 'lcx_competencia', 'lcx_documento',
        ]
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


class ProdutoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    estoque_baixo = serializers.SerializerMethodField()

    class Meta:
        model = Produto
        fields = ['id', 'prod_id', 'prod_nome', 'prod_descricao', 'prod_valor_venda',
                  'prod_estoque_atual', 'prod_estoque_minimo', 'prod_ativo',
                  'estoque_baixo', 'created_at', 'updated_at']
        read_only_fields = ['prod_id', 'created_at', 'updated_at']

    def get_estoque_baixo(self, obj):
        return obj.prod_estoque_atual <= obj.prod_estoque_minimo


class PedidoItemSerializer(serializers.ModelSerializer):
    id        = serializers.IntegerField(source='pk', read_only=True)
    prod_nome = serializers.CharField(source='prod.prod_nome', read_only=True, default=None)
    serv_nome = serializers.CharField(source='serv.serv_nome', read_only=True, default=None)

    class Meta:
        model = PedidoItem
        fields = ['id', 'item_id', 'item_tipo', 'prod', 'prod_nome', 'serv', 'serv_nome', 'aplano',
                  'item_descricao', 'item_quantidade', 'item_valor_unitario', 'item_valor_total']
        read_only_fields = ['item_id', 'item_valor_total']

    def validate(self, data):
        qtd = data.get('item_quantidade', getattr(self.instance, 'item_quantidade', 1))
        val = data.get('item_valor_unitario', getattr(self.instance, 'item_valor_unitario', Decimal('0')))
        data['item_valor_total'] = qtd * val
        return data


class PedidoSerializer(serializers.ModelSerializer):
    id         = serializers.IntegerField(source='pk', read_only=True)
    alu_nome   = serializers.CharField(source='alu.alu_nome',   read_only=True, default=None)
    conta_nome = serializers.CharField(source='conta.cont_nome',read_only=True, default=None)
    itens      = PedidoItemSerializer(many=True, required=False)

    class Meta:
        model = Pedido
        fields = ['id', 'ped_id', 'ped_numero', 'alu', 'alu_nome', 'ped_nome_cliente',
                  'ped_data', 'ped_total', 'ped_forma_pagamento', 'ped_status',
                  'ped_pagamento_futuro', 'conta', 'conta_nome', 'ped_observacoes',
                  'itens', 'created_at', 'updated_at']
        read_only_fields = ['ped_id', 'ped_numero', 'ped_total', 'created_at', 'updated_at']

    def _save_itens(self, pedido, itens_data):
        total = Decimal('0.00')
        for item_data in itens_data:
            item_data['pedido'] = pedido
            PedidoItem.objects.create(**item_data)
            total += item_data['item_valor_total']
        pedido.ped_total = total
        pedido.save(update_fields=['ped_total'])

    def create(self, validated_data):
        itens_data = validated_data.pop('itens', [])
        pedido = Pedido.objects.create(**validated_data)
        self._save_itens(pedido, itens_data)
        return pedido

    def update(self, instance, validated_data):
        itens_data = validated_data.pop('itens', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if itens_data is not None:
            instance.itens.all().delete()
            self._save_itens(instance, itens_data)
        return instance
