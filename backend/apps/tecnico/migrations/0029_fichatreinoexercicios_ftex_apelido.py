from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tecnico', '0028_backfill_ciclo_posicao'),
    ]

    operations = [
        migrations.AddField(
            model_name='fichatreinoexercicios',
            name='ftex_apelido',
            field=models.CharField(blank=True, max_length=100, null=True, verbose_name='apelido do exercício'),
        ),
    ]
