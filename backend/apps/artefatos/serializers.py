from rest_framework import serializers
from .models import Artefato


class ArtefatoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Artefato
        fields = [
            'id', 'tipo', 'agente', 'titulo', 'conteudo',
            'commit_hash', 'deploy_url', 'status', 'criado_em',
        ]
        read_only_fields = ['id', 'criado_em']
