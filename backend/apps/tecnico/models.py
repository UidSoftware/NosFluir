import re
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from apps.core.mixins import BaseModel


def validar_pressao_arterial(value):
    """Mantida para compatibilidade com migrations antigas."""
    if value and not re.match(r'^\d{2,3}/\d{2}$', value):
        raise ValidationError('Pressão arterial deve estar no formato "120/80" ou "130/85".')


class Aparelho(BaseModel):
    """Catálogo de aparelhos — substitui ENUM fixo em Exercicio."""
    MODALIDADE_CHOICES = [
        ('pilates', 'Mat Pilates'),
        ('funcional', 'Funcional'),
        ('ambos', 'Ambos'),
    ]

    apar_id = models.AutoField(primary_key=True)
    apar_nome = models.CharField('nome', max_length=100)
    apar_modalidade = models.CharField('modalidade', max_length=20, choices=MODALIDADE_CHOICES)
    apar_ativo = models.BooleanField('ativo', default=True)

    class Meta:
        db_table = 'aparelho'
        verbose_name = 'Aparelho'
        verbose_name_plural = 'Aparelhos'
        ordering = ['apar_modalidade', 'apar_nome']

    def __str__(self):
        return f'{self.apar_nome} ({self.get_apar_modalidade_display()})'


class Acessorio(BaseModel):
    """Catálogo de acessórios usados nos exercícios."""
    acess_id = models.AutoField(primary_key=True)
    acess_nome = models.CharField('nome', max_length=100)
    acess_ativo = models.BooleanField('ativo', default=True)

    class Meta:
        db_table = 'acessorio'
        verbose_name = 'Acessório'
        verbose_name_plural = 'Acessórios'
        ordering = ['acess_nome']

    def __str__(self):
        return self.acess_nome


class Exercicio(BaseModel):
    """Biblioteca de exercícios de Pilates e funcional."""
    MODALIDADE_CHOICES = [
        ('pilates', 'Mat Pilates'),
        ('funcional', 'Funcional'),
    ]

    exe_id = models.AutoField(primary_key=True)
    exe_nome = models.CharField('nome do exercício', max_length=125)
    exe_modalidade = models.CharField('modalidade', max_length=20, choices=MODALIDADE_CHOICES)
    exe_aparelho = models.ForeignKey(
        'Aparelho', on_delete=models.PROTECT,
        null=True, blank=True, verbose_name='aparelho',
        related_name='exercicios'
    )
    exe_acessorio = models.ForeignKey(
        'Acessorio', on_delete=models.PROTECT,
        null=True, blank=True, verbose_name='acessório',
        related_name='exercicios'
    )
    exe_variacao = models.CharField('variação', max_length=100, null=True, blank=True)
    exe_descricao_tecnica = models.TextField('descrição técnica', null=True, blank=True)

    class Meta:
        db_table = 'exercicios'
        verbose_name = 'Exercício'
        verbose_name_plural = 'Exercícios'
        ordering = ['exe_nome']

    def __str__(self):
        aparelho = self.exe_aparelho.apar_nome if self.exe_aparelho_id else 'Sem aparelho'
        return f'{self.exe_nome} ({aparelho})'


class FichaTreino(BaseModel):
    """Ficha/programa de treino. Exercícios ficam em FichaTreinoExercicios."""
    MODALIDADE_CHOICES = [
        ('pilates', 'Mat Pilates'),
        ('funcional', 'Funcional'),
    ]

    fitr_id = models.AutoField(primary_key=True)
    fitr_nome = models.CharField('nome da ficha', max_length=150)
    fitr_modalidade = models.CharField(
        'modalidade', max_length=20, choices=MODALIDADE_CHOICES, null=True, blank=True
    )

    class Meta:
        db_table = 'ficha_treino'
        verbose_name = 'Ficha de Treino'
        verbose_name_plural = 'Fichas de Treino'
        ordering = ['fitr_nome']

    def __str__(self):
        return self.fitr_nome


class FichaTreinoExercicios(BaseModel):
    """N:N entre FichaTreino e Exercicios com dados específicos de execução."""
    ftex_id = models.AutoField(primary_key=True)
    fitr = models.ForeignKey(FichaTreino, on_delete=models.CASCADE, verbose_name='ficha de treino')
    exe = models.ForeignKey(Exercicio, on_delete=models.PROTECT, verbose_name='exercício')
    exe2 = models.ForeignKey(
        Exercicio, on_delete=models.PROTECT,
        null=True, blank=True, verbose_name='exercício combinado (opcional)',
        related_name='fichas_treino_secundario'
    )
    ftex_ordem = models.IntegerField('ordem na ficha')
    ftex_repeticoes = models.IntegerField('repetições')
    ftex_series = models.IntegerField('séries', null=True, blank=True)
    ftex_secao = models.CharField('seção', max_length=100, null=True, blank=True)
    ftex_observacoes = models.TextField('observações', null=True, blank=True)

    class Meta:
        db_table = 'ficha_treino_exercicios'
        verbose_name = 'Exercício da Ficha'
        verbose_name_plural = 'Exercícios da Ficha'
        ordering = ['fitr', 'ftex_ordem']

    def __str__(self):
        return f'{self.fitr} — {self.exe} (ordem {self.ftex_ordem})'


