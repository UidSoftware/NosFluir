from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0008_fase10d_livrocaixa'),
        ('operacional', '0008_aluno_alu_ativo'),
    ]

    operations = [
        migrations.CreateModel(
            name='Produto',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='+', to='usuarios.user')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='+', to='usuarios.user')),
                ('deleted_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='+', to='usuarios.user')),
                ('prod_id',             models.AutoField(primary_key=True, serialize=False)),
                ('prod_nome',           models.CharField(max_length=200, verbose_name='nome')),
                ('prod_descricao',      models.TextField(blank=True, null=True, verbose_name='descrição')),
                ('prod_valor_venda',    models.DecimalField(decimal_places=2, max_digits=10, verbose_name='valor de venda')),
                ('prod_estoque_atual',  models.IntegerField(default=0, verbose_name='estoque atual')),
                ('prod_estoque_minimo', models.IntegerField(default=5, verbose_name='estoque mínimo')),
                ('prod_ativo',          models.BooleanField(default=True, verbose_name='ativo')),
            ],
            options={'verbose_name': 'Produto', 'verbose_name_plural': 'Produtos', 'db_table': 'produto', 'ordering': ['prod_nome']},
        ),
        migrations.CreateModel(
            name='Pedido',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='+', to='usuarios.user')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='+', to='usuarios.user')),
                ('deleted_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='+', to='usuarios.user')),
                ('ped_id',               models.AutoField(primary_key=True, serialize=False)),
                ('alu',  models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='pedidos', to='operacional.aluno', verbose_name='aluno')),
                ('conta',models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='financeiro.conta', verbose_name='conta')),
                ('ped_nome_cliente',     models.CharField(blank=True, max_length=200, null=True, verbose_name='nome do cliente')),
                ('ped_numero',           models.CharField(max_length=20, unique=True, verbose_name='número')),
                ('ped_data',             models.DateField(verbose_name='data')),
                ('ped_total',            models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='total')),
                ('ped_forma_pagamento',  models.CharField(blank=True, choices=[('pix','PIX'),('dinheiro','Dinheiro'),('cartao','Cartão'),('boleto','Boleto')], max_length=20, null=True, verbose_name='forma de pagamento')),
                ('ped_status',           models.CharField(choices=[('pendente','Pendente'),('pago','Pago'),('cancelado','Cancelado')], default='pendente', max_length=20, verbose_name='status')),
                ('ped_pagamento_futuro', models.BooleanField(default=False, verbose_name='pagamento futuro')),
                ('ped_observacoes',      models.TextField(blank=True, null=True, verbose_name='observações')),
            ],
            options={'verbose_name': 'Pedido', 'verbose_name_plural': 'Pedidos', 'db_table': 'pedido', 'ordering': ['-ped_data', '-ped_numero']},
        ),
        migrations.CreateModel(
            name='PedidoItem',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='+', to='usuarios.user')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='+', to='usuarios.user')),
                ('deleted_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='+', to='usuarios.user')),
                ('item_id',             models.AutoField(primary_key=True, serialize=False)),
                ('pedido',  models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='itens', to='financeiro.pedido')),
                ('prod',    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='financeiro.produto')),
                ('serv',    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='financeiro.servicoproduto')),
                ('aplano',  models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='financeiro.alunoplano')),
                ('item_tipo',           models.CharField(choices=[('produto','Produto'),('servico','Serviço'),('plano','Plano')], max_length=20, verbose_name='tipo')),
                ('item_descricao',      models.CharField(max_length=200, verbose_name='descrição')),
                ('item_quantidade',     models.IntegerField(default=1, verbose_name='quantidade')),
                ('item_valor_unitario', models.DecimalField(decimal_places=2, max_digits=10, verbose_name='valor unitário')),
                ('item_valor_total',    models.DecimalField(decimal_places=2, max_digits=10, verbose_name='valor total')),
            ],
            options={'verbose_name': 'Item do Pedido', 'verbose_name_plural': 'Itens do Pedido', 'db_table': 'pedido_item'},
        ),
    ]
