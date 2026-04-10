from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('operacional', '0004_phase31_round3_remocoes'),
    ]

    operations = [
        migrations.AddField(
            model_name='aluno',
            name='alu_contato_emergencia',
            field=models.CharField(blank=True, max_length=20, null=True, verbose_name='contato de emergência (telefone)'),
        ),
        migrations.AddField(
            model_name='aluno',
            name='alu_doencas_cronicas',
            field=models.TextField(blank=True, null=True, verbose_name='doenças crônicas'),
        ),
        migrations.AddField(
            model_name='aluno',
            name='alu_medicamentos',
            field=models.TextField(blank=True, null=True, verbose_name='medicamentos em uso'),
        ),
    ]
