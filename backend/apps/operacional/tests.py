from decimal import Decimal

from django.test import TestCase
from django.db import IntegrityError
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from .models import Aluno, Funcionario, Profissao, Turma, TurmaAlunos

User = get_user_model()


def criar_usuario():
    return User.objects.create_superuser(
        email='admin@fluir.test',
        password='fluir@2026',
    )


def criar_profissao():
    return Profissao.objects.create(prof_nome='Instrutor')


def criar_funcionario(cpf='98765432100'):
    prof = Profissao.objects.get_or_create(prof_nome='Instrutor')[0]
    return Funcionario.objects.create(
        prof=prof,
        func_nome=f'Func {cpf}',
        func_documento=cpf,
        func_salario=Decimal('3000.00'),
    )


def criar_turma(nome='Pilates Seg 07h'):
    return Turma.objects.create(
        tur_nome=nome,
        tur_horario='Seg/Qua 07:00',
    )


def criar_aluno(cpf='12345678901', nome='Aluno Teste'):
    return Aluno.objects.create(
        alu_nome=nome,
        alu_documento=cpf,
        alu_data_nascimento='1990-01-01',
    )


# ── Testes de Caixa Branca ────────────────────────────────────────────────────

class AlunoValidacaoTest(TestCase):
    """TB011, TB012 — validações do Aluno via API."""

    def setUp(self):
        self.user = criar_usuario()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_TB011_cpf_com_zeros_preservado(self):
        """TB011: CPF com zeros à esquerda salvo como string."""
        resp = self.client.post('/api/alunos/', {
            'alu_nome': 'Aluno Zeros',
            'alu_documento': '01234567890',
            'alu_data_nascimento': '1990-05-10',
        })
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(resp.data['alu_documento'], '01234567890')

    def test_TB012_aluno_menor_de_12_anos(self):
        """TB012: aluno com menos de 12 anos → HTTP 400"""
        resp = self.client.post('/api/alunos/', {
            'alu_nome': 'Criança',
            'alu_documento': '11122233344',
            'alu_data_nascimento': '2020-01-01',
        })
        self.assertEqual(resp.status_code, 400)


class TurmaAlunosValidacaoTest(TestCase):
    """TB013, TB014 — regras de matrícula."""

    def setUp(self):
        self.user = criar_usuario()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.turma = criar_turma()

    def _criar_e_matricular_alunos(self, n):
        for i in range(n):
            cpf = str(10000000000 + i).zfill(11)
            aluno = criar_aluno(cpf=cpf, nome=f'Aluno {i}')
            resp = self.client.post('/api/turma-alunos/', {
                'tur': self.turma.tur_id,
                'alu': aluno.alu_id,
                'data_matricula': '2026-04-01',
                'ativo': True,
            })
            self.assertEqual(resp.status_code, 201, f'Falha ao matricular aluno {i}: {resp.data}')

    def test_TB013_limite_15_alunos(self):
        """TB013: matricular 16º aluno em turma cheia → HTTP 400"""
        self._criar_e_matricular_alunos(15)
        aluno_extra = criar_aluno(cpf='99988877766', nome='Aluno Extra')
        resp = self.client.post('/api/turma-alunos/', {
            'tur': self.turma.tur_id,
            'alu': aluno_extra.alu_id,
            'data_matricula': '2026-04-01',
        })
        self.assertEqual(resp.status_code, 400)

    def test_TB014_aluno_duplicado_na_turma(self):
        """TB014: mesmo aluno duas vezes na mesma turma → HTTP 400"""
        aluno = criar_aluno()
        self.client.post('/api/turma-alunos/', {
            'tur': self.turma.tur_id,
            'alu': aluno.alu_id,
            'data_matricula': '2026-04-01',
        })
        resp = self.client.post('/api/turma-alunos/', {
            'tur': self.turma.tur_id,
            'alu': aluno.alu_id,
            'data_matricula': '2026-04-01',
        })
        self.assertEqual(resp.status_code, 400)

    def test_TB015_cpf_duplicado_funcionario(self):
        """TB015: funcionário com CPF duplicado → IntegrityError"""
        criar_funcionario(cpf='11111111111')
        with self.assertRaises(IntegrityError):
            criar_funcionario(cpf='11111111111')


# ── Testes de Caixa Preta ────────────────────────────────────────────────────

