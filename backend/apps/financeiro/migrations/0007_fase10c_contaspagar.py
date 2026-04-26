from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0006_fase10b_contasreceber'),
    ]

    operations = [
        # forn passa a ser nullable
        migrations.AlterField(
            model_name='contaspagar',
            name='forn',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.PROTECT,
                to='financeiro.fornecedor',
                verbose_name='fornecedor',
            ),
        ),
        # novos campos
        migrations.AddField(
            model_name='contaspagar',
            name='cpa_tipo',
            field=models.CharField(
                blank=True, null=True,
                choices=[
                    ('aluguel',   'Aluguel'),
                    ('prolabore', 'Pró-labore'),
                    ('material',  'Material/Equipamento'),
                    ('marketing', 'Marketing'),
                    ('servico',   'Serviço Terceiro'),
                    ('taxa',      'Taxa Bancária'),
                    ('outros',    'Outros'),
                ],
                max_length=20,
                verbose_name='tipo',
            ),
        ),
        migrations.AddField(
            model_name='contaspagar',
            name='plano_contas',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='contas_pagar',
                to='financeiro.planocontas',
                verbose_name='plano de contas',
            ),
        ),
        migrations.AddField(
            model_name='contaspagar',
            name='conta',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='contas_pagar',
                to='financeiro.conta',
                verbose_name='conta de saída',
            ),
        ),
        migrations.AddField(
            model_name='contaspagar',
            name='cpa_nome_credor',
            field=models.CharField(
                blank=True, null=True,
                max_length=200,
                verbose_name='nome do credor',
            ),
        ),
    ]
