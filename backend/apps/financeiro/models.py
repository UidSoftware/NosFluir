from django.db import models

from apps.core.mixins import BaseModel


class Conta(BaseModel):
    """Conta bancária ou caixa físico do Studio Fluir."""
    TIPO_CHOICES = [
        ('corrente',  'Conta Corrente'),
        ('poupanca',  'Poupança'),
        ('caixa',     'Caixa Físico'),
    ]

    cont_id            = models.AutoField(primary_key=True)
    cont_nome          = models.CharField('nome', max_length=100)
    cont_tipo          = models.CharField('tipo', max_length=20, choices=TIPO_CHOICES)
    cont_saldo_inicial = models.DecimalField('saldo inicial', max_digits=10, decimal_places=2, default=0)
    cont_ativo         = models.BooleanField('ativo', default=True)

    class Meta:
        db_table = 'conta'
        verbose_name = 'Conta'
        verbose_name_plural = 'Contas'
        ordering = ['cont_nome']

    def __str__(self):
        return f"{self.cont_nome} ({self.get_cont_tipo_display()})"


class PlanoContas(BaseModel):
    """Classificação contábil dos lançamentos financeiros."""
    TIPO_CHOICES = [
        ('receita_operacional',     'Receita Operacional'),
        ('receita_nao_operacional', 'Receita Não Operacional'),
        ('despesa_operacional',     'Despesa Operacional'),
        ('despesa_nao_operacional', 'Despesa Não Operacional'),
        ('transferencia',           'Transferência'),
    ]

    plc_id     = models.AutoField(primary_key=True)
    plc_codigo = models.CharField('código', max_length=20, unique=True)
    plc_nome   = models.CharField('nome', max_length=100)
    plc_tipo   = models.CharField('tipo', max_length=30, choices=TIPO_CHOICES)
    plc_ativo  = models.BooleanField('ativo', default=True)

    class Meta:
        db_table = 'plano_contas'
        verbose_name = 'Plano de Contas'
        verbose_name_plural = 'Plano de Contas'
        ordering = ['plc_codigo']

    def __str__(self):
        return f"{self.plc_codigo} — {self.plc_nome}"


class Fornecedor(BaseModel):
    """Cadastro de fornecedores de produtos e serviços."""
    forn_id = models.AutoField(primary_key=True)
    forn_nome_empresa = models.CharField('razão social / nome fantasia', max_length=200)
    forn_nome_dono = models.CharField('nome do responsável', max_length=150, null=True, blank=True)
    forn_cnpj = models.CharField('CNPJ', max_length=18, unique=True, null=True, blank=True)
    forn_endereco = models.CharField('endereço', max_length=300, null=True, blank=True)
    forn_telefone = models.CharField('telefone', max_length=20, null=True, blank=True)
    forn_email = models.EmailField('e-mail', max_length=150, null=True, blank=True)
    forn_ativo = models.BooleanField('ativo', default=True)

    class Meta:
        db_table = 'fornecedor'
        verbose_name = 'Fornecedor'
        verbose_name_plural = 'Fornecedores'
        ordering = ['forn_nome_empresa']

    def __str__(self):
        return self.forn_nome_empresa


class ServicoProduto(BaseModel):
    """Catálogo de serviços e produtos do Studio Fluir."""
    TIPO_CHOICES = [
        ('servico', 'Serviço'),
        ('produto', 'Produto'),
    ]

    serv_id = models.AutoField(primary_key=True)
    serv_nome = models.CharField('nome', max_length=125)
    serv_descricao = models.TextField('descrição', null=True, blank=True)
    serv_valor_base = models.DecimalField('valor base', max_digits=10, decimal_places=2)
    serv_tipo = models.CharField('tipo', max_length=20, choices=TIPO_CHOICES)
    serv_ativo = models.BooleanField('ativo', default=True)

    class Meta:
        db_table = 'servico_produto'
        verbose_name = 'Serviço / Produto'
        verbose_name_plural = 'Serviços / Produtos'
        ordering = ['serv_nome']

    def __str__(self):
        return f'{self.serv_nome} ({self.get_serv_tipo_display()})'


class ContasPagar(BaseModel):
    """Controle de contas a pagar (despesas)."""
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('pago', 'Pago'),
        ('vencido', 'Vencido'),
        ('cancelado', 'Cancelado'),
    ]

    pag_id = models.AutoField(primary_key=True)
    forn = models.ForeignKey(Fornecedor, on_delete=models.PROTECT, verbose_name='fornecedor')
    serv = models.ForeignKey(
        ServicoProduto, on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='serviço/produto'
    )
    pag_data_emissao = models.DateTimeField('data de emissão')
    pag_data_vencimento = models.DateTimeField('data de vencimento')
    pag_data_pagamento = models.DateTimeField('data de pagamento', null=True, blank=True)
    pag_descricao = models.CharField('descrição', max_length=300)
    pag_quantidade = models.IntegerField('quantidade', default=1)
    pag_valor_unitario = models.DecimalField('valor unitário', max_digits=10, decimal_places=2)
    # RN001: valor_total = quantidade × valor_unitario (sem desconto)
    pag_valor_total = models.DecimalField('valor total', max_digits=10, decimal_places=2)
    pag_status = models.CharField('status', max_length=20, choices=STATUS_CHOICES, default='pendente')
    pag_forma_pagamento = models.CharField('forma de pagamento', max_length=50, null=True, blank=True)
    pag_observacoes = models.TextField('observações', null=True, blank=True)

    class Meta:
        db_table = 'contas_pagar'
        verbose_name = 'Conta a Pagar'
        verbose_name_plural = 'Contas a Pagar'
        ordering = ['pag_data_vencimento']

    def __str__(self):
        return f'{self.pag_descricao} — R$ {self.pag_valor_total}'


