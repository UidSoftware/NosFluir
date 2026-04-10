from datetime import date

from rest_framework import serializers

from .models import (
    AgendamentoHorario, AgendamentoTurmas,
    Aluno, FichaAluno, Funcionario, Profissao, Turma, TurmaAlunos,
)


class AlunoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)

    class Meta:
        model = Aluno
        fields = [
            'id', 'alu_id', 'alu_nome', 'alu_documento', 'alu_data_nascimento',
            'alu_endereco', 'alu_email', 'alu_telefone',
            'alu_contato_emergencia', 'alu_doencas_cronicas', 'alu_medicamentos',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['alu_id', 'created_at', 'updated_at']

    def validate_alu_data_nascimento(self, value):
        # RN013: idade mínima de 12 anos
        hoje = date.today()
        idade = hoje.year - value.year - ((hoje.month, hoje.day) < (value.month, value.day))
        if idade < 12:
            raise serializers.ValidationError('Aluno deve ter no mínimo 12 anos.')
        return value

    def validate_alu_documento(self, value):
        # RN012: CPF com 11 dígitos numéricos
        cpf = ''.join(filter(str.isdigit, value))
        if len(cpf) != 11:
            raise serializers.ValidationError('CPF deve ter 11 dígitos numéricos.')
        return cpf


class FichaAlunoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    alu_nome = serializers.CharField(source='aluno.alu_nome', read_only=True)

    class Meta:
        model = FichaAluno
        fields = [
            'id', 'fial_id', 'aluno', 'alu_nome', 'fial_data',
            'fial_peso', 'fial_massa_muscular', 'fial_massa_gorda',
            'fial_porcentagem_gordura', 'fial_circunferencia_abdominal',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['fial_id', 'created_at', 'updated_at']


class ProfissaoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)

    class Meta:
        model = Profissao
        fields = ['id', 'prof_id', 'prof_nome', 'created_at', 'updated_at']
        read_only_fields = ['prof_id', 'created_at', 'updated_at']


class FuncionarioSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    prof_nome = serializers.CharField(source='prof.prof_nome', read_only=True)

    class Meta:
        model = Funcionario
        fields = [
            'id', 'func_id', 'prof', 'prof_nome', 'func_nome', 'func_documento',
            'func_endereco', 'func_telefone', 'func_formacao', 'func_salario',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['func_id', 'created_at', 'updated_at']

    def validate_func_documento(self, value):
        cpf = ''.join(filter(str.isdigit, value))
        if len(cpf) != 11:
            raise serializers.ValidationError('CPF deve ter 11 dígitos numéricos.')
        return cpf

    def validate_func_salario(self, value):
        # RN-FUNC-02
        if value <= 0:
            raise serializers.ValidationError('Salário deve ser maior que zero.')
        return value


class TurmaSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    total_alunos = serializers.SerializerMethodField()

    class Meta:
        model = Turma
        fields = [
            'id', 'tur_id', 'tur_nome', 'tur_horario',
            'total_alunos', 'created_at', 'updated_at',
        ]
        read_only_fields = ['tur_id', 'total_alunos', 'created_at', 'updated_at']

    def get_total_alunos(self, obj):
        return obj.turmaalunos_set.filter(ativo=True, deleted_at__isnull=True).count()


class TurmaAlunosSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    alu_nome = serializers.CharField(source='alu.alu_nome', read_only=True)
    tur_nome = serializers.CharField(source='tur.tur_nome', read_only=True)

    class Meta:
        model = TurmaAlunos
        fields = [
            'id', 'tual_id', 'tur', 'tur_nome', 'alu', 'alu_nome',
            'data_matricula', 'ativo', 'created_at', 'updated_at',
        ]
        read_only_fields = ['tual_id', 'created_at', 'updated_at']

    def validate(self, data):
        # RN014: máximo 15 alunos por turma
        turma = data.get('tur', getattr(self.instance, 'tur', None))
        if turma:
            total = TurmaAlunos.objects.filter(
                tur=turma, ativo=True, deleted_at__isnull=True
            ).count()
            # Se for criação (sem instance), verifica limite
            if not self.instance and total >= 15:
                raise serializers.ValidationError(
                    {'tur': f'Turma "{turma.tur_nome}" já atingiu o limite de 15 alunos.'}
                )
        return data


class AgendamentoHorarioSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    alu_nome = serializers.CharField(source='alu.alu_nome', read_only=True)

    class Meta:
        model = AgendamentoHorario
        fields = [
            'id', 'agho_id', 'alu', 'alu_nome',
            'agho_dias_disponiveis', 'agho_horarios_disponiveis',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['agho_id', 'created_at', 'updated_at']


class AgendamentoTurmasSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    alu_nome = serializers.CharField(source='alu.alu_nome', read_only=True)

    class Meta:
        model = AgendamentoTurmas
        fields = [
            'id', 'agtu_id', 'alu', 'alu_nome',
            'agtu_dias_disponiveis', 'agtu_horarios_disponiveis', 'agtu_nivelamento',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['agtu_id', 'created_at', 'updated_at']
