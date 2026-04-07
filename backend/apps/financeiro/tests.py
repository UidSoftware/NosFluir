from decimal import Decimal

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.operacional.models import Aluno, Funcionario, Profissao
from .models import (
    ContasPagar, ContasReceber, FolhaPagamento,
    Fornecedor, LivroCaixa, PlanosPagamentos, ServicoProduto,
)

User = get_user_model()


def criar_usuario():
    return User.objects.create_superuser(
        email='admin@fluir.test',
        password='fluir@2026',
        first_name='Admin',
        last_name='Teste',
    )


def criar_aluno():
    return Aluno.objects.create(
        alu_nome='Aluno Teste',
        alu_documento='12345678901',
        alu_data_nascimento='1990-01-01',
    )


def criar_funcionario():
    prof = Profissao.objects.create(prof_nome='Instrutor')
    return Funcionario.objects.create(
        prof=prof,
        func_nome='Func Teste',
        func_documento='98765432100',
        func_salario=Decimal('3000.00'),
    )


def criar_fornecedor():
    return Fornecedor.objects.create(
        forn_nome_empresa='Fornecedor Teste',
        forn_cnpj='12345678000190',
    )


def criar_servico():
    return ServicoProduto.objects.create(
        serv_nome='Pilates Mensal',
        serv_valor_base=Decimal('350.00'),
        serv_tipo='servico',
    )


# ── Testes de Caixa Branca ────────────────────────────────────────────────────

class ContasPagarSerializerTest(TestCase):
    """TB001 — valor_total calculado automaticamente."""

    def test_TB001_valor_total_calculado(self):
        """TB001: qtd=2, valor_unit=50.00 → valor_total=100.00"""
        user = criar_usuario()
        forn = criar_fornecedor()
        serv = criar_servico()
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.post('/api/contas-pagar/', {
            'forn': forn.forn_id,
            'serv': serv.serv_id,
            'pag_data_emissao': '2026-04-01',
            'pag_data_vencimento': '2026-04-30',
            'pag_descricao': 'Teste TB001',
            'pag_quantidade': 2,
            'pag_valor_unitario': '50.00',
            'pag_status': 'pendente',
        })
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(Decimal(resp.data['pag_valor_total']), Decimal('100.00'))


class ContasReceberSerializerTest(TestCase):
    """TB002, TB003 — cálculo de valor_total com desconto."""

    def setUp(self):
        self.user = criar_usuario()
        self.aluno = criar_aluno()
        self.serv = criar_servico()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_TB002_valor_total_com_desconto(self):
        """TB002: qtd=1, valor=150.00, desconto=10.00 → total=140.00"""
        resp = self.client.post('/api/contas-receber/', {
            'alu': self.aluno.alu_id,
            'serv': self.serv.serv_id,
            'rec_data_emissao': '2026-04-01',
            'rec_data_vencimento': '2026-04-30',
            'rec_descricao': 'Teste TB002',
            'rec_quantidade': 1,
            'rec_valor_unitario': '150.00',
            'rec_desconto': '10.00',
            'rec_status': 'pendente',
        })
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(Decimal(resp.data['rec_valor_total']), Decimal('140.00'))

    def test_TB003_desconto_maior_que_valor(self):
        """TB003: desconto > valor_total → HTTP 400"""
        resp = self.client.post('/api/contas-receber/', {
            'alu': self.aluno.alu_id,
            'serv': self.serv.serv_id,
            'rec_data_emissao': '2026-04-01',
            'rec_data_vencimento': '2026-04-30',
            'rec_descricao': 'Teste TB003',
            'rec_quantidade': 1,
            'rec_valor_unitario': '100.00',
            'rec_desconto': '200.00',
            'rec_status': 'pendente',
        })
        self.assertEqual(resp.status_code, 400)


class FolhaPagamentoTest(TestCase):
    """TB004 — valor_liquido calculado automaticamente."""

    def test_TB004_valor_liquido(self):
        """TB004: salario=3000, descontos=300 → liquido=2700"""
        user = criar_usuario()
        func = criar_funcionario()
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.post('/api/folha-pagamento/', {
            'func': func.func_id,
            'fopa_mes_referencia': 4,
            'fopa_ano_referencia': 2026,
            'fopa_salario_base': '3000.00',
            'fopa_descontos': '300.00',
            'fopa_status': 'pendente',
        })
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(Decimal(resp.data['fopa_valor_liquido']), Decimal('2700.00'))


