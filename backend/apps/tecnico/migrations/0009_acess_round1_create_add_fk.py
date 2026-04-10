"""
Round 1: Cria tabela Acessorio e adiciona FK temporária exe_acessorio_fk em Exercicio.
O CharField exe_acessorio original permanece intacto até round 3.
"""
from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('tecnico', '0008_fichatreinoexercicios_exe2'),
    ]

    operations = [
        migrations.CreateModel(
            name='Acessorio',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='atualizado em')),
                ('deleted_at', models.DateTimeField(blank=True, null=True, verbose_name='excluído em')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL, verbose_name='criado por')),
                ('deleted_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL, verbose_name='excluído por')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL, verbose_name='atualizado por')),
                ('acess_id', models.AutoField(primary_key=True, serialize=False)),
                ('acess_nome', models.CharField(max_length=100, verbose_name='nome')),
                ('acess_ativo', models.BooleanField(default=True, verbose_name='ativo')),
            ],
            options={
                'verbose_name': 'Acessório',
                'verbose_name_plural': 'Acessórios',
                'db_table': 'acessorio',
                'ordering': ['acess_nome'],
            },
        ),
        migrations.AddField(
            model_name='exercicio',
            name='exe_acessorio_fk',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='exercicios',
                to='tecnico.acessorio',
                verbose_name='acessório',
            ),
        ),
    ]
