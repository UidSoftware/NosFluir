from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('operacional', '0007_fase8_aviso_falta'),
    ]

    operations = [
        migrations.AddField(
            model_name='aluno',
            name='alu_ativo',
            field=models.BooleanField(default=True, verbose_name='ativo'),
        ),
    ]
