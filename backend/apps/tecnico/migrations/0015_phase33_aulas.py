"""
Fase 3.3 — Nova tabela Aulas + FK em MinistrarAula

Operações:
- CreateModel: Aulas (tabela aulas) — 1 linha por aula coletiva
- AddField: MinistrarAula.aula (FK → Aulas, nullable, SET_NULL)
"""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('operacional', '0005_aluno_saude_emergencia'),
        ('tecnico', '0014_phase32_ministrar_aula'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1. Criar tabela aulas
        migrations.CreateModel(
            name='Aulas',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='%(class)s_created', to=settings.AUTH_USER_MODEL,
                )),
                ('updated_by', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='%(class)s_updated', to=settings.AUTH_USER_MODEL,
                )),
                ('deleted_by', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='%(class)s_deleted', to=settings.AUTH_USER_MODEL,
                )),
                ('aul_id', models.AutoField(primary_key=True, serialize=False)),
                ('tur', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    to='operacional.turma',
                    verbose_name='turma',
                )),
                ('func', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.PROTECT,
                    to='operacional.funcionario',
                    verbose_name='professor',
                )),
                ('aul_data', models.DateField(verbose_name='data da aula')),
                ('aul_hora_inicio', models.TimeField(verbose_name='hora de início')),
                ('aul_hora_final', models.TimeField(blank=True, null=True, verbose_name='hora de término')),
                ('aul_modalidade', models.CharField(
                    choices=[('pilates', 'Mat Pilates'), ('funcional', 'Funcional')],
                    max_length=20,
                    verbose_name='modalidade',
                )),
                ('aul_nome', models.CharField(
                    blank=True,
                    help_text='Ex: "Funcional Seg 17:00" — preenchido automaticamente se deixado em branco',
                    max_length=150,
                    null=True,
                    verbose_name='nome/descrição',
                )),
            ],
            options={
                'verbose_name': 'Aula',
                'verbose_name_plural': 'Aulas',
                'db_table': 'aulas',
                'ordering': ['-aul_data', '-aul_hora_inicio'],
            },
        ),

        # 2. unique_together em Aulas
        migrations.AlterUniqueTogether(
            name='aulas',
            unique_together={('tur', 'aul_data', 'aul_hora_inicio')},
        ),

        # 3. Adicionar FK aula em MinistrarAula (nullable — retrocompatível)
        migrations.AddField(
            model_name='ministraraula',
            name='aula',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='registros',
                to='tecnico.aulas',
                verbose_name='aula',
            ),
        ),
    ]
