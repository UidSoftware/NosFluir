from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tecnico', '0007_phase31_round5_cleanup'),
    ]

    operations = [
        migrations.AddField(
            model_name='fichatreinoexercicios',
            name='exe2',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='fichas_treino_secundario',
                to='tecnico.exercicio',
                verbose_name='exercício combinado (opcional)',
            ),
        ),
    ]
