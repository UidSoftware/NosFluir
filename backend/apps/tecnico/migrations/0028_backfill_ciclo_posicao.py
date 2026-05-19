# Migration de backfill — sem alteração de schema.
# Preenche aul_posicao_ciclo e aul_numero_ciclo nas aulas existentes
# que têm fitr preenchido mas aul_posicao_ciclo = None.
# Idempotente: processa apenas aulas com posicao = None.

from django.db import migrations


def backfill_ciclo_posicao(apps, schema_editor):
    Aulas = apps.get_model('tecnico', 'Aulas')
    ProgramaTurma = apps.get_model('tecnico', 'ProgramaTurma')

    # Aulas elegíveis: têm ficha, sem posicao preenchida, não deletadas
    pendentes = (
        Aulas.objects
        .filter(fitr__isnull=False, aul_posicao_ciclo__isnull=True, deleted_at__isnull=True)
        .order_by('tur_id', 'aul_data', 'aul_id')
    )

    # Contador por (tur_id, fitr_id) — quantas aulas já processadas nesta combinação
    contadores = {}

    for aula in pendentes:
        chave = (aula.tur_id, aula.fitr_id)
        contadores[chave] = contadores.get(chave, 0)

        programa = ProgramaTurma.objects.filter(turma_id=aula.tur_id, fitr_id=aula.fitr_id).first()
        if programa:
            aula.aul_posicao_ciclo = programa.prog_ordem
            aula.aul_numero_ciclo  = contadores[chave] + 1
        else:
            # Sem ProgramaTurma: posicao = sequência de uso (1-based), ciclo = 1
            aula.aul_posicao_ciclo = contadores[chave] + 1
            aula.aul_numero_ciclo  = 1

        aula.save(update_fields=['aul_posicao_ciclo', 'aul_numero_ciclo'])
        contadores[chave] += 1


def backfill_reversa(apps, schema_editor):
    # Reversão: limpa apenas os registros que tinham posicao nula antes do backfill.
    # Como não temos snapshot do estado anterior, deixamos como no-op seguro.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('tecnico', '0027_fase8_credito_aviso_fk'),
    ]

    operations = [
        migrations.RunPython(backfill_ciclo_posicao, backfill_reversa),
    ]
