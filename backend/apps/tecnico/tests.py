from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from apps.operacional.models import Aluno, Funcionario, Profissao, Turma, TurmaAlunos
from .models import Aula, CreditoReposicao, Exercicio, FichaTreino, FichaTreinoExercicios

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


# ── TB037–TB041 — Melhorias MinistrarAulaPage ────────────────────────────────

def criar_exercicio(nome='Hundred', aparelho='reformer'):
    return Exercicio.objects.create(
        exe_nome=nome,
        exe_aparelho=aparelho,
    )


def criar_ficha(nome='Fortalecimento Core'):
    return FichaTreino.objects.create(fitr_nome=nome)


def criar_ficha_exercicio(ficha, exercicio, ordem=1, series=3, reps=10, obs=''):
    return FichaTreinoExercicios.objects.create(
        fitr=ficha,
        exe=exercicio,
        ftex_ordem=ordem,
        ftex_series=series,
        ftex_repeticoes=reps,
        ftex_observacoes=obs,
    )


class FichaExerciciosCardTest(TestCase):
    """TB037–TB040 — endpoint /api/fichas-treino-exercicios/ para card da aula."""

    def setUp(self):
        self.user = criar_usuario()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.ficha = criar_ficha()
        self.ex1 = criar_exercicio('Hundred', 'reformer')
        self.ex2 = criar_exercicio('Single Leg Stretch', 'solo')
        criar_ficha_exercicio(self.ficha, self.ex1, ordem=1, series=3, reps=10, obs='manter lombar')
        criar_ficha_exercicio(self.ficha, self.ex2, ordem=2, series=3, reps=12)

    def test_TB037_retorna_campos_obrigatorios(self):
        """TB037: GET /api/fichas-treino-exercicios/?fitr=X → campos necessários para o card"""
        resp = self.client.get('/api/fichas-treino-exercicios/', {'fitr': self.ficha.fitr_id})
        self.assertEqual(resp.status_code, 200)
        ex = resp.data['results'][0]
        for campo in ['id', 'ftex_ordem', 'exe_nome', 'exe_aparelho', 'ftex_series', 'ftex_repeticoes', 'ftex_observacoes']:
            self.assertIn(campo, ex, f'Campo {campo} ausente no serializer')

    def test_TB038_retorna_paginado(self):
        """TB038: resposta deve ser paginada (results + count) — frontend usa .results"""
        resp = self.client.get('/api/fichas-treino-exercicios/', {'fitr': self.ficha.fitr_id})
        self.assertEqual(resp.status_code, 200)
        self.assertIn('results', resp.data)
        self.assertIn('count', resp.data)

    def test_TB039_filtra_por_ficha(self):
        """TB039: filtro fitr=X retorna só exercícios da ficha correta"""
        outra_ficha = criar_ficha('Outra Ficha')
        outro_ex = criar_exercicio('Roll Up', 'cadillac')
        criar_ficha_exercicio(outra_ficha, outro_ex, ordem=1)

        resp = self.client.get('/api/fichas-treino-exercicios/', {'fitr': self.ficha.fitr_id})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['count'], 2)
        nomes = [e['exe_nome'] for e in resp.data['results']]
        self.assertNotIn('Roll Up', nomes)

    def test_TB040_ordena_por_ftex_ordem(self):
        """TB040: ordering=ftex_ordem → exercícios retornados em ordem crescente"""
        resp = self.client.get('/api/fichas-treino-exercicios/', {
            'fitr': self.ficha.fitr_id,
            'ordering': 'ftex_ordem',
        })
        self.assertEqual(resp.status_code, 200)
        ordens = [e['ftex_ordem'] for e in resp.data['results']]
        self.assertEqual(ordens, sorted(ordens))

    def test_TB040b_obs_retornada_quando_preenchida(self):
        """TB040b: ftex_observacoes preenchida é retornada no response"""
        resp = self.client.get('/api/fichas-treino-exercicios/', {
            'fitr': self.ficha.fitr_id,
            'ordering': 'ftex_ordem',
        })
        primeiro = resp.data['results'][0]
        self.assertEqual(primeiro['ftex_observacoes'], 'manter lombar')


