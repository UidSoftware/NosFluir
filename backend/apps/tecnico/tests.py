from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from apps.operacional.models import Aluno, Funcionario, Profissao, Turma, TurmaAlunos
from .models import Aula, CreditoReposicao

User = get_user_model()


def criar_usuario():
    return User.objects.create_superuser(
        email='admin@fluir.test',
        password='fluir@2026',
    )


def criar_aluno(cpf='12345678901'):
    return Aluno.objects.create(
        alu_nome='Aluno Teste',
        alu_documento=cpf,
        alu_data_nascimento='1990-01-01',
    )


def criar_funcionario():
    prof = Profissao.objects.get_or_create(prof_nome='Instrutor')[0]
    return Funcionario.objects.create(
        prof=prof,
        func_nome='Professora Teste',
        func_documento='98765432100',
        func_salario=Decimal('3000.00'),
    )


def criar_turma():
    return Turma.objects.create(
        tur_nome='Pilates Teste',
        tur_horario='Seg/Qua 07:00',
    )


def criar_matricula(turma, aluno):
    return TurmaAlunos.objects.create(
        tur=turma,
        alu=aluno,
        data_matricula='2026-01-01',
        ativo=True,
    )


# ── Testes de Caixa Branca ────────────────────────────────────────────────────

class AulaValidacaoTest(TestCase):
    """TB016–TB019 — validações da Aula via API."""

    def setUp(self):
        self.user = criar_usuario()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.aluno = criar_aluno()
        self.func = criar_funcionario()
        self.turma = criar_turma()
        criar_matricula(self.turma, self.aluno)

    def _payload_base(self, **kwargs):
        base = {
            'tur': self.turma.tur_id,
            'alu': self.aluno.alu_id,
            'func': self.func.func_id,
            'aul_data': '2026-04-06',
            'aul_hora_inicio': '07:00',
            'aul_hora_final': '08:00',
            'aul_tipo_presenca': 'regular',
        }
        base.update(kwargs)
        return base

    def test_TB016_pressao_valida(self):
        """TB016: pressão "120/80" → salvo sem erro (HTTP 201)"""
        resp = self.client.post('/api/aulas/', self._payload_base(
            aul_pressao_inicio='120/80',
            aul_pressao_final='115/75',
        ))
        self.assertEqual(resp.status_code, 201, resp.data)

    def test_TB017_pressao_invalida(self):
        """TB017: pressão "9999/99" → HTTP 400"""
        resp = self.client.post('/api/aulas/', self._payload_base(
            aul_pressao_inicio='9999/99',
        ))
        self.assertEqual(resp.status_code, 400)

    def test_TB018_intensidade_acima_de_10(self):
        """TB018: intensidade=11 → HTTP 400"""
        resp = self.client.post('/api/aulas/', self._payload_base(
            aul_intensidade_esforco=11,
        ))
        self.assertEqual(resp.status_code, 400)

    def test_TB019_hora_final_menor_que_inicio(self):
        """TB019: hora_final < hora_inicio → HTTP 400"""
        resp = self.client.post('/api/aulas/', self._payload_base(
            aul_hora_inicio='08:00',
            aul_hora_final='07:00',
        ))
        self.assertEqual(resp.status_code, 400)

    def test_aula_salva_com_professor(self):
        """Aula deve aceitar e retornar campo func (professor)."""
        resp = self.client.post('/api/aulas/', self._payload_base())
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(resp.data['func'], self.func.func_id)
        self.assertEqual(resp.data['func_nome'], self.func.func_nome)

    def test_aula_sem_professor_permitido(self):
        """Aula sem professor (func=null) deve ser aceita — nullable."""
        payload = self._payload_base()
        payload.pop('func')
        resp = self.client.post('/api/aulas/', payload)
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertIsNone(resp.data['func'])


class CreditoReposicaoModelTest(TestCase):
    """TB020 — cálculo automático de data de expiração."""

    def test_TB020_data_expiracao_calculada(self):
        """TB020: criar crédito sem data_expiracao → +30 dias automático"""
        aluno = criar_aluno()
        turma = criar_turma()
        criar_matricula(turma, aluno)
        aula = Aula.objects.create(
            tur=turma,
            alu=aluno,
            aul_data='2026-04-06',
            aul_hora_inicio='07:00',
            aul_tipo_presenca='falta',
            aul_tipo_falta='justificada',
        )
        credito = CreditoReposicao.objects.create(
            alu=aluno,
            aula_origem=aula,
        )
        delta = credito.cred_data_expiracao.date() - credito.cred_data_geracao.date()
        self.assertEqual(delta.days, 30)


