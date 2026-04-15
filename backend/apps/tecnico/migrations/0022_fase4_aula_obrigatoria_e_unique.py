"""
Fase 4 — Etapa 3:
  - FK aula em MinistrarAula se torna obrigatória (não-nullable)
  - unique_together muda de (tur, alu, miau_data, miau_hora_inicio)
    para (aula, alu)
  - ordering atualizado para -aula__aul_data

Pré-condição: todos os MinistrarAula devem ter aula preenchido
(garantido pela migration 0018 + validação manual em produção).
"""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tecnico', '0021_fase4_data_migration_hora_aulas'),
    ]

    operations = [
        # 1. Tornar aula obrigatória
        migrations.AlterField(
            model_name='ministraraula',
            name='aula',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='registros',
                to='tecnico.aulas',
                verbose_name='aula',
            ),
        ),
        # 2. Trocar unique_together
        migrations.AlterUniqueTogether(
            name='ministraraula',
            unique_together={('aula', 'alu')},
        ),
        # 3. Atualizar ordering no Meta
        migrations.AlterModelOptions(
            name='ministraraula',
            options={
                'ordering': ['-aula__aul_data'],
                'verbose_name': 'Registro de Aula',
                'verbose_name_plural': 'Registros de Aula',
            },
        ),
    ]
