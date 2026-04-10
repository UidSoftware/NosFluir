"""
Data migration — Round 2 Fase 3.1
Popula tabela Aparelho com o catálogo inicial (Pilates + Funcional).
Não há exercícios nem medidas de alunos a migrar neste ambiente.
"""
from django.db import migrations


APARELHOS = [
    # (nome, modalidade)
    ('Solo', 'pilates'),
    ('Reformer', 'pilates'),
    ('Cadillac', 'pilates'),
    ('Chair', 'pilates'),
    ('Barrel', 'pilates'),
    ('Step', 'funcional'),
    ('Banco', 'funcional'),
    ('Parede', 'funcional'),
    ('Polia', 'funcional'),
]


def criar_aparelhos(apps, schema_editor):
    Aparelho = apps.get_model('tecnico', 'Aparelho')
    for nome, modalidade in APARELHOS:
        Aparelho.objects.get_or_create(apar_nome=nome, defaults={'apar_modalidade': modalidade})


def desfazer_aparelhos(apps, schema_editor):
    Aparelho = apps.get_model('tecnico', 'Aparelho')
    nomes = [nome for nome, _ in APARELHOS]
    Aparelho.objects.filter(apar_nome__in=nomes).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('tecnico', '0003_phase31_round1_adicoes'),
    ]

    operations = [
        migrations.RunPython(criar_aparelhos, desfazer_aparelhos),
    ]