class CreditoReposicao(BaseModel):
    """
    Crédito de reposição gerado quando aluno falta justificadamente.
    Fase 4 — signals de geração automática implementados em signals.py.
    """
    STATUS_CHOICES = [
        ('disponivel', 'Disponível'),
        ('usado', 'Usado'),
        ('expirado', 'Expirado'),
    ]

    cred_id = models.AutoField(primary_key=True)
    alu = models.ForeignKey(
        'operacional.Aluno', on_delete=models.PROTECT, verbose_name='aluno'
    )
    # FK usa string para evitar referência circular (MinistrarAula é definido abaixo)
    aula_origem = models.ForeignKey(
        'MinistrarAula', on_delete=models.PROTECT,
        related_name='creditos_gerados', verbose_name='aula de origem (falta)'
    )
    aula_reposicao = models.ForeignKey(
        'MinistrarAula', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='creditos_utilizados', verbose_name='aula de reposição'
    )
    cred_data_geracao = models.DateTimeField('data de geração', default=timezone.now)
    # RN-CRED-01: expiração = geração + 30 dias (calculado no save)
    cred_data_expiracao = models.DateTimeField('data de expiração')
    cred_usado = models.BooleanField('crédito usado', default=False)
    cred_status = models.CharField('status', max_length=20, choices=STATUS_CHOICES, default='disponivel')

    class Meta:
        db_table = 'creditos_reposicao'
        verbose_name = 'Crédito de Reposição'
        verbose_name_plural = 'Créditos de Reposição'
        ordering = ['cred_data_expiracao']

    def save(self, *args, **kwargs):
        # RN-CRED-01: calcula data de expiração automaticamente se não informada
        if not self.cred_data_expiracao:
            self.cred_data_expiracao = self.cred_data_geracao + timedelta(days=30)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'Crédito {self.alu} — {self.cred_status} (expira {self.cred_data_expiracao.date()})'


class Aulas(BaseModel):
    """
    Aula coletiva — 1 linha por aula. Agregador de MinistrarAula.
    Fase 3.3 — facilita relatórios e histórico de aulas.
    Fase 5 — campos de ciclo: aul_numero_ciclo + aul_posicao_ciclo.
    Constraint: UNIQUE(tur, aul_data, aul_modalidade)
    """
    MODALIDADE_CHOICES = [
        ('pilates', 'Mat Pilates'),
        ('funcional', 'Funcional'),
    ]

    aul_id = models.AutoField(primary_key=True)
    tur = models.ForeignKey(
        'operacional.Turma', on_delete=models.PROTECT, verbose_name='turma'
    )
    func = models.ForeignKey(
        'operacional.Funcionario', on_delete=models.PROTECT,
        null=True, blank=True, verbose_name='professor'
    )
    fitr = models.ForeignKey(
        'FichaTreino', on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='ficha de treino'
    )
    aul_data = models.DateField('data da aula')
    aul_hora_inicio = models.TimeField('hora de início', null=True, blank=True)
    aul_hora_final = models.TimeField('hora de término', null=True, blank=True)
    aul_modalidade = models.CharField('modalidade', max_length=20, choices=MODALIDADE_CHOICES)
    aul_nome = models.CharField(
        'nome/descrição', max_length=150, null=True, blank=True,
        help_text='Ex: "Funcional Seg 17:00" — preenchido automaticamente se deixado em branco'
    )
    aul_numero_ciclo = models.IntegerField('número do ciclo', default=1)
    aul_posicao_ciclo = models.IntegerField('posição no ciclo', null=True, blank=True)

    class Meta:
        db_table = 'aulas'
        verbose_name = 'Aula'
        verbose_name_plural = 'Aulas'
        unique_together = [['tur', 'aul_data', 'aul_modalidade']]
        ordering = ['-aul_data']

    def save(self, *args, **kwargs):
        if not self.aul_nome:
            self.aul_nome = f'{self.get_aul_modalidade_display()} — {self.tur} — {self.aul_data}'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.aul_nome or f'{self.tur} — {self.aul_data}'


class ProgramaTurma(BaseModel):
    """
    Sequência ordenada de fichas de treino para uma turma.
    Fase 5 — define o ciclo: posição 1→N, repete após completar.
    """
    prog_id = models.AutoField(primary_key=True)
    turma = models.ForeignKey(
        'operacional.Turma', on_delete=models.PROTECT,
        related_name='programa', verbose_name='turma'
    )
    fitr = models.ForeignKey(
        'FichaTreino', on_delete=models.PROTECT,
        related_name='programas', verbose_name='ficha de treino'
    )
    prog_ordem = models.IntegerField('posição no ciclo')

    class Meta:
        db_table = 'programa_turma'
        verbose_name = 'Programa da Turma'
        verbose_name_plural = 'Programas das Turmas'
        unique_together = [
            ('turma', 'prog_ordem'),
            ('turma', 'fitr'),
        ]
        ordering = ['turma', 'prog_ordem']

    def __str__(self):
        return f'{self.turma} — Posição {self.prog_ordem}: {self.fitr}'


