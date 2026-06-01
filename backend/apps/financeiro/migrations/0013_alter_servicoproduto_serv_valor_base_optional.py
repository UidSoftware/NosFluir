from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0012_pedido_num_parcelas'),
    ]

    operations = [
        migrations.AlterField(
            model_name='servicoproduto',
            name='serv_valor_base',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='valor base'),
        ),
    ]
