from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0009_fase10e_pedidos'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='servicoproduto',
            name='serv_tipo',
        ),
    ]
