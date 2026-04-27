from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0010_remove_servicoproduto_serv_tipo'),
    ]

    operations = [
        migrations.AddField(
            model_name='alunoplano',
            name='aplano_dia_vencimento',
            field=models.IntegerField(blank=True, null=True, verbose_name='dia de vencimento'),
        ),
        migrations.RemoveField(
            model_name='planospagamentos',
            name='plan_dia_vencimento',
        ),
    ]