class OperacionalAPITest(TestCase):
    """TP012–TP016 — endpoints operacionais."""

    def setUp(self):
        self.user = criar_usuario()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.turma = criar_turma()

    def test_TP012_cadastrar_aluno_cpf_unico(self):
        """TP012: cadastrar aluno com CPF novo → HTTP 201"""
        resp = self.client.post('/api/alunos/', {
            'alu_nome': 'Novo Aluno',
            'alu_documento': '55566677788',
            'alu_data_nascimento': '1995-06-15',
        })
        self.assertEqual(resp.status_code, 201)

    def test_TP013_cadastrar_aluno_cpf_duplicado(self):
        """TP013: CPF já existente → HTTP 400"""
        criar_aluno(cpf='55566677788')
        resp = self.client.post('/api/alunos/', {
            'alu_nome': 'Duplicado',
            'alu_documento': '55566677788',
            'alu_data_nascimento': '1992-03-20',
        })
        self.assertEqual(resp.status_code, 400)

    def test_TP014_matricular_aluno_em_turma(self):
        """TP014: matricular aluno em turma → HTTP 201"""
        aluno = criar_aluno()
        resp = self.client.post('/api/turma-alunos/', {
            'tur': self.turma.tur_id,
            'alu': aluno.alu_id,
            'data_matricula': '2026-04-01',
        })
        self.assertEqual(resp.status_code, 201)

    def test_turma_sem_professor_campo_removido(self):
        """Turma não tem mais campo func — serializer não expõe func nem func_nome."""
        resp = self.client.get(f'/api/turmas/{self.turma.tur_id}/')
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn('func', resp.data)
        self.assertNotIn('func_nome', resp.data)

    def test_turma_retorna_campo_id(self):
        """Turma deve retornar campo id (pk) para compatibilidade com frontend."""
        resp = self.client.get('/api/turmas/')
        self.assertEqual(resp.status_code, 200)
        if resp.data['results']:
            self.assertIn('id', resp.data['results'][0])

    def test_funcionario_retorna_campo_id(self):
        """Funcionário deve retornar campo id para compatibilidade com selects."""
        criar_funcionario()
        resp = self.client.get('/api/funcionarios/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('id', resp.data['results'][0])

    def test_listagem_turmas_retorna_200(self):
        """GET /api/turmas/ deve retornar 200 (bug: filterset_fields=['func'] causava 500)."""
        resp = self.client.get('/api/turmas/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('results', resp.data)


# ── TP016 — Agendamento sem autenticação ─────────────────────────────────────

class AgendamentoSemAutenticacaoTest(TestCase):
    """TP016 — site pode criar agendamento sem token."""

    def test_TP016_agendamento_horario_sem_token(self):
        """TP016: POST /api/agendamentos-horario/ sem token → HTTP 201"""
        aluno = criar_aluno()
        client = APIClient()  # sem autenticação
        resp = client.post('/api/agendamentos-horario/', {
            'alu': aluno.alu_id,
            'agho_dias_disponiveis': 'seg,qua',
            'agho_horarios_disponiveis': '07:00,17:00',
        })
        self.assertEqual(resp.status_code, 201, resp.data)

    def test_agendamento_turmas_sem_token(self):
        """Agendamento de turmas pelo site também aceita sem token."""
        aluno = criar_aluno()
        client = APIClient()
        resp = client.post('/api/agendamentos-turmas/', {
            'alu': aluno.alu_id,
            'agtu_dias_disponiveis': 'ter,qui',
            'agtu_horarios_disponiveis': '08:00',
            'agtu_nivelamento': 'iniciante',
        })
        self.assertEqual(resp.status_code, 201, resp.data)

    def test_listagem_agendamentos_requer_token(self):
        """GET de agendamentos ainda requer autenticação."""
        client = APIClient()
        resp = client.get('/api/agendamentos-horario/')
        self.assertEqual(resp.status_code, 401)


# ── TB036 — Nome real do aluno em TurmaAlunos ────────────────────────────────

class TurmaAlunosNomeRealTest(TestCase):
    """TB036 — GET /api/turma-alunos/?tur=X retorna alu_nome (melhoria MinistrarAulaPage)."""

    def setUp(self):
        self.user = criar_usuario()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.turma = criar_turma()
        self.aluno = criar_aluno(nome='Maria Clara')
        resp = self.client.post('/api/turma-alunos/', {
            'tur': self.turma.tur_id,
            'alu': self.aluno.alu_id,
            'data_matricula': '2026-04-07',
            'ativo': True,
        })
        self.assertEqual(resp.status_code, 201)

    def test_TB036_turma_alunos_retorna_alu_nome(self):
        """TB036: GET /api/turma-alunos/?tur=X → results com campo alu_nome preenchido"""
        resp = self.client.get('/api/turma-alunos/', {'tur': self.turma.tur_id})
        self.assertEqual(resp.status_code, 200)
        self.assertIn('results', resp.data)
        self.assertGreater(len(resp.data['results']), 0)
        matricula = resp.data['results'][0]
        self.assertIn('alu_nome', matricula)
        self.assertEqual(matricula['alu_nome'], 'Maria Clara')

    def test_TB036b_turma_alunos_retorna_campo_id(self):
        """TB036b: TurmaAlunos serializer deve retornar campo id (compatibilidade frontend)"""
        resp = self.client.get('/api/turma-alunos/', {'tur': self.turma.tur_id})
        self.assertEqual(resp.status_code, 200)
        matricula = resp.data['results'][0]
        self.assertIn('id', matricula)
        self.assertIn('alu', matricula)


# ── Soft delete — comportamento atual ────────────────────────────────────────

class SoftDeleteComportamentoAtualTest(TestCase):
    """
    Documenta o estado atual do soft delete.
    ATENÇÃO: perform_destroy não está sobrescrito — DELETE ainda é hard delete.
    Registros deletados NÃO aparecem em listagens (queryset filtra deleted_at__isnull=True)
    mas a deleção remove fisicamente do banco.
    """

    def setUp(self):
        self.user = criar_usuario()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_delete_remove_registro_da_listagem(self):
        """DELETE remove registro — não aparece mais na listagem."""
        aluno = criar_aluno()
        resp_del = self.client.delete(f'/api/alunos/{aluno.alu_id}/')
        self.assertEqual(resp_del.status_code, 204)

        resp_list = self.client.get('/api/alunos/')
        ids = [a['alu_id'] for a in resp_list.data['results']]
        self.assertNotIn(aluno.alu_id, ids)
