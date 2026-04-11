"""
Backfill: vincula MinistrarAula existentes ao Aulas agregado.

Para cada MinistrarAula com aula=NULL e tur.tur_modalidade definida,
cria (ou reutiliza) o Aulas correspondente e preenche o FK.
"""

from django.db import migrations


def backfill_aula_fk(apps, schema_editor):
    MinistrarAula = apps.get_model('tecnico', 'MinistrarAula')
    Aulas = apps.get_model('tecnico', 'Aulas')

    registros = (
        MinistrarAula.objects
        .filter(aula__isnull=True, deleted_at__isnull=True)
        .select_related('tur')
    )

    for miau in registros:
        modalidade = miau.tur.tur_modalidade
        if not modalidade:
            continue  # turma sem modalidade — pula

        aula, _ = Aulas.objects.get_or_create(
            tur=miau.tur,
            aul_data=miau.miau_data,
            aul_modalidade=modalidade,
            defaults={'func': miau.func},
        )
        MinistrarAula.objects.filter(pk=miau.pk).update(aula=aula)


class Migration(migrations.Migration):

    dependencies = [
        ('tecnico', '0017_remove_aulas_hora_fields'),
        ('operacional', '0006_turma_tur_modalidade'),
    ]

    operations = [
        migrations.RunPython(backfill_aula_fk, reverse_code=migrations.RunPython.noop),
    ]
