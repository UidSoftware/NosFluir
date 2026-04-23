from datetime import date

from django.db import migrations


def migrate_planos(apps, schema_editor):
    PlanosPagamentos = apps.get_model('financeiro', 'PlanosPagamentos')
    AlunoPlano = apps.get_model('financeiro', 'AlunoPlano')

    for plano in PlanosPagamentos.objects.filter(alu__isnull=False):
        AlunoPlano.objects.get_or_create(
            aluno_id=plano.alu_id,
            plano=plano,
            defaults={
                'aplano_data_inicio': plano.plan_data_inicio or date.today(),
                'aplano_data_fim':    plano.plan_data_fim,
                'aplano_ativo':       plano.plan_ativo,
                'created_by_id':      plano.created_by_id,
                'updated_by_id':      plano.updated_by_id,
            }
        )


def reverse_migrate_planos(apps, schema_editor):
    AlunoPlano = apps.get_model('financeiro', 'AlunoPlano')
    AlunoPlano.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0002_fase9_aluno_plano'),
    ]

    operations = [
        migrations.RunPython(migrate_planos, reverse_migrate_planos),
    ]
