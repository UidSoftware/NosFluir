"""
Fase 3.2 — Renomear Aula → MinistrarAula

Operações:
- RenameModel: Aula → MinistrarAula (tabela aulas → ministrar_aula)
- RenameField: prefixo aul_ → miau_ em todos os campos
- AddField: miau_pas_inicio, miau_pad_inicio, miau_pas_final, miau_pad_final (int)
- AddField: miau_fc_inicio, miau_fc_final (int)
- AddField: miau_observacoes (texto)
- RunPython: migrar pressão string → PAS/PAD int; 'regular' → 'presente'
- RemoveField: aul_pressao_inicio, aul_pressao_final (strings)
- AlterField: miau_pse validação Borg 6-20
- AlterUniqueTogether: campos renomeados
"""

import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def migrar_pressao_e_presenca(apps, schema_editor):
    """
    Migra dados de pressão arterial (string '120/80') para PAS e PAD inteiros.
    Converte tipo_presenca 'regular' → 'presente'.
    """
    MinistrarAula = apps.get_model('tecnico', 'MinistrarAula')
    for miau in MinistrarAula.objects.order_by():
        changed = False

        # Migrar pressão início
        if miau.aul_pressao_inicio:
            try:
                parts = miau.aul_pressao_inicio.split('/')
                if len(parts) == 2:
                    miau.miau_pas_inicio = int(parts[0])
                    miau.miau_pad_inicio = int(parts[1])
                    changed = True
            except (ValueError, AttributeError):
                pass

        # Migrar pressão final
        if miau.aul_pressao_final:
            try:
                parts = miau.aul_pressao_final.split('/')
                if len(parts) == 2:
                    miau.miau_pas_final = int(parts[0])
                    miau.miau_pad_final = int(parts[1])
                    changed = True
            except (ValueError, AttributeError):
                pass

        # Migrar tipo presença: 'regular' → 'presente'
        if miau.miau_tipo_presenca == 'regular':
            miau.miau_tipo_presenca = 'presente'
            changed = True

        if changed:
            miau.save()


class Migration(migrations.Migration):

    dependencies = [
        ('tecnico', '0013_alter_acessorio_created_at_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1. Remover unique_together antigo (referencia campos com nome antigo)
        migrations.AlterUniqueTogether(
            name='aula',
            unique_together=set(),
        ),

        # 2. Renomear model (atualiza estado Django + renomeia FK constraints)
        migrations.RenameModel(
            old_name='Aula',
            new_name='MinistrarAula',
        ),

        # 2b. Renomear tabela DB de 'aulas' para 'ministrar_aula'
        # (necessário pois RenameModel não renomeia quando db_table é customizado)
        migrations.AlterModelTable(
            name='ministraraula',
            table='ministrar_aula',
        ),

        # 3. Renomear PK
        migrations.RenameField(
            model_name='ministraraula',
            old_name='aul_id',
            new_name='miau_id',
        ),

        # 4. Renomear campos aul_ → miau_
        migrations.RenameField(
            model_name='ministraraula',
            old_name='aul_data',
            new_name='miau_data',
        ),
        migrations.RenameField(
            model_name='ministraraula',
            old_name='aul_hora_inicio',
            new_name='miau_hora_inicio',
        ),
        migrations.RenameField(
            model_name='ministraraula',
            old_name='aul_hora_final',
            new_name='miau_hora_final',
        ),
        migrations.RenameField(
            model_name='ministraraula',
            old_name='aul_tipo_presenca',
            new_name='miau_tipo_presenca',
        ),
        migrations.RenameField(
            model_name='ministraraula',
            old_name='aul_tipo_falta',
            new_name='miau_tipo_falta',
        ),
        migrations.RenameField(
            model_name='ministraraula',
            old_name='aul_intensidade_esforco',
            new_name='miau_pse',
        ),

        # 5. Adicionar novos campos PAS/PAD (nullable para permitir migração)
        migrations.AddField(
            model_name='ministraraula',
            name='miau_pas_inicio',
            field=models.IntegerField(blank=True, null=True, verbose_name='PAS inicial (mmHg)'),
        ),
        migrations.AddField(
            model_name='ministraraula',
            name='miau_pad_inicio',
            field=models.IntegerField(blank=True, null=True, verbose_name='PAD inicial (mmHg)'),
        ),
        migrations.AddField(
            model_name='ministraraula',
            name='miau_pas_final',
            field=models.IntegerField(blank=True, null=True, verbose_name='PAS final (mmHg)'),
        ),
        migrations.AddField(
            model_name='ministraraula',
            name='miau_pad_final',
            field=models.IntegerField(blank=True, null=True, verbose_name='PAD final (mmHg)'),
        ),

        # 6. Adicionar campos FC
        migrations.AddField(
            model_name='ministraraula',
            name='miau_fc_inicio',
            field=models.IntegerField(blank=True, null=True, verbose_name='FC inicial (bpm)'),
        ),
        migrations.AddField(
            model_name='ministraraula',
            name='miau_fc_final',
            field=models.IntegerField(blank=True, null=True, verbose_name='FC final (bpm)'),
        ),

        # 7. Adicionar campo observações
        migrations.AddField(
            model_name='ministraraula',
            name='miau_observacoes',
            field=models.TextField(blank=True, null=True, verbose_name='observações'),
        ),

        # 8. Migrar dados: pressão string → PAS/PAD int; 'regular' → 'presente'
        migrations.RunPython(
            migrar_pressao_e_presenca,
            reverse_code=migrations.RunPython.noop,
        ),

        # 9. Remover campos de pressão string
        migrations.RemoveField(
            model_name='ministraraula',
            name='aul_pressao_inicio',
        ),
        migrations.RemoveField(
            model_name='ministraraula',
            name='aul_pressao_final',
        ),

        # 10. Atualizar miau_pse: validadores Borg 6-20
        migrations.AlterField(
            model_name='ministraraula',
            name='miau_pse',
            field=models.IntegerField(
                blank=True, null=True,
                verbose_name='PSE — Escala de Borg (6–20)',
                validators=[
                    django.core.validators.MinValueValidator(6),
                    django.core.validators.MaxValueValidator(20),
                ],
            ),
        ),

        # 11. Atualizar choices de miau_tipo_presenca (inclui 'presente' em vez de 'regular')
        migrations.AlterField(
            model_name='ministraraula',
            name='miau_tipo_presenca',
            field=models.CharField(
                choices=[('presente', 'Presente'), ('falta', 'Falta'), ('reposicao', 'Reposição')],
                default='presente',
                max_length=20,
                verbose_name='tipo de presença',
            ),
        ),

        # 12. Restaurar unique_together com novos nomes de campos
        migrations.AlterUniqueTogether(
            name='ministraraula',
            unique_together={('tur', 'alu', 'miau_data', 'miau_hora_inicio')},
        ),
    ]
