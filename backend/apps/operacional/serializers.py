from datetime import date

from rest_framework import serializers

from .models import (
    AgendamentoExperimental, AgendamentoHorario, AgendamentoTurmas,
    Aluno, AulaExperimental, AvisoFalta, FichaAluno, Funcionario,
    Profissao, SlotExperimental, Turma, TurmaAlunos,
)


class AlunoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)

    class Meta:
        model = Aluno
        fields = [
            'id', 'alu_id', 'alu_nome', 'alu_documento', 'alu_data_nascimento',
            'alu_endereco', 'alu_email', 'alu_telefone',
            'alu_contato_emergencia', 'alu_doencas_cronicas', 'alu_medicamentos',
            'alu_ativo', 'created_at', 'updated_at',
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
            'id', 'tur_id', 'tur_nome', 'tur_horario', 'tur_modalidade',
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
        # Desabilita o UniqueTogetherValidator automático — tratamos manualmente
        # para poder restaurar registros soft-deleted (tur+alu removidos e re-adicionados)
        validators = []

    def validate(self, data):
        turma = data.get('tur', getattr(self.instance, 'tur', None))
        alu   = data.get('alu', getattr(self.instance, 'alu', None))

        if turma and alu and not self.instance:
            existing = TurmaAlunos.objects.filter(tur=turma, alu=alu).first()
            if existing and existing.deleted_at is None:
                raise serializers.ValidationError(
                    {'non_field_errors': ['Aluno já está matriculado nesta turma.']}
                )
            # Se existir soft-deleted, o viewset vai restaurar — não bloqueia aqui

        # RN014: máximo 15 alunos por turma
        if turma:
            total = TurmaAlunos.objects.filter(
                tur=turma, ativo=True, deleted_at__isnull=True
            ).count()
            if not self.instance and total >= 15:
                raise serializers.ValidationError(
                    {'tur': f'Turma "{turma.tur_nome}" já atingiu o limite de 15 alunos.'}
                )
        return data


class AvisoFaltaSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    alu_nome = serializers.CharField(source='aluno.alu_nome', read_only=True)
    tur_nome = serializers.CharField(source='turma.tur_nome', read_only=True)

    class Meta:
        model = AvisoFalta
        fields = [
            'id', 'avi_id', 'aluno', 'alu_nome', 'turma', 'tur_nome',
            'avi_data_hora_aviso', 'avi_data_aula', 'avi_tipo',
            'avi_antecedencia_horas', 'avi_gera_credito', 'avi_observacoes',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'avi_id', 'avi_antecedencia_horas', 'avi_gera_credito',
            'created_at', 'updated_at',
        ]


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


class SlotExperimentalSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    vagas_disponiveis = serializers.SerializerMethodField()

    class Meta:
        model = SlotExperimental
        fields = [
            'id', 'slot_id', 'slot_dia_semana', 'slot_hora', 'slot_modalidade',
            'slot_vagas', 'slot_ativo', 'vagas_disponiveis',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['slot_id', 'created_at', 'updated_at']

    def get_vagas_disponiveis(self, obj):
        return obj.vagas_disponiveis


class AgendamentoExperimentalSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    slot_dia_semana = serializers.CharField(source='slot.slot_dia_semana', read_only=True)
    slot_hora = serializers.TimeField(source='slot.slot_hora', read_only=True)

    class Meta:
        model = AgendamentoExperimental
        fields = [
            'id', 'age_id', 'slot', 'slot_dia_semana', 'slot_hora',
            'age_nome', 'age_telefone', 'age_nascimento', 'age_modalidade',
            'age_disponibilidade', 'age_problema_saude',
            'age_data_agendada', 'age_hora_agendada',
            'age_status', 'age_origem', 'age_observacoes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['age_id', 'created_at', 'updated_at']

    def validate(self, data):
        slot = data.get('slot')
        if slot and not self.instance:
            if slot.vagas_disponiveis <= 0:
                raise serializers.ValidationError({'slot': 'Não há vagas disponíveis neste horário.'})
        return data


class AulaExperimentalSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    age_nome = serializers.CharField(source='agendamento.age_nome', read_only=True)
    age_telefone = serializers.CharField(source='agendamento.age_telefone', read_only=True)
    func_nome = serializers.CharField(source='func.func_nome', read_only=True)
    alu_nome = serializers.CharField(source='aluno.alu_nome', read_only=True, default=None)

    class Meta:
        model = AulaExperimental
        fields = [
            'id', 'aexp_id', 'agendamento', 'age_nome', 'age_telefone',
            'func', 'func_nome',
            'aexp_data', 'aexp_modalidade',
            'aexp_profissao', 'aexp_doencas_cronicas', 'aexp_lesoes_dores', 'aexp_objetivo',
            'aexp_agachamento', 'aexp_flexibilidade', 'aexp_equilibrio',
            'aexp_coordenacao', 'aexp_observacoes',
            'aexp_cadastrou_aluno', 'aluno', 'alu_nome',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['aexp_id', 'created_at', 'updated_at']


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
