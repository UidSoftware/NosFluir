import re
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.core.mixins import BaseModel


def validar_pressao_arterial(value):
    """RN019: pressão arterial no formato NNN/NN ou NN/NN."""
    if value and not re.match(r'^\d{2,3}/\d{2}$', value):
        raise ValidationError('Pressão arterial deve estar no formato "120/80" ou "130/85".')


class Exercicio(BaseModel):
    """Biblioteca de exercícios de Pilates e funcional."""
    APARELHO_CHOICES = [
        ('solo', 'Solo'),
        ('reformer', 'Reformer'),
        ('cadillac', 'Cadillac'),
        ('chair', 'Chair'),
        ('barrel', 'Barrel'),
    ]

    exe_id = models.AutoField(primary_key=True)
    exe_nome = models.CharField('nome do exercício', max_length=125)
    # RN023: mesmo exercício em aparelhos diferentes = registros independentes
    exe_aparelho = models.CharField('aparelho', max_length=20, choices=APARELHO_CHOICES)
    exe_descricao_tecnica = models.TextField('descrição técnica', null=True, blank=True)

    class Meta:
        db_table = 'exercicios'
        verbose_name = 'Exercício'
        verbose_name_plural = 'Exercícios'
        ordering = ['exe_nome', 'exe_aparelho']

    def __str__(self):
        return f'{self.exe_nome} ({self.get_exe_aparelho_display()})'


class FichaTreino(BaseModel):
    """Ficha/programa de treino. Exercícios ficam em FichaTreinoExercicios."""
    fitr_id = models.AutoField(primary_key=True)
    fitr_nome = models.CharField('nome da ficha', max_length=150)

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
    ftex_ordem = models.IntegerField('ordem na ficha')
    ftex_repeticoes = models.IntegerField('repetições')
    ftex_series = models.IntegerField('séries', null=True, blank=True)
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
    # FK para Aula usando string — Aula é definida abaixo
    aula_origem = models.ForeignKey(
        'Aula', on_delete=models.PROTECT,
        related_name='creditos_gerados', verbose_name='aula de origem (falta)'
    )
    aula_reposicao = models.ForeignKey(
        'Aula', on_delete=models.SET_NULL,
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


class Aula(BaseModel):
    """
    Registro de aulas ministradas. 1 linha = 1 aluno em 1 aula.
    Constraint: UNIQUE(tur, alu, aul_data, aul_hora_inicio)
    """
    TIPO_PRESENCA_CHOICES = [
        ('regular', 'Regular'),
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

    aul_id = models.AutoField(primary_key=True)
    tur = models.ForeignKey('operacional.Turma', on_delete=models.PROTECT, verbose_name='turma')
    alu = models.ForeignKey('operacional.Aluno', on_delete=models.PROTECT, verbose_name='aluno')
    fitr = models.ForeignKey(
        FichaTreino, on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='ficha de treino'
    )
    cred = models.ForeignKey(
        CreditoReposicao, on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='crédito utilizado'
    )
    aul_data = models.DateField('data da aula')
    aul_hora_inicio = models.TimeField('hora de início')
    aul_hora_final = models.TimeField('hora de término', null=True, blank=True)
    aul_pressao_inicio = models.CharField(
        'pressão inicial', max_length=10, null=True, blank=True,
        validators=[validar_pressao_arterial]
    )
    aul_pressao_final = models.CharField(
        'pressão final', max_length=10, null=True, blank=True,
        validators=[validar_pressao_arterial]
    )
    aul_tipo_presenca = models.CharField(
        'tipo de presença', max_length=20, choices=TIPO_PRESENCA_CHOICES, default='regular'
    )
    aul_tipo_falta = models.CharField(
        'tipo de falta', max_length=20, choices=TIPO_FALTA_CHOICES, null=True, blank=True
    )
    aul_intensidade_esforco = models.IntegerField('intensidade de esforço (0–10)', null=True, blank=True)

    class Meta:
        db_table = 'aulas'
        verbose_name = 'Aula'
        verbose_name_plural = 'Aulas'
        # RN022: evita duplicação de registro de aula
        unique_together = [['tur', 'alu', 'aul_data', 'aul_hora_inicio']]
        ordering = ['-aul_data', '-aul_hora_inicio']

    def __str__(self):
        return f'{self.alu} — {self.tur} — {self.aul_data}'
