from rest_framework import serializers

from .models import Acessorio, Aparelho, Aulas, CreditoReposicao, Exercicio, FichaTreino, FichaTreinoExercicios, MinistrarAula, ProgramaTurma


class AcessorioSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)

    class Meta:
        model = Acessorio
        fields = ['id', 'acess_id', 'acess_nome', 'acess_ativo', 'created_at', 'updated_at']
        read_only_fields = ['acess_id', 'created_at', 'updated_at']


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
    # allow_null=True: FKs são nullable
    apar_nome  = serializers.CharField(source='exe_aparelho.apar_nome', read_only=True, allow_null=True)
    acess_nome = serializers.CharField(source='exe_acessorio.acess_nome', read_only=True, allow_null=True)

    class Meta:
        model = Exercicio
        fields = [
            'id', 'exe_id', 'exe_nome', 'exe_modalidade',
            'exe_aparelho', 'apar_nome',
            'exe_acessorio', 'acess_nome',
            'exe_variacao', 'exe_descricao_tecnica',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['exe_id', 'created_at', 'updated_at']


class FichaTreinoExerciciosSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    exe_nome = serializers.CharField(source='exe.exe_nome', read_only=True)
    # allow_null=True: exercício pode não ter aparelho vinculado
    apar_nome = serializers.CharField(source='exe.exe_aparelho.apar_nome', read_only=True, allow_null=True)
    # Combinados — exercício secundário opcional
    exe2_nome = serializers.CharField(source='exe2.exe_nome', read_only=True, allow_null=True)
    exe2_apar_nome = serializers.CharField(source='exe2.exe_aparelho.apar_nome', read_only=True, allow_null=True)

    class Meta:
        model = FichaTreinoExercicios
        fields = [
            'id', 'ftex_id', 'fitr', 'exe', 'exe_nome', 'apar_nome',
            'exe2', 'exe2_nome', 'exe2_apar_nome',
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


class ProgramaTurmaSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    fitr_nome = serializers.CharField(source='fitr.fitr_nome', read_only=True)

    class Meta:
        model = ProgramaTurma
        fields = ['id', 'prog_id', 'turma', 'fitr', 'fitr_nome', 'prog_ordem', 'created_at', 'updated_at']
        read_only_fields = ['prog_id', 'created_at', 'updated_at']


class AulasSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    tur_nome = serializers.CharField(source='tur.tur_nome', read_only=True)
    func_nome = serializers.CharField(source='func.func_nome', read_only=True, allow_null=True)
    fitr_nome = serializers.CharField(source='fitr.fitr_nome', read_only=True, allow_null=True)
    total_presentes = serializers.SerializerMethodField()
    total_faltas = serializers.SerializerMethodField()
    total_registros = serializers.SerializerMethodField()

    class Meta:
        model = Aulas
        fields = [
            'id', 'aul_id', 'tur', 'tur_nome', 'func', 'func_nome',
            'fitr', 'fitr_nome',
            'aul_data', 'aul_hora_inicio', 'aul_hora_final',
            'aul_modalidade', 'aul_nome',
            'aul_numero_ciclo', 'aul_posicao_ciclo',
            'total_presentes', 'total_faltas', 'total_registros',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['aul_id', 'aul_numero_ciclo', 'aul_posicao_ciclo', 'created_at', 'updated_at']

    def validate(self, data):
        hora_inicio = data.get('aul_hora_inicio', getattr(self.instance, 'aul_hora_inicio', None))
        hora_final = data.get('aul_hora_final')
        if hora_final and hora_inicio and hora_final <= hora_inicio:
            raise serializers.ValidationError(
                {'aul_hora_final': 'Hora de término deve ser maior que a hora de início.'}
            )
        return data

    def get_total_presentes(self, obj):
        return obj.registros.filter(
            miau_tipo_presenca__in=['presente', 'reposicao'],
            deleted_at__isnull=True
        ).count()

    def get_total_faltas(self, obj):
        return obj.registros.filter(
            miau_tipo_presenca='falta',
            deleted_at__isnull=True
        ).count()

    def get_total_registros(self, obj):
        return obj.registros.filter(deleted_at__isnull=True).count()


class MinistrarAulaSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    alu_nome = serializers.CharField(source='alu.alu_nome', read_only=True)
    tur_nome = serializers.CharField(source='tur.tur_nome', read_only=True)
    func_nome = serializers.CharField(source='func.func_nome', read_only=True, allow_null=True)

    class Meta:
        model = MinistrarAula
        fields = [
            'id', 'miau_id', 'aula', 'tur', 'tur_nome', 'alu', 'alu_nome', 'func', 'func_nome',
            'fitr', 'cred',
            'miau_data',
            'miau_pas_inicio', 'miau_pad_inicio',
            'miau_pas_final', 'miau_pad_final',
            'miau_fc_inicio', 'miau_fc_final',
            'miau_pse', 'miau_observacoes',
            'miau_tipo_presenca', 'miau_tipo_falta',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['miau_id', 'created_at', 'updated_at']

    def _validar_pa(self, pas, pad, sufixo):
        """Valida PAS e PAD em mmHg."""
        if pas is not None and not (50 <= pas <= 250):
            raise serializers.ValidationError(
                {f'miau_pas_{sufixo}': 'Sistólica (PAS) deve estar entre 50 e 250 mmHg.'}
            )
        if pad is not None and not (30 <= pad <= 150):
            raise serializers.ValidationError(
                {f'miau_pad_{sufixo}': 'Diastólica (PAD) deve estar entre 30 e 150 mmHg.'}
            )

    def _validar_fc(self, fc, campo):
        """Valida frequência cardíaca em bpm."""
        if fc is not None and not (30 <= fc <= 250):
            raise serializers.ValidationError(
                {campo: 'Frequência cardíaca deve estar entre 30 e 250 bpm.'}
            )

    def validate(self, data):
        # RN-MIAU-05: tipo_falta só preenchido quando tipo_presenca = 'falta'
        tipo_presenca = data.get('miau_tipo_presenca', getattr(self.instance, 'miau_tipo_presenca', 'presente'))
        tipo_falta = data.get('miau_tipo_falta')
        if tipo_falta and tipo_presenca != 'falta':
            raise serializers.ValidationError(
                {'miau_tipo_falta': 'Tipo de falta só pode ser preenchido quando tipo de presença é "falta".'}
            )

        # RN-MIAU-06: cred só preenchido quando tipo_presenca = 'reposicao'
        cred = data.get('cred')
        if cred and tipo_presenca != 'reposicao':
            raise serializers.ValidationError(
                {'cred': 'Crédito só pode ser utilizado quando tipo de presença é "reposição".'}
            )

        # Validação PAS/PAD
        self._validar_pa(data.get('miau_pas_inicio'), data.get('miau_pad_inicio'), 'inicio')
        self._validar_pa(data.get('miau_pas_final'), data.get('miau_pad_final'), 'final')

        # Validação FC
        self._validar_fc(data.get('miau_fc_inicio'), 'miau_fc_inicio')
        self._validar_fc(data.get('miau_fc_final'), 'miau_fc_final')

        # Validação PSE — Escala de Borg (6-20)
        pse = data.get('miau_pse')
        if pse is not None and not (6 <= pse <= 20):
            raise serializers.ValidationError(
                {'miau_pse': 'PSE deve estar entre 6 e 20 (Escala de Borg).'}
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