class LivroCaixaImutavelTest(TestCase):
    """TB005, TB006 — LivroCaixa imutável (ReadCreateMixin)."""

    def setUp(self):
        self.user = criar_usuario()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        # Cria um lançamento diretamente no modelo
        self.lancamento = LivroCaixa.objects.create(
            lica_tipo_lancamento='entrada',
            lica_historico='Teste',
            lica_valor=Decimal('100.00'),
            lica_categoria='outros',
            lica_origem_tipo='manual',
            lica_origem_id=0,
            lica_saldo_anterior=Decimal('0.00'),
            lica_saldo_atual=Decimal('100.00'),
        )

    def test_TB005_update_retorna_405(self):
        """TB005: PUT/PATCH em LivroCaixa → HTTP 405 (ReadCreateMixin bloqueia update)"""
        resp = self.client.patch(
            f'/api/livro-caixa/{self.lancamento.lica_id}/',
            {'lica_historico': 'editado'}
        )
        self.assertEqual(resp.status_code, 405)

    def test_TB006_delete_retorna_405(self):
        """TB006: DELETE em LivroCaixa → HTTP 405 (ReadCreateMixin bloqueia delete)"""
        resp = self.client.delete(f'/api/livro-caixa/{self.lancamento.lica_id}/')
        self.assertEqual(resp.status_code, 405)


class LivroCaixaSignalTest(TestCase):
    """TB007, TB008, TB009, TB010 — signals automáticos do LivroCaixa."""

    def setUp(self):
        self.user = criar_usuario()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.forn = criar_fornecedor()
        self.serv = criar_servico()
        self.aluno = criar_aluno()

    def test_TB007_signal_contaspagar_cria_lancamento(self):
        """TB007: marcar ContasPagar como pago → lançamento saída no LivroCaixa"""
        resp = self.client.post('/api/contas-pagar/', {
            'forn': self.forn.forn_id,
            'serv': self.serv.serv_id,
            'pag_data_emissao': '2026-04-01',
            'pag_data_vencimento': '2026-04-30',
            'pag_descricao': 'Teste TB007',
            'pag_quantidade': 1,
            'pag_valor_unitario': '100.00',
            'pag_status': 'pendente',
        })
        pag_id = resp.data['pag_id']
        antes = LivroCaixa.objects.count()

        self.client.patch(f'/api/contas-pagar/{pag_id}/', {
            'pag_status': 'pago',
            'pag_data_pagamento': '2026-04-06',
        })

        self.assertEqual(LivroCaixa.objects.count(), antes + 1)
        lancamento = LivroCaixa.objects.order_by('-lica_id').first()
        self.assertEqual(lancamento.lica_tipo_lancamento, 'saida')

    def test_TB008_signal_contasreceber_cria_lancamento(self):
        """TB008: marcar ContasReceber como recebido → lançamento entrada no LivroCaixa"""
        resp = self.client.post('/api/contas-receber/', {
            'alu': self.aluno.alu_id,
            'serv': self.serv.serv_id,
            'rec_data_emissao': '2026-04-01',
            'rec_data_vencimento': '2026-04-30',
            'rec_descricao': 'Teste TB008',
            'rec_quantidade': 1,
            'rec_valor_unitario': '150.00',
            'rec_desconto': '0.00',
            'rec_status': 'pendente',
        })
        rec_id = resp.data['rec_id']
        antes = LivroCaixa.objects.count()

        self.client.patch(f'/api/contas-receber/{rec_id}/', {
            'rec_status': 'recebido',
            'rec_data_recebimento': '2026-04-06',
        })

        self.assertEqual(LivroCaixa.objects.count(), antes + 1)
        lancamento = LivroCaixa.objects.order_by('-lica_id').first()
        self.assertEqual(lancamento.lica_tipo_lancamento, 'entrada')

    def test_TB009_signal_sem_duplicata(self):
        """TB009: signal chamado duas vezes → apenas 1 lançamento (sem duplicata)"""
        resp = self.client.post('/api/contas-pagar/', {
            'forn': self.forn.forn_id,
            'serv': self.serv.serv_id,
            'pag_data_emissao': '2026-04-01',
            'pag_data_vencimento': '2026-04-30',
            'pag_descricao': 'Teste TB009',
            'pag_quantidade': 1,
            'pag_valor_unitario': '100.00',
            'pag_status': 'pendente',
        })
        pag_id = resp.data['pag_id']

        self.client.patch(f'/api/contas-pagar/{pag_id}/', {
            'pag_status': 'pago',
            'pag_data_pagamento': '2026-04-06',
        })
        self.client.patch(f'/api/contas-pagar/{pag_id}/', {
            'pag_observacoes': 'segunda chamada',
        })

        count = LivroCaixa.objects.filter(
            lica_origem_tipo='contas_pagar',
            lica_origem_id=pag_id,
        ).count()
        self.assertEqual(count, 1)

    def test_TB010_folha_nao_gera_lancamento(self):
        """TB010: FolhaPagamento pago → nenhum lançamento automático"""
        func = criar_funcionario()
        resp = self.client.post('/api/folha-pagamento/', {
            'func': func.func_id,
            'fopa_mes_referencia': 4,
            'fopa_ano_referencia': 2026,
            'fopa_salario_base': '3000.00',
            'fopa_descontos': '0.00',
            'fopa_status': 'pendente',
        })
        fopa_id = resp.data['fopa_id']
        antes = LivroCaixa.objects.count()

        self.client.patch(f'/api/folha-pagamento/{fopa_id}/', {
            'fopa_status': 'pago',
            'fopa_data_pagamento': '2026-04-06',
        })

        self.assertEqual(LivroCaixa.objects.count(), antes)


