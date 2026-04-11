"""
Remove aul_hora_inicio e aul_hora_final da tabela Aulas.
Campos não constam na spec Fase 3.3 — removidos para seguir spec à risca.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tecnico', '0016_fix_aulas_unique_together'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='aulas',
            name='aul_hora_inicio',
        ),
        migrations.RemoveField(
            model_name='aulas',
            name='aul_hora_final',
        ),
    ]
