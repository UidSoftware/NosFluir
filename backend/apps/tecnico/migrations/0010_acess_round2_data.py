"""
Round 2: Popula catálogo de acessórios e migra dados existentes (best-effort por nome).
"""
from django.db import migrations

ACESSORIOS = [
    'Arco/anel',
    'Bola suíça',
    'Caneleiras',
    'Escada de agilidade',
    'Faixa elástica',
    'Medicine ball',
    'Mini band',
    'Overball',
    'Superband',
]

# Mapeamento normalizado (lowercase sem acento) → nome canônico
MAPA = {
    'arco':                   'Arco/anel',
    'anel':                   'Arco/anel',
    'arco/anel':              'Arco/anel',
    'bola suica':             'Bola suíça',
    'bola suiça':             'Bola suíça',
    'bola suíça':             'Bola suíça',
    'caneleira':              'Caneleiras',
    'caneleiras':             'Caneleiras',
    'escada':                 'Escada de agilidade',
    'escada de agilidade':    'Escada de agilidade',
    'faixa elastica':         'Faixa elástica',
    'faixa elástica':         'Faixa elástica',
    'medicine ball':          'Medicine ball',
    'mini band':              'Mini band',
    'miniband':               'Mini band',
    'overball':               'Overball',
    'superband':              'Superband',
}


def popular_acessorios(apps, schema_editor):
    Acessorio = apps.get_model('tecnico', 'Acessorio')
    Exercicio = apps.get_model('tecnico', 'Exercicio')

    # Cria catálogo
    catalogo = {}
    for nome in ACESSORIOS:
        obj, _ = Acessorio.objects.get_or_create(acess_nome=nome, defaults={'acess_ativo': True})
        catalogo[nome] = obj

    # Migra exercícios existentes com acessório preenchido
    for exe in Exercicio.objects.filter(exe_acessorio_fk__isnull=True).exclude(exe_acessorio='').exclude(exe_acessorio__isnull=True):
        chave = exe.exe_acessorio.strip().lower()
        nome_canonico = MAPA.get(chave)
        if nome_canonico:
            exe.exe_acessorio_fk = catalogo[nome_canonico]
            exe.save(update_fields=['exe_acessorio_fk'])


def reverter(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('tecnico', '0009_acess_round1_create_add_fk'),
    ]

    operations = [
        migrations.RunPython(popular_acessorios, reverter),
    ]
