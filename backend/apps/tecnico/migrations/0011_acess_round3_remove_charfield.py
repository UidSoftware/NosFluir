"""Round 3: Remove o CharField exe_acessorio original."""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tecnico', '0010_acess_round2_data'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='exercicio',
            name='exe_acessorio',
        ),
    ]
