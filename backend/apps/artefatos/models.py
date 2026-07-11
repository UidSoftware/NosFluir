from django.db import models


class Artefato(models.Model):
    TIPO = [
        ('levantamento_requisitos', 'Levantamento de Requisitos'),
        ('uml_usecase', 'UML — Casos de Uso'),
        ('uml_classes', 'UML — Classes'),
        ('uml_activity', 'UML — Atividades'),
        ('uml_sequencia', 'UML — Sequência'),
        ('uml_estado', 'UML — Estado'),
        ('uml_componentes', 'UML — Componentes'),
        ('uml_implantacao', 'UML — Implantação'),
        ('dicionario_dados', 'Dicionário de Dados'),
        ('regras_negocio', 'Regras de Negócio'),
        ('design_system', 'Design System'),
        ('adr', 'ADR'),
        ('contrato_servico', 'Contrato de Serviço (documento)'),
        ('especificacao_hotfix', 'Especificação de Hotfix'),
        ('especificacao_ui_hotfix', 'Especificação de UI (Hotfix)'),
        ('relatorio_qa', 'Relatório de QA'),
        ('deploy_info', 'Informações de Deploy'),
        ('outro', 'Outro'),
    ]
    AGENTE = [
        ('planner', 'Planner'),
        ('analista', 'Analista'),
        ('analista_uml', 'Analista UML'),
        ('blueprint', 'Blueprint'),
        ('brush', 'Brush'),
        ('doc_generator', 'Doc Generator'),
        ('forge', 'Forge'),
        ('loom', 'Loom'),
        ('sentinel', 'Sentinel'),
        ('pilot', 'Pilot'),
        ('hotfix', 'Hotfix'),
    ]

    tipo         = models.CharField(max_length=30, choices=TIPO)
    agente       = models.CharField(max_length=20, choices=AGENTE)
    titulo       = models.CharField(max_length=200)
    conteudo     = models.TextField(blank=True)
    commit_hash  = models.CharField(max_length=40, blank=True)
    deploy_url   = models.URLField(blank=True)
    status       = models.CharField(max_length=30, blank=True)

    criado_em    = models.DateTimeField(auto_now_add=True)
    ativo        = models.BooleanField(default=True)

    class Meta:
        ordering = ['-criado_em']
        verbose_name = 'Artefato'
        verbose_name_plural = 'Artefatos'

    def __str__(self):
        return f'[{self.agente}] {self.titulo}'
