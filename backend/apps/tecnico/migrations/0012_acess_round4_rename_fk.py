"""Round 4: Renomeia exe_acessorio_fk → exe_acessorio."""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tecnico', '0011_acess_round3_remove_charfield'),
    ]

    operations = [
        migrations.RenameField(
            model_name='exercicio',
            old_name='exe_acessorio_fk',
            new_name='exe_acessorio',
        ),
    ]
