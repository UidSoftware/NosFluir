from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('operacional', '0005_aluno_saude_emergencia'),
    ]

    operations = [
        migrations.AddField(
            model_name='turma',
            name='tur_modalidade',
            field=models.CharField(
                blank=True,
                choices=[('pilates', 'Mat Pilates'), ('funcional', 'Funcional')],
                max_length=20,
                null=True,
                verbose_name='modalidade',
            ),
        ),
    ]
