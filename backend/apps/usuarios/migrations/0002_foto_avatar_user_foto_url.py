from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='foto_url',
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
    ]
