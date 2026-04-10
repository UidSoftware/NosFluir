"""
Round 4 Fase 3.1 — Renomeia exe_aparelho_fk → exe_aparelho no model Exercicio.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tecnico', '0005_phase31_round3_remocoes'),
    ]

    operations = [
        migrations.RenameField(
            model_name='exercicio',
            old_name='exe_aparelho_fk',
            new_name='exe_aparelho',
        ),
    ]