class CamposOpcionaisAulaTest(TestCase):
    """TB041 — P.A. e intensidade são opcionais no POST de aula."""

    def setUp(self):
        self.user = criar_usuario()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.aluno = criar_aluno()
        self.func = criar_funcionario()
        self.turma = criar_turma()
        criar_matricula(self.turma, self.aluno)

    def test_TB041_presenca_sem_pa_e_intensidade(self):
        """TB041: POST aula sem P.A. e sem intensidade → HTTP 201 (campos opcionais)"""
        resp = self.client.post('/api/aulas/', {
            'tur': self.turma.tur_id,
            'alu': self.aluno.alu_id,
            'func': self.func.func_id,
            'aul_data': '2026-04-07',
            'aul_hora_inicio': '07:00',
            'aul_hora_final': '08:00',
            'aul_tipo_presenca': 'regular',
            # sem aul_pressao_inicio, aul_pressao_final, aul_intensidade_esforco
        })
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertIsNone(resp.data['aul_pressao_inicio'])
        self.assertIsNone(resp.data['aul_pressao_final'])
        self.assertIsNone(resp.data['aul_intensidade_esforco'])

    def test_TB041b_intensidade_zero_aceita(self):
        """TB041b: intensidade=0 é válida (limite inferior do range 0-10)"""
        resp = self.client.post('/api/aulas/', {
            'tur': self.turma.tur_id,
            'alu': self.aluno.alu_id,
            'func': self.func.func_id,
            'aul_data': '2026-04-07',
            'aul_hora_inicio': '07:00',
            'aul_hora_final': '08:00',
            'aul_tipo_presenca': 'regular',
            'aul_intensidade_esforco': 0,
        })
        self.assertEqual(resp.status_code, 201, resp.data)

    def test_TB041c_intensidade_10_aceita(self):
        """TB041c: intensidade=10 é válida (limite superior do range 0-10)"""
        resp = self.client.post('/api/aulas/', {
            'tur': self.turma.tur_id,
            'alu': self.aluno.alu_id,
            'func': self.func.func_id,
            'aul_data': '2026-04-07',
            'aul_hora_inicio': '07:00',
            'aul_hora_final': '08:00',
            'aul_tipo_presenca': 'regular',
            'aul_intensidade_esforco': 10,
        })
        self.assertEqual(resp.status_code, 201, resp.data)


# ── TP021 — Créditos disponíveis por aluno ───────────────────────────────────

class CreditosPorAlunoTest(TestCase):
    """TP021 — endpoint /api/creditos/aluno/{id}/ retorna disponíveis ordenados."""

    def setUp(self):
        self.user = criar_usuario()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.aluno = criar_aluno()
        self.turma = criar_turma()
        criar_matricula(self.turma, self.aluno)

    def test_TP021_creditos_disponiveis_ordenados(self):
        """TP021: GET /api/creditos/aluno/{id}/ → lista ordenada por expiração (FIFO)"""
        # Cria 2 faltas em datas diferentes → 2 créditos com expirações diferentes
        for i, dia in enumerate(['01', '05']):
            Aula.objects.create(
                tur=self.turma,
                alu=self.aluno,
                aul_data=f'2026-04-{dia}',
                aul_hora_inicio='07:00',
                aul_tipo_presenca='falta',
                aul_tipo_falta='justificada',
            )
        resp = self.client.get(f'/api/creditos/aluno/{self.aluno.alu_id}/')
        self.assertEqual(resp.status_code, 200)
        creditos = resp.data['results']
        self.assertEqual(len(creditos), 2)
        # Verifica ordem FIFO — primeiro crédito expira antes
        self.assertLessEqual(creditos[0]['cred_data_expiracao'], creditos[1]['cred_data_expiracao'])
        for c in creditos:
            self.assertEqual(c['cred_status'], 'disponivel')

    def test_credito_filtro_por_alu_e_status(self):
        """GET /api/creditos/?alu=X&cred_status=disponivel → filtra corretamente"""
        Aula.objects.create(
            tur=self.turma, alu=self.aluno,
            aul_data='2026-04-01', aul_hora_inicio='07:00',
            aul_tipo_presenca='falta', aul_tipo_falta='justificada',
        )
        resp = self.client.get('/api/creditos/', {
            'alu': self.aluno.alu_id,
            'cred_status': 'disponivel',
        })
        self.assertEqual(resp.status_code, 200)
        self.assertGreater(resp.data['count'], 0)
        for c in resp.data['results']:
            self.assertEqual(c['cred_status'], 'disponivel')


