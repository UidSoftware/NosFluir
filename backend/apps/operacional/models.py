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
    alu_contato_emergencia = models.CharField('contato de emergência (telefone)', max_length=20, null=True, blank=True)
    alu_doencas_cronicas = models.TextField('doenças crônicas', null=True, blank=True)
    alu_medicamentos = models.TextField('medicamentos em uso', null=True, blank=True)
    alu_ativo = models.BooleanField('ativo', default=True)

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
    MODALIDADE_CHOICES = [
        ('pilates', 'Mat Pilates'),
        ('funcional', 'Funcional'),
    ]

    tur_id = models.AutoField(primary_key=True)
    tur_nome = models.CharField('nome da turma', max_length=100, unique=True)
    tur_horario = models.CharField('horário', max_length=50)
    tur_modalidade = models.CharField(
        'modalidade', max_length=20, choices=MODALIDADE_CHOICES,
        null=True, blank=True
    )

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


class AvisoFalta(BaseModel):
    """
    Aviso de falta de aluno — pode ser registrado antes, durante ou após a aula.
    Fase 8 — gera CreditoReposicao via signal quando elegível.
    """
    TIPO_CHOICES = [
        ('justificada', 'Justificada'),
        ('atestado', 'Atestado Médico'),
    ]

    avi_id = models.AutoField(primary_key=True)
    aluno = models.ForeignKey(
        'Aluno', on_delete=models.PROTECT, related_name='avisos_falta', verbose_name='aluno'
    )
    turma = models.ForeignKey(
        'Turma', on_delete=models.PROTECT, related_name='avisos_falta', verbose_name='turma'
    )
    avi_data_hora_aviso = models.DateTimeField('quando o aluno avisou')
    avi_data_aula = models.DateField('data da aula')
    avi_tipo = models.CharField('tipo', max_length=20, choices=TIPO_CHOICES)
    avi_antecedencia_horas = models.DecimalField(
        'antecedência (horas)', max_digits=6, decimal_places=2, null=True, blank=True
    )
    avi_gera_credito = models.BooleanField('gera crédito?', default=False)
    avi_observacoes = models.TextField('observações', null=True, blank=True)

    class Meta:
        db_table = 'aviso_falta'
        verbose_name = 'Aviso de Falta'
        verbose_name_plural = 'Avisos de Falta'
        ordering = ['-avi_data_hora_aviso']

    def save(self, *args, **kwargs):
        from datetime import datetime
        import re

        hora_aula = self._extrair_hora_turma()
        if hora_aula and self.avi_data_aula:
            dt_aula = datetime.combine(self.avi_data_aula, hora_aula)
            dt_aviso = self.avi_data_hora_aviso
            # Normaliza timezone: remove tzinfo para comparação ingênua
            if hasattr(dt_aviso, 'tzinfo') and dt_aviso.tzinfo is not None:
                from django.utils import timezone as tz
                dt_aula = tz.make_aware(dt_aula, dt_aviso.tzinfo)
            diff = dt_aula - dt_aviso
            self.avi_antecedencia_horas = round(diff.total_seconds() / 3600, 2)

        if self.avi_tipo == 'atestado':
            self.avi_gera_credito = True
        elif self.avi_antecedencia_horas is not None:
            # Entre 1h e 48h → gera crédito; >48h pendente decisão → não gera
            self.avi_gera_credito = bool(1 <= self.avi_antecedencia_horas <= 48)
        else:
            self.avi_gera_credito = False

        super().save(*args, **kwargs)

    def _extrair_hora_turma(self):
        """Extrai time do tur_horario ('Seg/Qua 17:00' → time(17, 0))."""
        import re
        from datetime import time
        if not self.turma_id:
            return None
        match = re.search(r'(\d{2}):(\d{2})', self.turma.tur_horario)
        if match:
            return time(int(match.group(1)), int(match.group(2)))
        return None

    def __str__(self):
        return f'Aviso {self.aluno} — {self.avi_data_aula} ({self.avi_tipo})'


