"""
Fase 4 — Data migration: popula aul_hora_inicio e aul_hora_final
em cada Aulas a partir do primeiro MinistrarAula do grupo.
"""

from django.db import migrations


def populate_hora_aulas(apps, schema_editor):
    Aulas = apps.get_model('tecnico', 'Aulas')
    for aula in Aulas.objects.filter(deleted_at__isnull=True):
        primeiro = (
            aula.registros
            .filter(deleted_at__isnull=True)
            .order_by('miau_hora_inicio')
            .first()
        )
        if primeiro:
            Aulas.objects.filter(pk=aula.pk).update(
                aul_hora_inicio=primeiro.miau_hora_inicio,
                aul_hora_final=primeiro.miau_hora_final,
            )


class Migration(migrations.Migration):

    dependencies = [
        ('tecnico', '0020_fase4_adicionar_hora_aulas'),
    ]

    operations = [
        migrations.RunPython(populate_hora_aulas, reverse_code=migrations.RunPython.noop),
    ]