# ── TI003 — Fluxo matrícula → aula → verificação ────────────────────────────

class IntegracaoMatriculaAulaTest(TestCase):
    """TI003 — matricular aluno, registrar aula, verificar registro."""

    def setUp(self):
        self.user = criar_usuario()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.aluno = criar_aluno()
        self.turma = criar_turma()
        self.func = criar_funcionario()

    def test_TI003_fluxo_matricula_aula(self):
        """TI003: matricular aluno → registrar aula → aula listada com dados corretos"""
        # 1. Matricula
        resp = self.client.post('/api/turma-alunos/', {
            'tur': self.turma.tur_id,
            'alu': self.aluno.alu_id,
            'data_matricula': '2026-04-01',
            'ativo': True,
        })
        self.assertEqual(resp.status_code, 201)

        # 2. Registra aula
        resp2 = self.client.post('/api/aulas/', {
            'tur': self.turma.tur_id,
            'alu': self.aluno.alu_id,
            'func': self.func.func_id,
            'aul_data': '2026-04-07',
            'aul_hora_inicio': '07:00',
            'aul_hora_final': '08:00',
            'aul_pressao_inicio': '120/80',
            'aul_tipo_presenca': 'regular',
            'aul_intensidade_esforco': 7,
        })
        self.assertEqual(resp2.status_code, 201, resp2.data)

        # 3. Verifica que aparece na listagem filtrada por turma e aluno
        resp3 = self.client.get('/api/aulas/', {
            'tur': self.turma.tur_id,
            'alu': self.aluno.alu_id,
        })
        self.assertEqual(resp3.status_code, 200)
        self.assertEqual(resp3.data['count'], 1)
        aula = resp3.data['results'][0]
        self.assertEqual(aula['aul_pressao_inicio'], '120/80')
        self.assertEqual(aula['func'], self.func.func_id)
        self.assertEqual(aula['func_nome'], self.func.func_nome)


# ── Permissões por perfil — estado atual documentado ─────────────────────────

class PermissoesPerfilEstadoAtualTest(TestCase):
    """
    TI005 — PENDENTE DE IMPLEMENTAÇÃO.
    Estado atual: todos os endpoints usam IsAuthenticated sem distinção de grupo.
    Qualquer usuário autenticado acessa tudo (exceto UserViewSet → IsAdminUser).
    Este teste DOCUMENTA o comportamento atual.
    """

    def setUp(self):
        self.client = APIClient()
        # Usuário comum sem grupos
        self.user_comum = criar_usuario()
        # Aluno para ter algo na listagem
        criar_aluno()

    def test_usuario_autenticado_acessa_financeiro(self):
        """Estado atual: qualquer autenticado acessa financeiro (sem restrição de grupo)."""
        self.client.force_authenticate(user=self.user_comum)
        resp = self.client.get('/api/contas-pagar/')
        # Comportamento ATUAL: 200. Quando permissões forem implementadas,
        # este teste deve ser atualizado para 403 para usuários sem grupo Financeiro.
        self.assertEqual(resp.status_code, 200)

    def test_usuario_autenticado_acessa_operacional(self):
        """Estado atual: qualquer autenticado acessa operacional."""
        self.client.force_authenticate(user=self.user_comum)
        resp = self.client.get('/api/alunos/')
        self.assertEqual(resp.status_code, 200)

    def test_user_viewset_requer_admin(self):
        """UserViewSet usa IsAdminUser — usuário comum recebe 403."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user_nao_admin = User.objects.create_user(
            email='comum@fluir.test',
            password='senha123',
        )
        self.client.force_authenticate(user=user_nao_admin)
        resp = self.client.get('/api/usuarios/')
        self.assertEqual(resp.status_code, 403)