class CreditoSignalTest(TestCase):
    """TB021–TB024 — signals de geração automática de créditos."""

    def setUp(self):
        self.user = criar_usuario()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.aluno = criar_aluno()
        self.turma = criar_turma()
        criar_matricula(self.turma, self.aluno)

    def _registrar_falta(self, tipo_falta, cpf_extra=None):
        aluno = criar_aluno(cpf=cpf_extra) if cpf_extra else self.aluno
        return Aula.objects.create(
            tur=self.turma,
            alu=aluno,
            aul_data='2026-04-06',
            aul_hora_inicio='07:00',
            aul_tipo_presenca='falta',
            aul_tipo_falta=tipo_falta,
        )

    def test_TB021_falta_justificada_gera_credito(self):
        """TB021: falta justificada → CreditoReposicao criado automaticamente"""
        antes = CreditoReposicao.objects.filter(alu=self.aluno).count()
        self._registrar_falta('justificada')
        self.assertEqual(
            CreditoReposicao.objects.filter(alu=self.aluno).count(),
            antes + 1
        )

    def test_TB022_atestado_gera_credito(self):
        """TB022: falta com atestado → CreditoReposicao criado automaticamente"""
        antes = CreditoReposicao.objects.filter(alu=self.aluno).count()
        self._registrar_falta('atestado')
        self.assertEqual(
            CreditoReposicao.objects.filter(alu=self.aluno).count(),
            antes + 1
        )

    def test_TB023_sem_aviso_nao_gera_credito(self):
        """TB023: falta sem aviso → nenhum crédito criado"""
        antes = CreditoReposicao.objects.filter(alu=self.aluno).count()
        self._registrar_falta('sem_aviso')
        self.assertEqual(
            CreditoReposicao.objects.filter(alu=self.aluno).count(),
            antes
        )

    def test_TB024_limite_3_creditos(self):
        """TB024: aluno já com 3 créditos disponíveis → nenhum novo criado"""
        # Cria 3 créditos iniciais via faltas justificadas em datas diferentes
        for i in range(3):
            Aula.objects.create(
                tur=self.turma,
                alu=self.aluno,
                aul_data=f'2026-03-0{i+1}',
                aul_hora_inicio='07:00',
                aul_tipo_presenca='falta',
                aul_tipo_falta='justificada',
            )
        self.assertEqual(
            CreditoReposicao.objects.filter(alu=self.aluno, cred_status='disponivel').count(),
            3
        )

        # Registra 4ª falta — não deve gerar crédito
        Aula.objects.create(
            tur=self.turma,
            alu=self.aluno,
            aul_data='2026-03-10',
            aul_hora_inicio='07:00',
            aul_tipo_presenca='falta',
            aul_tipo_falta='justificada',
        )
        self.assertEqual(
            CreditoReposicao.objects.filter(alu=self.aluno, cred_status='disponivel').count(),
            3
        )


# ── Testes de integração ─────────────────────────────────────────────────────

class IntegracaoFluxoAulaTest(TestCase):
    """TI002 — fluxo completo: falta → crédito → reposição."""

    def setUp(self):
        self.user = criar_usuario()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.aluno = criar_aluno()
        self.turma = criar_turma()
        self.func = criar_funcionario()
        criar_matricula(self.turma, self.aluno)

    def test_TI002_fluxo_falta_credito_reposicao(self):
        """TI002: registrar falta justificada → crédito criado → usar em reposição"""
        # 1. Registra falta justificada via API
        resp = self.client.post('/api/aulas/', {
            'tur': self.turma.tur_id,
            'alu': self.aluno.alu_id,
            'func': self.func.func_id,
            'aul_data': '2026-04-01',
            'aul_hora_inicio': '07:00',
            'aul_hora_final': '08:00',
            'aul_tipo_presenca': 'falta',
            'aul_tipo_falta': 'justificada',
        })
        self.assertEqual(resp.status_code, 201, resp.data)

        # 2. Verifica que crédito foi criado
        creditos = CreditoReposicao.objects.filter(
            alu=self.aluno, cred_status='disponivel'
        )
        self.assertEqual(creditos.count(), 1)
        credito = creditos.first()

        # 3. Usa o crédito em uma reposição
        resp2 = self.client.post('/api/aulas/', {
            'tur': self.turma.tur_id,
            'alu': self.aluno.alu_id,
            'func': self.func.func_id,
            'cred': credito.cred_id,
            'aul_data': '2026-04-08',
            'aul_hora_inicio': '07:00',
            'aul_hora_final': '08:00',
            'aul_tipo_presenca': 'reposicao',
        })
        self.assertEqual(resp2.status_code, 201, resp2.data)

        # 4. Crédito deve estar marcado como usado
        credito.refresh_from_db()
        self.assertEqual(credito.cred_status, 'usado')
        self.assertTrue(credito.cred_usado)
