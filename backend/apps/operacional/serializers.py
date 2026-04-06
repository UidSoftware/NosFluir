from datetime import date

from rest_framework import serializers

from .models import (
    AgendamentoHorario, AgendamentoTurmas,
    Aluno, Funcionario, Profissao, Turma, TurmaAlunos,
)


class AlunoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Aluno
        fields = [
            'alu_id', 'alu_nome', 'alu_documento', 'alu_data_nascimento',
            'alu_endereco', 'alu_email', 'alu_telefone',
            'alu_peso', 'alu_massa_muscular', 'alu_massa_gorda',
            'alu_porcentagem_gordura', 'alu_circunferencia_abdominal',
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


class ProfissaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profissao
        fields = ['prof_id', 'prof_nome', 'created_at', 'updated_at']
        read_only_fields = ['prof_id', 'created_at', 'updated_at']


class FuncionarioSerializer(serializers.ModelSerializer):
    prof_nome = serializers.CharField(source='prof.prof_nome', read_only=True)

    class Meta:
        model = Funcionario
        fields = [
            'func_id', 'prof', 'prof_nome', 'func_nome', 'func_documento',
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
    total_alunos = serializers.SerializerMethodField()

    class Meta:
        model = Turma
        fields = [
            'tur_id', 'tur_nome', 'tur_horario',
            'total_alunos', 'created_at', 'updated_at',
        ]
        read_only_fields = ['tur_id', 'total_alunos', 'created_at', 'updated_at']

    def get_total_alunos(self, obj):
        return obj.turmaalunos_set.filter(ativo=True, deleted_at__isnull=True).count()


class TurmaAlunosSerializer(serializers.ModelSerializer):
    alu_nome = serializers.CharField(source='alu.alu_nome', read_only=True)
    tur_nome = serializers.CharField(source='tur.tur_nome', read_only=True)

    class Meta:
        model = TurmaAlunos
        fields = [
            'tual_id', 'tur', 'tur_nome', 'alu', 'alu_nome',
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
    alu_nome = serializers.CharField(source='alu.alu_nome', read_only=True)

    class Meta:
        model = AgendamentoHorario
        fields = [
            'agho_id', 'alu', 'alu_nome',
            'agho_dias_disponiveis', 'agho_horarios_disponiveis',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['agho_id', 'created_at', 'updated_at']


class AgendamentoTurmasSerializer(serializers.ModelSerializer):
    alu_nome = serializers.CharField(source='alu.alu_nome', read_only=True)

    class Meta:
        model = AgendamentoTurmas
        fields = [
            'agtu_id', 'alu', 'alu_nome',
            'agtu_dias_disponiveis', 'agtu_horarios_disponiveis', 'agtu_nivelamento',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['agtu_id', 'created_at', 'updated_at']
