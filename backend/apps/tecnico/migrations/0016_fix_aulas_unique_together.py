"""
Fix Fase 3.3 — unique_together de Aulas

Corrige de (tur, aul_data, aul_hora_inicio) para (tur, aul_data, aul_modalidade)
conforme spec: cada turma é de uma modalidade específica, max 1 aula por dia.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tecnico', '0015_alter_ministraraula_options_aulas_ministraraula_aula'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='aulas',
            unique_together={('tur', 'aul_data', 'aul_modalidade')},
        ),
    ]
