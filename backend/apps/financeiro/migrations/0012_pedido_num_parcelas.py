from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0011_dia_vencimento_para_alunoplano'),
    ]

    operations = [
        migrations.AddField(
            model_name='pedido',
            name='ped_num_parcelas',
            field=models.IntegerField(default=1, verbose_name='número de parcelas'),
        ),
    ]