# ── Testes de Caixa Preta — Autenticação ─────────────────────────────────────

class AutenticacaoTest(TestCase):
    """TP001–TP006 — fluxo JWT."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            email='admin@fluir.test',
            password='fluir@2026',
        )

    def test_TP001_login_valido(self):
        """TP001: login com credenciais válidas → 200 + tokens"""
        resp = self.client.post('/api/token/', {
            'email': 'admin@fluir.test',
            'password': 'fluir@2026',
        })
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)

    def test_TP002_login_senha_invalida(self):
        """TP002: senha errada → 401"""
        resp = self.client.post('/api/token/', {
            'email': 'admin@fluir.test',
            'password': 'errada',
        })
        self.assertEqual(resp.status_code, 401)

    def test_TP003_acesso_sem_token(self):
        """TP003: GET sem token → 401"""
        resp = self.client.get('/api/alunos/')
        self.assertEqual(resp.status_code, 401)

    def test_TP005_refresh_token(self):
        """TP005: refresh válido → novo access token"""
        refresh = RefreshToken.for_user(self.user)
        resp = self.client.post('/api/token/refresh/', {
            'refresh': str(refresh),
        })
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.data)

    def test_TP006_logout_blacklist(self):
        """TP006: logout → token invalidado (endpoint: /api/logout/)"""
        refresh = RefreshToken.for_user(self.user)
        self.client.force_authenticate(user=self.user)
        resp = self.client.post('/api/logout/', {
            'refresh': str(refresh),
        })
        self.assertEqual(resp.status_code, 200)


# ── TP010 — Filtro por status em contas-receber ───────────────────────────────

class FiltroContasReceberTest(TestCase):
    """TP010 — filtro por status, paginação."""

    def setUp(self):
        self.user = criar_usuario()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.aluno = criar_aluno()
        self.serv = criar_servico()

    def _criar_conta(self, status):
        return self.client.post('/api/contas-receber/', {
            'alu': self.aluno.alu_id,
            'serv': self.serv.serv_id,
            'rec_data_emissao': '2026-04-01',
            'rec_data_vencimento': '2026-04-30',
            'rec_descricao': f'Conta {status}',
            'rec_quantidade': 1,
            'rec_valor_unitario': '100.00',
            'rec_desconto': '0.00',
            'rec_status': status,
        })

    def test_TP010_filtro_status_pendente(self):
        """TP010: GET /api/contas-receber/?rec_status=pendente → só pendentes"""
        self._criar_conta('pendente')
        self._criar_conta('pendente')
        self._criar_conta('recebido')
        resp = self.client.get('/api/contas-receber/', {'rec_status': 'pendente'})
        self.assertEqual(resp.status_code, 200)
        for item in resp.data['results']:
            self.assertEqual(item['rec_status'], 'pendente')

    def test_TI004_paginacao_results(self):
        """TI004: resposta deve ter 'results' e 'count' — nunca acessar .data direto"""
        for i in range(3):
            self._criar_conta('pendente')
        resp = self.client.get('/api/contas-receber/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('results', resp.data)
        self.assertIn('count', resp.data)
        self.assertIn('next', resp.data)
        self.assertIn('previous', resp.data)

    def test_serializer_retorna_campo_id(self):
        """Todos os serializers devem retornar campo 'id' para compatibilidade com frontend."""
        self._criar_conta('pendente')
        resp = self.client.get('/api/contas-receber/')
        self.assertIn('id', resp.data['results'][0])

        # Verifica também fornecedor e serviço
        forn = criar_fornecedor()
        resp2 = self.client.get('/api/fornecedores/')
        self.assertIn('id', resp2.data['results'][0])

        resp3 = self.client.get('/api/servicos-produtos/')
        self.assertIn('id', resp3.data['results'][0])


# ── TP019 — RN010: Status vencido automático ──────────────────────────────────

class StatusVencidoAutomaticoTest(TestCase):
    """TP019 — RN010: contas pendentes com vencimento passado → vencido ao listar."""

    def setUp(self):
        self.user = criar_usuario()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.forn = criar_fornecedor()
        self.aluno = criar_aluno()
        self.serv = criar_servico()

    def test_TP019a_contas_pagar_vencido_automatico(self):
        """TP019a: ContasPagar pendente com vencimento no passado → vencido ao listar."""
        ContasPagar.objects.create(
            forn=self.forn,
            pag_data_emissao='2026-01-01',
            pag_data_vencimento='2026-01-15',  # passado
            pag_descricao='Conta vencida teste',
            pag_quantidade=1,
            pag_valor_unitario=Decimal('100.00'),
            pag_valor_total=Decimal('100.00'),
            pag_status='pendente',
        )
        resp = self.client.get('/api/contas-pagar/')
        self.assertEqual(resp.status_code, 200)
        item = resp.data['results'][0]
        self.assertEqual(item['pag_status'], 'vencido')

    def test_TP019b_contas_pagar_nao_altera_pago(self):
        """TP019b: ContasPagar com status 'pago' não deve ser alterada para vencido."""
        ContasPagar.objects.create(
            forn=self.forn,
            pag_data_emissao='2026-01-01',
            pag_data_vencimento='2026-01-15',  # passado
            pag_descricao='Conta paga teste',
            pag_quantidade=1,
            pag_valor_unitario=Decimal('100.00'),
            pag_valor_total=Decimal('100.00'),
            pag_status='pago',
        )
        resp = self.client.get('/api/contas-pagar/')
        self.assertEqual(resp.status_code, 200)
        item = resp.data['results'][0]
        self.assertEqual(item['pag_status'], 'pago')

    def test_TP019c_contas_receber_vencido_automatico(self):
        """TP019c: ContasReceber pendente com vencimento no passado → vencido ao listar."""
        ContasReceber.objects.create(
            alu=self.aluno,
            rec_data_emissao='2026-01-01',
            rec_data_vencimento='2026-01-15',  # passado
            rec_descricao='Receber vencida teste',
            rec_quantidade=1,
            rec_valor_unitario=Decimal('150.00'),
            rec_desconto=Decimal('0.00'),
            rec_valor_total=Decimal('150.00'),
            rec_status='pendente',
        )
        resp = self.client.get('/api/contas-receber/')
        self.assertEqual(resp.status_code, 200)
        item = resp.data['results'][0]
        self.assertEqual(item['rec_status'], 'vencido')

    def test_TP019d_contas_receber_nao_altera_recebido(self):
        """TP019d: ContasReceber com status 'recebido' não deve ser alterada para vencido."""
        ContasReceber.objects.create(
            alu=self.aluno,
            rec_data_emissao='2026-01-01',
            rec_data_vencimento='2026-01-15',  # passado
            rec_descricao='Receber já recebida',
            rec_quantidade=1,
            rec_valor_unitario=Decimal('150.00'),
            rec_desconto=Decimal('0.00'),
            rec_valor_total=Decimal('150.00'),
            rec_status='recebido',
        )
        resp = self.client.get('/api/contas-receber/')
        self.assertEqual(resp.status_code, 200)
        item = resp.data['results'][0]
        self.assertEqual(item['rec_status'], 'recebido')
