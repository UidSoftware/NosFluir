from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0005_fase10a_conta_plano_contas'),
        ('operacional', '0008_aluno_alu_ativo'),
    ]

    operations = [
        # alu passa a ser nullable
        migrations.AlterField(
            model_name='contasreceber',
            name='alu',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.PROTECT,
                to='operacional.aluno',
                verbose_name='aluno',
            ),
        ),
        # novos campos
        migrations.AddField(
            model_name='contasreceber',
            name='rec_tipo',
            field=models.CharField(
                blank=True, null=True,
                choices=[
                    ('mensalidade', 'Mensalidade'),
                    ('avaliacao', 'Avaliação Física'),
                    ('consultoria', 'Consultoria Online'),
                    ('personal', 'Personal'),
                    ('produto', 'Venda de Produto'),
                    ('rendimento', 'Rendimento'),
                    ('outros', 'Outros'),
                ],
                max_length=20,
                verbose_name='tipo',
            ),
        ),
        migrations.AddField(
            model_name='contasreceber',
            name='plano_contas',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='contas_receber',
                to='financeiro.planocontas',
                verbose_name='plano de contas',
            ),
        ),
        migrations.AddField(
            model_name='contasreceber',
            name='conta',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='contas_receber',
                to='financeiro.conta',
                verbose_name='conta de destino',
            ),
        ),
        migrations.AddField(
            model_name='contasreceber',
            name='rec_nome_pagador',
            field=models.CharField(
                blank=True, null=True,
                max_length=200,
                verbose_name='nome do pagador',
            ),
        ),
    ]