class SlotExperimental(BaseModel):
    """Horários disponíveis para aula experimental — cadastrado pelo admin."""
    DIA_CHOICES = [
        ('seg', 'Segunda-feira'),
        ('ter', 'Terça-feira'),
        ('qua', 'Quarta-feira'),
        ('qui', 'Quinta-feira'),
        ('sex', 'Sexta-feira'),
    ]
    MODALIDADE_CHOICES = [
        ('pilates',   'Mat Pilates'),
        ('funcional', 'Funcional'),
        ('ambos',     'Ambos'),
    ]

    slot_id          = models.AutoField(primary_key=True)
    slot_dia_semana  = models.CharField(max_length=3, choices=DIA_CHOICES)
    slot_hora        = models.TimeField()
    slot_modalidade  = models.CharField(max_length=20, choices=MODALIDADE_CHOICES, default='ambos')
    slot_vagas       = models.IntegerField(default=2)
    slot_ativo       = models.BooleanField(default=True)

    class Meta:
        db_table = 'slot_experimental'
        verbose_name = 'Slot Experimental'
        verbose_name_plural = 'Slots Experimentais'
        unique_together = [('slot_dia_semana', 'slot_hora', 'slot_modalidade')]
        ordering = ['slot_dia_semana', 'slot_hora']

    @property
    def vagas_disponiveis(self):
        from datetime import date
        ocupadas = self.agendamentos.filter(
            age_status__in=['pendente', 'confirmado'],
            age_data_agendada__gte=date.today(),
            deleted_at__isnull=True,
        ).count()
        return max(0, self.slot_vagas - ocupadas)

    def __str__(self):
        return f"{self.get_slot_dia_semana_display()} {self.slot_hora} — {self.get_slot_modalidade_display()}"


class AgendamentoExperimental(BaseModel):
    """Solicitação de aula experimental — criado pelo site ou sistema."""
    STATUS_CHOICES = [
        ('pendente',   'Pendente'),
        ('confirmado', 'Confirmado'),
        ('realizado',  'Realizado'),
        ('cancelado',  'Cancelado'),
        ('faltou',     'Faltou'),
    ]
    MODALIDADE_CHOICES = [
        ('pilates',   'Mat Pilates'),
        ('funcional', 'Funcional'),
        ('ambos',     'Ambos'),
    ]

    age_id              = models.AutoField(primary_key=True)
    slot                = models.ForeignKey(
        'SlotExperimental',
        on_delete=models.PROTECT,
        related_name='agendamentos',
        null=True, blank=True,
    )
    age_nome            = models.CharField(max_length=200)
    age_telefone        = models.CharField(max_length=20)
    age_nascimento      = models.DateField()
    age_modalidade      = models.CharField(max_length=20, choices=MODALIDADE_CHOICES)
    age_disponibilidade = models.TextField(null=True, blank=True)
    age_problema_saude  = models.TextField(null=True, blank=True)
    age_data_agendada   = models.DateField()
    age_hora_agendada   = models.TimeField()
    age_status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    age_origem          = models.CharField(
        max_length=20,
        choices=[('site', 'Site'), ('sistema', 'Sistema')],
        default='site',
    )
    age_observacoes     = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'agendamento_experimental'
        verbose_name = 'Agendamento Experimental'
        verbose_name_plural = 'Agendamentos Experimentais'
        ordering = ['age_data_agendada', 'age_hora_agendada']

    def __str__(self):
        return f"{self.age_nome} — {self.age_data_agendada} {self.age_hora_agendada}"


class AulaExperimental(BaseModel):
    """Realização da aula experimental com anamnese, testes físicos e decisão de cadastro."""
    MODALIDADE_CHOICES = [
        ('pilates',   'Mat Pilates'),
        ('funcional', 'Funcional'),
        ('ambos',     'Ambos'),
    ]

    aexp_id     = models.AutoField(primary_key=True)
    agendamento = models.OneToOneField(
        'AgendamentoExperimental',
        on_delete=models.PROTECT,
        related_name='aula_experimental',
    )
    func        = models.ForeignKey(
        'Funcionario',
        on_delete=models.PROTECT,
        related_name='aulas_experimentais',
    )
    aexp_data       = models.DateField()
    aexp_modalidade = models.CharField(max_length=20, choices=MODALIDADE_CHOICES)

    # Anamnese
    aexp_profissao        = models.CharField(max_length=100, null=True, blank=True)
    aexp_doencas_cronicas = models.TextField(null=True, blank=True)
    aexp_lesoes_dores     = models.TextField(null=True, blank=True)
    aexp_objetivo         = models.TextField(null=True, blank=True)

    # Testes Físicos (Pré Aula)
    aexp_agachamento   = models.TextField(null=True, blank=True)
    aexp_flexibilidade = models.TextField(null=True, blank=True)
    aexp_equilibrio    = models.TextField(null=True, blank=True)
    aexp_coordenacao   = models.TextField(null=True, blank=True)
    aexp_observacoes   = models.TextField(null=True, blank=True)

    # Decisão
    aexp_cadastrou_aluno = models.BooleanField(default=False)
    aluno                = models.ForeignKey(
        'Aluno',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='aula_experimental_origem',
    )

    class Meta:
        db_table = 'aula_experimental'
        verbose_name = 'Aula Experimental'
        verbose_name_plural = 'Aulas Experimentais'
        ordering = ['-aexp_data']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Ao registrar a aula, o agendamento passa para 'realizado'
        self.agendamento.age_status = 'realizado'
        self.agendamento.save(update_fields=['age_status'])

    def __str__(self):
        return f"Experimental {self.agendamento.age_nome} — {self.aexp_data}"


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
