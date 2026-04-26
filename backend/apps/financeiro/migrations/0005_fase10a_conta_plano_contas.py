from django.db import migrations, models


CONTAS_INICIAIS = [
    ('Conta Corrente Mercado Pago', 'corrente'),
    ('Poupança Mercado Pago',        'poupanca'),
    ('Caixa Físico',                 'caixa'),
]

PLANO_CONTAS_INICIAL = [
    ('1.1.1', 'Mensalidades',             'receita_operacional'),
    ('1.1.2', 'Avaliações Físicas',       'receita_operacional'),
    ('1.1.3', 'Consultoria Online',       'receita_operacional'),
    ('1.1.4', 'Personal',                 'receita_operacional'),
    ('1.1.5', 'Venda de Produtos',        'receita_operacional'),
    ('1.2.1', 'Rendimento Poupança',      'receita_nao_operacional'),
    ('1.2.2', 'Outros Recebimentos',      'receita_nao_operacional'),
    ('2.1.1', 'Aluguel',                  'despesa_operacional'),
    ('2.1.2', 'Pró-labore',               'despesa_operacional'),
    ('2.1.3', 'Material/Equipamento',     'despesa_operacional'),
    ('2.1.4', 'Marketing',                'despesa_operacional'),
    ('2.1.5', 'Serviços Terceiros',       'despesa_operacional'),
    ('2.2.1', 'Taxas Bancárias',          'despesa_nao_operacional'),
    ('2.2.2', 'Multas',                   'despesa_nao_operacional'),
    ('2.2.3', 'Outros',                   'despesa_nao_operacional'),
    ('3.1.1', 'Transferência Entre Contas', 'transferencia'),
]


def criar_dados_iniciais(apps, schema_editor):
    Conta = apps.get_model('financeiro', 'Conta')
    PlanoContas = apps.get_model('financeiro', 'PlanoContas')

    for nome, tipo in CONTAS_INICIAIS:
        Conta.objects.get_or_create(cont_nome=nome, defaults={'cont_tipo': tipo})

    for codigo, nome, tipo in PLANO_CONTAS_INICIAL:
        PlanoContas.objects.get_or_create(plc_codigo=codigo, defaults={'plc_nome': nome, 'plc_tipo': tipo})


def remover_dados_iniciais(apps, schema_editor):
    Conta = apps.get_model('financeiro', 'Conta')
    PlanoContas = apps.get_model('financeiro', 'PlanoContas')
    Conta.objects.filter(cont_nome__in=[n for n, _ in CONTAS_INICIAIS]).delete()
    PlanoContas.objects.filter(plc_codigo__in=[c for c, _, _ in PLANO_CONTAS_INICIAL]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0004_fase9_cleanup_planospagamentos'),
    ]

    operations = [
        migrations.CreateModel(
            name='Conta',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='+', to='usuarios.user')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='+', to='usuarios.user')),
                ('deleted_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='+', to='usuarios.user')),
                ('cont_id',            models.AutoField(primary_key=True, serialize=False)),
                ('cont_nome',          models.CharField(max_length=100, verbose_name='nome')),
                ('cont_tipo',          models.CharField(choices=[('corrente', 'Conta Corrente'), ('poupanca', 'Poupança'), ('caixa', 'Caixa Físico')], max_length=20, verbose_name='tipo')),
                ('cont_saldo_inicial', models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='saldo inicial')),
                ('cont_ativo',         models.BooleanField(default=True, verbose_name='ativo')),
            ],
            options={
                'verbose_name': 'Conta',
                'verbose_name_plural': 'Contas',
                'db_table': 'conta',
                'ordering': ['cont_nome'],
            },
        ),
        migrations.CreateModel(
            name='PlanoContas',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='+', to='usuarios.user')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='+', to='usuarios.user')),
                ('deleted_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='+', to='usuarios.user')),
                ('plc_id',     models.AutoField(primary_key=True, serialize=False)),
                ('plc_codigo', models.CharField(max_length=20, unique=True, verbose_name='código')),
                ('plc_nome',   models.CharField(max_length=100, verbose_name='nome')),
                ('plc_tipo',   models.CharField(choices=[('receita_operacional', 'Receita Operacional'), ('receita_nao_operacional', 'Receita Não Operacional'), ('despesa_operacional', 'Despesa Operacional'), ('despesa_nao_operacional', 'Despesa Não Operacional'), ('transferencia', 'Transferência')], max_length=30, verbose_name='tipo')),
                ('plc_ativo',  models.BooleanField(default=True, verbose_name='ativo')),
            ],
            options={
                'verbose_name': 'Plano de Contas',
                'verbose_name_plural': 'Plano de Contas',
                'db_table': 'plano_contas',
                'ordering': ['plc_codigo'],
            },
        ),
        migrations.RunPython(criar_dados_iniciais, remover_dados_iniciais),
    ]
