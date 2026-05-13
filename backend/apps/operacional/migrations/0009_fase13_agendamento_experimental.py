import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('operacional', '0008_aluno_alu_ativo'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SlotExperimental',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('slot_id', models.AutoField(primary_key=True, serialize=False)),
                ('slot_dia_semana', models.CharField(choices=[('seg', 'Segunda-feira'), ('ter', 'Terça-feira'), ('qua', 'Quarta-feira'), ('qui', 'Quinta-feira'), ('sex', 'Sexta-feira')], max_length=3)),
                ('slot_hora', models.TimeField()),
                ('slot_modalidade', models.CharField(choices=[('pilates', 'Mat Pilates'), ('funcional', 'Funcional'), ('ambos', 'Ambos')], default='ambos', max_length=20)),
                ('slot_vagas', models.IntegerField(default=2)),
                ('slot_ativo', models.BooleanField(default=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(app_label)s_%(class)s_created', to=settings.AUTH_USER_MODEL)),
                ('deleted_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(app_label)s_%(class)s_deleted', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(app_label)s_%(class)s_updated', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Slot Experimental',
                'verbose_name_plural': 'Slots Experimentais',
                'db_table': 'slot_experimental',
                'ordering': ['slot_dia_semana', 'slot_hora'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='slotexperimental',
            unique_together={('slot_dia_semana', 'slot_hora', 'slot_modalidade')},
        ),
        migrations.CreateModel(
            name='AgendamentoExperimental',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('age_id', models.AutoField(primary_key=True, serialize=False)),
                ('age_nome', models.CharField(max_length=200)),
                ('age_telefone', models.CharField(max_length=20)),
                ('age_nascimento', models.DateField()),
                ('age_modalidade', models.CharField(choices=[('pilates', 'Mat Pilates'), ('funcional', 'Funcional'), ('ambos', 'Ambos')], max_length=20)),
                ('age_disponibilidade', models.TextField(blank=True, null=True)),
                ('age_problema_saude', models.TextField(blank=True, null=True)),
                ('age_data_agendada', models.DateField()),
                ('age_hora_agendada', models.TimeField()),
                ('age_status', models.CharField(choices=[('pendente', 'Pendente'), ('confirmado', 'Confirmado'), ('realizado', 'Realizado'), ('cancelado', 'Cancelado'), ('faltou', 'Faltou')], default='pendente', max_length=20)),
                ('age_origem', models.CharField(choices=[('site', 'Site'), ('sistema', 'Sistema')], default='site', max_length=20)),
                ('age_observacoes', models.TextField(blank=True, null=True)),
                ('slot', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='agendamentos', to='operacional.slotexperimental')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(app_label)s_%(class)s_created', to=settings.AUTH_USER_MODEL)),
                ('deleted_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(app_label)s_%(class)s_deleted', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(app_label)s_%(class)s_updated', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Agendamento Experimental',
                'verbose_name_plural': 'Agendamentos Experimentais',
                'db_table': 'agendamento_experimental',
                'ordering': ['age_data_agendada', 'age_hora_agendada'],
            },
        ),
        migrations.CreateModel(
            name='AulaExperimental',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('aexp_id', models.AutoField(primary_key=True, serialize=False)),
                ('aexp_data', models.DateField()),
                ('aexp_modalidade', models.CharField(choices=[('pilates', 'Mat Pilates'), ('funcional', 'Funcional'), ('ambos', 'Ambos')], max_length=20)),
                ('aexp_profissao', models.CharField(blank=True, max_length=100, null=True)),
                ('aexp_doencas_cronicas', models.TextField(blank=True, null=True)),
                ('aexp_lesoes_dores', models.TextField(blank=True, null=True)),
                ('aexp_objetivo', models.TextField(blank=True, null=True)),
                ('aexp_agachamento', models.TextField(blank=True, null=True)),
                ('aexp_flexibilidade', models.TextField(blank=True, null=True)),
                ('aexp_equilibrio', models.TextField(blank=True, null=True)),
                ('aexp_coordenacao', models.TextField(blank=True, null=True)),
                ('aexp_observacoes', models.TextField(blank=True, null=True)),
                ('aexp_cadastrou_aluno', models.BooleanField(default=False)),
                ('agendamento', models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name='aula_experimental', to='operacional.agendamentoexperimental')),
                ('aluno', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='aula_experimental_origem', to='operacional.aluno')),
                ('func', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='aulas_experimentais', to='operacional.funcionario')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(app_label)s_%(class)s_created', to=settings.AUTH_USER_MODEL)),
                ('deleted_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(app_label)s_%(class)s_deleted', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(app_label)s_%(class)s_updated', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Aula Experimental',
                'verbose_name_plural': 'Aulas Experimentais',
                'db_table': 'aula_experimental',
                'ordering': ['-aexp_data'],
            },
        ),
    ]