class ContasReceber(BaseModel):
    """Controle de contas a receber (receitas)."""
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('recebido', 'Recebido'),
        ('vencido', 'Vencido'),
        ('cancelado', 'Cancelado'),
    ]
    PLANO_TIPO_CHOICES = [
        ('mensal', 'Mensal'),
        ('trimestral', 'Trimestral'),
        ('semestral', 'Semestral'),
    ]
    TIPO_CHOICES = [
        ('mensalidade',  'Mensalidade'),
        ('avaliacao',    'Avaliação Física'),
        ('consultoria',  'Consultoria Online'),
        ('personal',     'Personal'),
        ('produto',      'Venda de Produto'),
        ('rendimento',   'Rendimento'),
        ('outros',       'Outros'),
    ]

    rec_id = models.AutoField(primary_key=True)
    alu = models.ForeignKey(
        'operacional.Aluno', on_delete=models.PROTECT,
        null=True, blank=True, verbose_name='aluno'
    )
    aplano = models.ForeignKey(
        'AlunoPlano', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='cobranças', verbose_name='plano do aluno'
    )
    serv = models.ForeignKey(
        ServicoProduto, on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='serviço/produto'
    )
    plano_contas = models.ForeignKey(
        'PlanoContas', on_delete=models.PROTECT,
        null=True, blank=True, related_name='contas_receber', verbose_name='plano de contas'
    )
    conta = models.ForeignKey(
        'Conta', on_delete=models.PROTECT,
        null=True, blank=True, related_name='contas_receber', verbose_name='conta de destino'
    )
    rec_tipo = models.CharField('tipo', max_length=20, choices=TIPO_CHOICES, null=True, blank=True)
    rec_nome_pagador = models.CharField('nome do pagador', max_length=200, null=True, blank=True)
    rec_data_emissao = models.DateTimeField('data de emissão')
    rec_data_vencimento = models.DateTimeField('data de vencimento')
    rec_data_recebimento = models.DateTimeField('data de recebimento', null=True, blank=True)
    rec_descricao = models.CharField('descrição', max_length=300)
    rec_quantidade = models.IntegerField('quantidade', default=1)
    rec_valor_unitario = models.DecimalField('valor unitário', max_digits=10, decimal_places=2)
    rec_desconto = models.DecimalField('desconto', max_digits=10, decimal_places=2, default=0)
    # RN002: valor_total = (quantidade × valor_unitario) - desconto
    rec_valor_total = models.DecimalField('valor total', max_digits=10, decimal_places=2)
    rec_status = models.CharField('status', max_length=20, choices=STATUS_CHOICES, default='pendente')
    rec_forma_recebimento = models.CharField('forma de recebimento', max_length=50, null=True, blank=True)
    rec_plano_tipo = models.CharField(
        'tipo de plano', max_length=20, choices=PLANO_TIPO_CHOICES, null=True, blank=True
    )
    rec_observacoes = models.TextField('observações', null=True, blank=True)

    class Meta:
        db_table = 'contas_receber'
        verbose_name = 'Conta a Receber'
        verbose_name_plural = 'Contas a Receber'
        ordering = ['rec_data_vencimento']

    def __str__(self):
        return f'{self.rec_descricao} — R$ {self.rec_valor_total}'


class PlanosPagamentos(BaseModel):
    """Template de plano — catálogo de planos disponíveis. Fase 9."""
    TIPO_PLANO_CHOICES = [
        ('mensal', 'Mensal'),
        ('trimestral', 'Trimestral'),
        ('semestral', 'Semestral'),
    ]

    plan_id = models.AutoField(primary_key=True)
    serv = models.ForeignKey(ServicoProduto, on_delete=models.PROTECT, verbose_name='serviço')
    plan_tipo_plano = models.CharField('tipo do plano', max_length=20, choices=TIPO_PLANO_CHOICES)
    plan_valor_plano = models.DecimalField('valor mensal', max_digits=10, decimal_places=2)
    plan_dia_vencimento = models.IntegerField('dia de vencimento')

    class Meta:
        db_table = 'planos_pagamentos'
        verbose_name = 'Plano de Pagamento'
        verbose_name_plural = 'Planos de Pagamento'
        ordering = ['serv__serv_nome', 'plan_tipo_plano']

    def __str__(self):
        return f'{self.serv.serv_nome} — {self.get_plan_tipo_plano_display()}'


