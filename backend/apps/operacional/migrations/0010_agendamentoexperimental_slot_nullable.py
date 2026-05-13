import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('operacional', '0009_fase13_agendamento_experimental'),
    ]

    operations = [
        migrations.AlterField(
            model_name='agendamentoexperimental',
            name='slot',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='agendamentos',
                to='operacional.slotexperimental',
            ),
        ),
    ]