class RegistroExercicioAluno(BaseModel):
    """
    Registro individualizado de exercício por aluno em uma aula.
    Fase 5 — base para relatórios de evolução de carga por ciclo.
    """
    reg_id = models.AutoField(primary_key=True)
    ministrar_aula = models.ForeignKey(
        'MinistrarAula', on_delete=models.PROTECT,
        related_name='registros_exercicios', verbose_name='registro de aula'
    )
    ftex = models.ForeignKey(
        'FichaTreinoExercicios', on_delete=models.PROTECT,
        related_name='registros_alunos', verbose_name='exercício da ficha'
    )
    reg_series      = models.IntegerField('séries', null=True, blank=True)
    reg_repeticoes  = models.IntegerField('repetições', null=True, blank=True)
    reg_carga       = models.CharField('carga', max_length=50, null=True, blank=True)
    reg_observacoes = models.TextField('observações', null=True, blank=True)

    class Meta:
        db_table = 'registro_exercicio_aluno'
        verbose_name = 'Registro de Exercício'
        verbose_name_plural = 'Registros de Exercícios'
        unique_together = [('ministrar_aula', 'ftex')]
        ordering = ['ftex__ftex_ordem']

    def __str__(self):
        return f'{self.ministrar_aula.alu} — {self.ftex}'


class MinistrarAula(BaseModel):
    """
    Registro de aulas ministradas. 1 linha = 1 aluno em 1 aula.
    Fase 3.2 — campos PAS/PAD separados, FC, PSE Borg 6-20.
    Fase 3.3 — FK opcional para Aulas (retrocompatível).
    Constraint: UNIQUE(tur, alu, miau_data, miau_hora_inicio)
    """
    TIPO_PRESENCA_CHOICES = [
        ('presente', 'Presente'),
        ('falta', 'Falta'),
        ('reposicao', 'Reposição'),
    ]
    TIPO_FALTA_CHOICES = [
        ('sem_aviso', 'Sem aviso'),
        ('justificada', 'Justificada (1h–48h antes)'),
        ('atestado', 'Atestado médico'),
        # cenario3: aviso com mais de 48h — pendente decisão com clientes
        ('cenario3', 'Aviso com mais de 48h (pendente)'),
    ]

    miau_id = models.AutoField(primary_key=True)
    aula = models.ForeignKey(
        Aulas, on_delete=models.PROTECT,
        verbose_name='aula',
        related_name='registros'
    )
    tur = models.ForeignKey('operacional.Turma', on_delete=models.PROTECT, verbose_name='turma')
    alu = models.ForeignKey('operacional.Aluno', on_delete=models.PROTECT, verbose_name='aluno')
    func = models.ForeignKey(
        'operacional.Funcionario', on_delete=models.PROTECT,
        null=True, blank=True, verbose_name='professor'
    )
    fitr = models.ForeignKey(
        FichaTreino, on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='ficha de treino'
    )
    cred = models.ForeignKey(
        CreditoReposicao, on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='crédito utilizado'
    )
    miau_data = models.DateField('data da aula')

    # Pressão arterial — PAS e PAD separados (inteiros em mmHg)
    miau_pas_inicio = models.IntegerField('PAS inicial (mmHg)', null=True, blank=True)
    miau_pad_inicio = models.IntegerField('PAD inicial (mmHg)', null=True, blank=True)
    miau_pas_final = models.IntegerField('PAS final (mmHg)', null=True, blank=True)
    miau_pad_final = models.IntegerField('PAD final (mmHg)', null=True, blank=True)

    # Frequência cardíaca
    miau_fc_inicio = models.IntegerField('FC inicial (bpm)', null=True, blank=True)
    miau_fc_final = models.IntegerField('FC final (bpm)', null=True, blank=True)

    # PSE — Escala de Borg (6-20)
    miau_pse = models.IntegerField(
        'PSE — Escala de Borg (6–20)', null=True, blank=True,
        validators=[MinValueValidator(6), MaxValueValidator(20)]
    )
    miau_observacoes = models.TextField('observações', null=True, blank=True)

    miau_tipo_presenca = models.CharField(
        'tipo de presença', max_length=20, choices=TIPO_PRESENCA_CHOICES, default='presente'
    )
    miau_tipo_falta = models.CharField(
        'tipo de falta', max_length=20, choices=TIPO_FALTA_CHOICES, null=True, blank=True
    )

    class Meta:
        db_table = 'ministrar_aula'
        verbose_name = 'Registro de Aula'
        verbose_name_plural = 'Registros de Aula'
        unique_together = [['aula', 'alu']]
        ordering = ['-aula__aul_data']

    def __str__(self):
        return f'{self.alu} — {self.tur} — {self.miau_data}'