class AlunoPlano(BaseModel):
    """Contrato individual: aluno vinculado a um plano. Fase 9."""
    aplano_id = models.AutoField(primary_key=True)
    aluno = models.ForeignKey(
        'operacional.Aluno', on_delete=models.PROTECT,
        related_name='planos', verbose_name='aluno'
    )
    plano = models.ForeignKey(
        PlanosPagamentos, on_delete=models.PROTECT,
        related_name='alunos', verbose_name='plano'
    )
    aplano_data_inicio   = models.DateField('data de início')
    aplano_data_fim      = models.DateField('data de término', null=True, blank=True)
    aplano_ativo         = models.BooleanField('ativo', default=True)
    aplano_observacoes   = models.TextField('observações', null=True, blank=True)

    class Meta:
        db_table = 'aluno_plano'
        verbose_name = 'Plano do Aluno'
        verbose_name_plural = 'Planos dos Alunos'
        ordering = ['-aplano_data_inicio']

    def __str__(self):
        return f"{self.aluno} — {self.plano} ({'ativo' if self.aplano_ativo else 'inativo'})"


class LivroCaixa(BaseModel):
    """
    Registro imutável de todos os lançamentos financeiros.
    NUNCA editar ou deletar — correções via estorno.
    Implementado via ReadCreateViewSet no Django.
    """
    TIPO_CHOICES = [
        ('entrada', 'Entrada'),
        ('saida', 'Saída'),
    ]
    ORIGEM_TIPO_CHOICES = [
        ('contas_pagar', 'Contas a Pagar'),
        ('contas_receber', 'Contas a Receber'),
        ('folha_pagamento', 'Folha de Pagamento'),
        ('manual', 'Manual'),
    ]

    lica_id = models.AutoField(primary_key=True)
    lica_data_lancamento = models.DateTimeField('data do lançamento', auto_now_add=True)
    lica_tipo_lancamento = models.CharField('tipo', max_length=20, choices=TIPO_CHOICES)
    lica_historico = models.CharField('histórico', max_length=300)
    lica_valor = models.DecimalField('valor', max_digits=10, decimal_places=2)
    lica_categoria = models.CharField('categoria', max_length=100, null=True, blank=True)
    lica_origem_tipo = models.CharField(
        'origem', max_length=20, choices=ORIGEM_TIPO_CHOICES, null=True, blank=True
    )
    # IntegerField polimórfico — armazena o ID da origem (ContasPagar, ContasReceber ou FolhaPagamento)
    lica_origem_id = models.IntegerField('ID de origem', null=True, blank=True)
    lica_saldo_anterior = models.DecimalField('saldo anterior', max_digits=10, decimal_places=2)
    lica_saldo_atual = models.DecimalField('saldo atual', max_digits=10, decimal_places=2)
    lica_forma_pagamento = models.CharField('forma de pagamento', max_length=50, null=True, blank=True)

    class Meta:
        db_table = 'livro_caixa'
        verbose_name = 'Livro Caixa'
        verbose_name_plural = 'Livro Caixa'
        ordering = ['-lica_id']

    def __str__(self):
        return f'{self.get_lica_tipo_lancamento_display()} R$ {self.lica_valor} — {self.lica_historico}'


class FolhaPagamento(BaseModel):
    """Controle da folha de pagamento dos funcionários."""
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('pago', 'Pago'),
        ('cancelado', 'Cancelado'),
    ]

    fopa_id = models.AutoField(primary_key=True)
    func = models.ForeignKey(
        'operacional.Funcionario', on_delete=models.PROTECT, verbose_name='funcionário'
    )
    fopa_mes_referencia = models.IntegerField('mês de referência')
    fopa_ano_referencia = models.IntegerField('ano de referência')
    fopa_salario_base = models.DecimalField('salário base', max_digits=10, decimal_places=2)
    fopa_descontos = models.DecimalField('descontos', max_digits=10, decimal_places=2, default=0)
    # RN009: valor_liquido = salario_base - descontos
    fopa_valor_liquido = models.DecimalField('valor líquido', max_digits=10, decimal_places=2)
    fopa_data_pagamento = models.DateField('data de pagamento', null=True, blank=True)
    fopa_status = models.CharField('status', max_length=20, choices=STATUS_CHOICES, default='pendente')

    class Meta:
        db_table = 'folha_pagamento'
        verbose_name = 'Folha de Pagamento'
        verbose_name_plural = 'Folhas de Pagamento'
        # RN008: único por funcionário + mês + ano
        unique_together = [['func', 'fopa_mes_referencia', 'fopa_ano_referencia']]
        ordering = ['-fopa_ano_referencia', '-fopa_mes_referencia']

    def __str__(self):
        return f'{self.func} — {self.fopa_mes_referencia:02d}/{self.fopa_ano_referencia}'
