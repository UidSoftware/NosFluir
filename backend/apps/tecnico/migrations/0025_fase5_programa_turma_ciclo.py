import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('operacional', '0001_initial'),
        ('tecnico', '0024_fase4_remover_hora_ministraraula'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Adicionar fitr FK em Aulas
        migrations.AddField(
            model_name='aulas',
            name='fitr',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='tecnico.fichatreino',
                verbose_name='ficha de treino',
            ),
        ),
        # Adicionar campos de ciclo em Aulas
        migrations.AddField(
            model_name='aulas',
            name='aul_numero_ciclo',
            field=models.IntegerField(default=1, verbose_name='número do ciclo'),
        ),
        migrations.AddField(
            model_name='aulas',
            name='aul_posicao_ciclo',
            field=models.IntegerField(blank=True, null=True, verbose_name='posição no ciclo'),
        ),
        # Criar tabela ProgramaTurma
        migrations.CreateModel(
            name='ProgramaTurma',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('prog_id', models.AutoField(primary_key=True, serialize=False)),
                ('prog_ordem', models.IntegerField(verbose_name='posição no ciclo')),
                ('created_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='tecnico_programaturma_created',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('deleted_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='tecnico_programaturma_deleted',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('updated_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='tecnico_programaturma_updated',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('turma', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='programa',
                    to='operacional.turma',
                    verbose_name='turma',
                )),
                ('fitr', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='programas',
                    to='tecnico.fichatreino',
                    verbose_name='ficha de treino',
                )),
            ],
            options={
                'verbose_name': 'Programa da Turma',
                'verbose_name_plural': 'Programas das Turmas',
                'db_table': 'programa_turma',
                'ordering': ['turma', 'prog_ordem'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='programaturma',
            unique_together={('turma', 'prog_ordem'), ('turma', 'fitr')},
        ),
    ]
