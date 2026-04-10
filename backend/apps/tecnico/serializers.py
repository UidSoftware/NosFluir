import re

from rest_framework import serializers

from .models import Aparelho, Aula, CreditoReposicao, Exercicio, FichaTreino, FichaTreinoExercicios


class AparelhoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)

    class Meta:
        model = Aparelho
        fields = [
            'id', 'apar_id', 'apar_nome', 'apar_modalidade', 'apar_ativo',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['apar_id', 'created_at', 'updated_at']


class ExercicioSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    apar_nome = serializers.CharField(source='exe_aparelho.apar_nome', read_only=True)

    class Meta:
        model = Exercicio
        fields = [
            'id', 'exe_id', 'exe_nome', 'exe_modalidade',
            'exe_aparelho', 'apar_nome',
            'exe_acessorio', 'exe_variacao', 'exe_descricao_tecnica',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['exe_id', 'created_at', 'updated_at']


class FichaTreinoExerciciosSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    exe_nome = serializers.CharField(source='exe.exe_nome', read_only=True)
    apar_nome = serializers.CharField(source='exe.exe_aparelho.apar_nome', read_only=True)

    class Meta:
        model = FichaTreinoExercicios
        fields = [
            'id', 'ftex_id', 'fitr', 'exe', 'exe_nome', 'apar_nome',
            'ftex_secao', 'ftex_ordem', 'ftex_repeticoes', 'ftex_series', 'ftex_observacoes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['ftex_id', 'created_at', 'updated_at']

    def validate_ftex_repeticoes(self, value):
        # RN-FTEX-02
        if value <= 0:
            raise serializers.ValidationError('Repetições deve ser maior que zero.')
        return value


class FichaTreinoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    exercicios = FichaTreinoExerciciosSerializer(
        source='fichatreinoexercicios_set', many=True, read_only=True
    )

    class Meta:
        model = FichaTreino
        fields = ['id', 'fitr_id', 'fitr_nome', 'fitr_modalidade', 'exercicios', 'created_at', 'updated_at']
        read_only_fields = ['fitr_id', 'created_at', 'updated_at']


class AulaSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    alu_nome = serializers.CharField(source='alu.alu_nome', read_only=True)
    tur_nome = serializers.CharField(source='tur.tur_nome', read_only=True)
    func_nome = serializers.CharField(source='func.func_nome', read_only=True)

    class Meta:
        model = Aula
        fields = [
            'id', 'aul_id', 'tur', 'tur_nome', 'alu', 'alu_nome', 'func', 'func_nome',
            'fitr', 'cred',
            'aul_data', 'aul_hora_inicio', 'aul_hora_final',
            'aul_pressao_inicio', 'aul_pressao_final',
            'aul_tipo_presenca', 'aul_tipo_falta', 'aul_intensidade_esforco',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['aul_id', 'created_at', 'updated_at']

    def _validar_pressao(self, valor, campo):
        """Valida pressão arterial e retorna sistólica/diastólica."""
        if not valor:
            return
        if not re.match(r'^\d{2,3}/\d{2}$', valor):
            raise serializers.ValidationError(
                {campo: 'Formato inválido. Use "120/80" ou "130/85".'}
            )
        sistolica, diastolica = map(int, valor.split('/'))
        if not (50 <= sistolica <= 250):
            raise serializers.ValidationError(
                {campo: 'Sistólica deve estar entre 50 e 250.'}
            )
        if not (30 <= diastolica <= 150):
            raise serializers.ValidationError(
                {campo: 'Diastólica deve estar entre 30 e 150.'}
            )

    def validate(self, data):
        # RN-AUL-05: tipo_falta só preenchido quando tipo_presenca = 'falta'
        tipo_presenca = data.get('aul_tipo_presenca', getattr(self.instance, 'aul_tipo_presenca', 'regular'))
        tipo_falta = data.get('aul_tipo_falta')
        if tipo_falta and tipo_presenca != 'falta':
            raise serializers.ValidationError(
                {'aul_tipo_falta': 'Tipo de falta só pode ser preenchido quando tipo de presença é "falta".'}
            )

        # RN-AUL-06: cred só preenchido quando tipo_presenca = 'reposicao'
        cred = data.get('cred')
        if cred and tipo_presenca != 'reposicao':
            raise serializers.ValidationError(
                {'cred': 'Crédito só pode ser utilizado quando tipo de presença é "reposição".'}
            )

        # RN-AUL-01: hora_final > hora_inicio
        hora_inicio = data.get('aul_hora_inicio', getattr(self.instance, 'aul_hora_inicio', None))
        hora_final = data.get('aul_hora_final')
        if hora_final and hora_inicio and hora_final <= hora_inicio:
            raise serializers.ValidationError(
                {'aul_hora_final': 'Hora de término deve ser maior que a hora de início.'}
            )

        # RN019: validar pressão arterial
        self._validar_pressao(data.get('aul_pressao_inicio'), 'aul_pressao_inicio')
        self._validar_pressao(data.get('aul_pressao_final'), 'aul_pressao_final')

        # RN021: intensidade entre 0 e 10
        intensidade = data.get('aul_intensidade_esforco')
        if intensidade is not None and not (0 <= intensidade <= 10):
            raise serializers.ValidationError(
                {'aul_intensidade_esforco': 'Intensidade deve ser entre 0 e 10.'}
            )

        return data


class CreditoReposicaoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    alu_nome = serializers.CharField(source='alu.alu_nome', read_only=True)

    class Meta:
        model = CreditoReposicao
        fields = [
            'id', 'cred_id', 'alu', 'alu_nome', 'aula_origem', 'aula_reposicao',
            'cred_data_geracao', 'cred_data_expiracao',
            'cred_usado', 'cred_status', 'created_at', 'updated_at',
        ]
        read_only_fields = ['cred_id', 'cred_data_geracao', 'cred_data_expiracao', 'created_at', 'updated_at']
