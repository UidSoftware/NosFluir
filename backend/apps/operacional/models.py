from django.db import models

from apps.core.mixins import BaseModel


class Aluno(BaseModel):
    """Cadastro de alunos do Studio Fluir."""
    alu_id = models.AutoField(primary_key=True)
    alu_nome = models.CharField('nome completo', max_length=150)
    # RN012: CPF como string para preservar zeros à esquerda
    alu_documento = models.CharField('CPF', max_length=14, unique=True)
    alu_data_nascimento = models.DateField('data de nascimento')
    alu_endereco = models.CharField('endereço', max_length=300, null=True, blank=True)
    alu_email = models.EmailField('e-mail', max_length=150, null=True, blank=True)
    alu_telefone = models.CharField('telefone', max_length=20, null=True, blank=True)
    # Medidas corporais — atualizadas nas avaliações
    class Meta:
        db_table = 'alunos'
        verbose_name = 'Aluno'
        verbose_name_plural = 'Alunos'
        ordering = ['alu_nome']

    def __str__(self):
        return self.alu_nome


class Profissao(BaseModel):
    """Catálogo de profissões/cargos dos funcionários."""
    prof_id = models.AutoField(primary_key=True)
    prof_nome = models.CharField('profissão', max_length=100, unique=True)

    class Meta:
        db_table = 'profissao'
        verbose_name = 'Profissão'
        verbose_name_plural = 'Profissões'
        ordering = ['prof_nome']

    def __str__(self):
        return self.prof_nome


class Funcionario(BaseModel):
    """Cadastro de funcionários."""
    func_id = models.AutoField(primary_key=True)
    prof = models.ForeignKey(
        Profissao, on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='profissão'
    )
    func_nome = models.CharField('nome completo', max_length=150)
    # RN012: CPF como string para preservar zeros à esquerda
    func_documento = models.CharField('CPF', max_length=14, unique=True)
    func_endereco = models.CharField('endereço', max_length=300, null=True, blank=True)
    func_telefone = models.CharField('telefone', max_length=20, null=True, blank=True)
    func_formacao = models.CharField('formação acadêmica', max_length=200, null=True, blank=True)
    func_salario = models.DecimalField('salário', max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'funcionario'
        verbose_name = 'Funcionário'
        verbose_name_plural = 'Funcionários'
        ordering = ['func_nome']

    def __str__(self):
        return self.func_nome


class Turma(BaseModel):
    """Turmas/grupos de aulas. Máximo 15 alunos."""
    tur_id = models.AutoField(primary_key=True)
    tur_nome = models.CharField('nome da turma', max_length=100, unique=True)
    tur_horario = models.CharField('horário', max_length=50)

    class Meta:
        db_table = 'turma'
        verbose_name = 'Turma'
        verbose_name_plural = 'Turmas'
        ordering = ['tur_nome']

    def __str__(self):
        return self.tur_nome


class TurmaAlunos(BaseModel):
    """Matrícula de alunos em turmas (N:N). Máximo 15 alunos por turma."""
    tual_id = models.AutoField(primary_key=True)
    tur = models.ForeignKey(Turma, on_delete=models.PROTECT, verbose_name='turma')
    alu = models.ForeignKey(Aluno, on_delete=models.PROTECT, verbose_name='aluno')
    # Campos sem prefixo — conforme Dicionário de Dados
    data_matricula = models.DateField('data de matrícula')
    ativo = models.BooleanField('matrícula ativa', default=True)

    class Meta:
        db_table = 'turma_alunos'
        verbose_name = 'Matrícula'
        verbose_name_plural = 'Matrículas'
        # RN-TUAL-01: aluno não pode estar matriculado duas vezes na mesma turma
        unique_together = [['tur', 'alu']]
        ordering = ['tur', 'alu__alu_nome']

    def __str__(self):
        return f'{self.alu} — {self.tur}'


class FichaAluno(BaseModel):
    """Histórico de avaliações físicas do aluno com data — permite acompanhar evolução."""
    fial_id = models.AutoField(primary_key=True)
    aluno = models.ForeignKey(Aluno, on_delete=models.PROTECT, related_name='fichas', verbose_name='aluno')
    fial_data = models.DateField('data da avaliação')
    fial_peso = models.DecimalField('peso (kg)', max_digits=5, decimal_places=2, null=True, blank=True)
    fial_massa_muscular = models.DecimalField('massa muscular (kg)', max_digits=5, decimal_places=2, null=True, blank=True)
    fial_massa_gorda = models.DecimalField('massa gorda (kg)', max_digits=5, decimal_places=2, null=True, blank=True)
    fial_porcentagem_gordura = models.DecimalField('% gordura', max_digits=5, decimal_places=2, null=True, blank=True)
    fial_circunferencia_abdominal = models.DecimalField(
        'circunferência abdominal (cm)', max_digits=5, decimal_places=2, null=True, blank=True
    )

    class Meta:
        db_table = 'ficha_aluno'
        verbose_name = 'Ficha do Aluno'
        verbose_name_plural = 'Fichas dos Alunos'
        ordering = ['-fial_data']

    def __str__(self):
        return f'{self.aluno} — {self.fial_data}'


class AgendamentoHorario(BaseModel):
    """Pré-agendamento de horários disponíveis dos alunos via site."""
    agho_id = models.AutoField(primary_key=True)
    alu = models.ForeignKey(Aluno, on_delete=models.PROTECT, verbose_name='aluno')
    # Dias separados por vírgula: seg,qua,sex
    agho_dias_disponiveis = models.CharField('dias disponíveis', max_length=100)
    # Horários separados por vírgula: 07:00,17:00
    agho_horarios_disponiveis = models.CharField('horários disponíveis', max_length=200)

    class Meta:
        db_table = 'agendamento_horario'
        verbose_name = 'Agendamento de Horário'
        verbose_name_plural = 'Agendamentos de Horário'

    def __str__(self):
        return f'{self.alu} — {self.agho_dias_disponiveis}'


class AgendamentoTurmas(BaseModel):
    """Pré-cadastro de alunos interessados em turmas via site."""
    agtu_id = models.AutoField(primary_key=True)
    alu = models.ForeignKey(Aluno, on_delete=models.PROTECT, verbose_name='aluno')
    agtu_dias_disponiveis = models.CharField('dias disponíveis', max_length=100)
    agtu_horarios_disponiveis = models.CharField('horários disponíveis', max_length=200)
    agtu_nivelamento = models.CharField('nivelamento', max_length=50, null=True, blank=True)

    class Meta:
        db_table = 'agendamento_turmas'
        verbose_name = 'Agendamento de Turma'
        verbose_name_plural = 'Agendamentos de Turmas'

    def __str__(self):
        return f'{self.alu} — {self.agtu_dias_disponiveis}'
