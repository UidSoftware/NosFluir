from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0007_fase10c_contaspagar'),
    ]

    operations = [
        migrations.AddField(
            model_name='livrocaixa',
            name='conta',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='lancamentos',
                to='financeiro.conta',
                verbose_name='conta',
            ),
        ),
        migrations.AddField(
            model_name='livrocaixa',
            name='conta_destino',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='lancamentos_destino',
                to='financeiro.conta',
                verbose_name='conta destino',
            ),
        ),
        migrations.AddField(
            model_name='livrocaixa',
            name='plano_contas',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='lancamentos',
                to='financeiro.planocontas',
                verbose_name='plano de contas',
            ),
        ),
        migrations.AddField(
            model_name='livrocaixa',
            name='lcx_tipo_movimento',
            field=models.CharField(
                blank=True, null=True,
                choices=[
                    ('entrada', 'Entrada'),
                    ('saida', 'Saída'),
                    ('transferencia', 'Transferência'),
                ],
                max_length=20,
                verbose_name='tipo de movimento',
            ),
        ),
        migrations.AddField(
            model_name='livrocaixa',
            name='lcx_competencia',
            field=models.DateField(blank=True, null=True, verbose_name='data de competência'),
        ),
        migrations.AddField(
            model_name='livrocaixa',
            name='lcx_documento',
            field=models.CharField(blank=True, null=True, max_length=100, verbose_name='documento/comprovante'),
        ),
    ]
