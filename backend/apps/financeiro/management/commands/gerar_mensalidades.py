import calendar
from datetime import date

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.financeiro.models import AlunoPlano, ContasReceber

MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
         'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']


def calcular_proximo_mes(referencia=None):
    hoje = referencia or date.today()
    if hoje.month == 12:
        return 1, hoje.year + 1
    return hoje.month + 1, hoje.year


def data_vencimento_segura(ano, mes, dia):
    ultimo = calendar.monthrange(ano, mes)[1]
    return date(ano, mes, min(dia, ultimo))


def executar(mes, ano, dry_run=False):
    planos_ativos = (
        AlunoPlano.objects
        .filter(aplano_ativo=True, aplano_dia_vencimento__isnull=False)
        .select_related('aluno', 'plano', 'plano__serv')
    )

    criadas = 0
    ignoradas = 0
    detalhes = []

    for ap in planos_ativos:
        vencimento = data_vencimento_segura(ano, mes, ap.aplano_dia_vencimento)

        # respeita data_fim do contrato
        if ap.aplano_data_fim and ap.aplano_data_fim < vencimento:
            ignoradas += 1
            continue

        # idempotente — não duplica se já existe para este aplano no mês/ano
        ja_existe = ContasReceber.objects.filter(
            aplano=ap,
            rec_data_vencimento__year=ano,
            rec_data_vencimento__month=mes,
        ).exists()

        if ja_existe:
            ignoradas += 1
            continue

        descricao = f"Mensalidade {ap.plano.serv.serv_nome} {MESES[mes-1]}/{ano}"
        valor = ap.plano.plan_valor_plano

        if not dry_run:
            ContasReceber.objects.create(
                alu=ap.aluno,
                aplano=ap,
                rec_tipo='mensalidade',
                rec_plano_tipo=ap.plano.plan_tipo_plano,
                rec_data_emissao=timezone.now(),
                rec_data_vencimento=vencimento,
                rec_descricao=descricao,
                rec_quantidade=1,
                rec_valor_unitario=valor,
                rec_desconto=0,
                rec_valor_total=valor,
                rec_status='pendente',
            )

        criadas += 1
        detalhes.append(f"  {ap.aluno} — {descricao} — R$ {valor} — vence {vencimento.strftime('%d/%m/%Y')}")

    return criadas, ignoradas, detalhes


class Command(BaseCommand):
    help = 'Gera ContasReceber de mensalidade para todos os AlunoPlanos ativos no mês seguinte (ou --mes/--ano especificado).'

    def add_arguments(self, parser):
        parser.add_argument('--mes',  type=int, help='Mês alvo (1-12). Default: próximo mês.')
        parser.add_argument('--ano',  type=int, help='Ano alvo. Default: ano do próximo mês.')
        parser.add_argument('--dry-run', action='store_true', help='Simula sem gravar.')

    def handle(self, *args, **options):
        mes = options.get('mes')
        ano = options.get('ano')
        dry_run = options.get('dry_run', False)

        if not mes or not ano:
            mes, ano = calcular_proximo_mes()

        modo = '[DRY-RUN] ' if dry_run else ''
        self.stdout.write(f"{modo}Gerando mensalidades para {MESES[mes-1]}/{ano}...\n")

        criadas, ignoradas, detalhes = executar(mes, ano, dry_run=dry_run)

        for linha in detalhes:
            self.stdout.write(linha)

        self.stdout.write(self.style.SUCCESS(
            f"\n{modo}Criadas: {criadas} | Ignoradas (já existiam ou contrato encerrado): {ignoradas}"
        ))
