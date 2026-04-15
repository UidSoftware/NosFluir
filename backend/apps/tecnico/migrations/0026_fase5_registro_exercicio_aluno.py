import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tecnico', '0025_fase5_programa_turma_ciclo'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='RegistroExercicioAluno',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('reg_id', models.AutoField(primary_key=True, serialize=False)),
                ('reg_series', models.IntegerField(blank=True, null=True, verbose_name='séries')),
                ('reg_repeticoes', models.IntegerField(blank=True, null=True, verbose_name='repetições')),
                ('reg_carga', models.CharField(blank=True, max_length=50, null=True, verbose_name='carga')),
                ('reg_observacoes', models.TextField(blank=True, null=True, verbose_name='observações')),
                ('created_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='tecnico_registroexercicioaluno_created',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('deleted_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='tecnico_registroexercicioaluno_deleted',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('updated_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='tecnico_registroexercicioaluno_updated',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('ministrar_aula', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='registros_exercicios',
                    to='tecnico.ministraraula',
                    verbose_name='registro de aula',
                )),
                ('ftex', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='registros_alunos',
                    to='tecnico.fichatreinoexercicios',
                    verbose_name='exercício da ficha',
                )),
            ],
            options={
                'verbose_name': 'Registro de Exercício',
                'verbose_name_plural': 'Registros de Exercícios',
                'db_table': 'registro_exercicio_aluno',
                'ordering': ['ftex__ftex_ordem'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='registroexercicioaluno',
            unique_together={('ministrar_aula', 'ftex')},
        ),
    ]
