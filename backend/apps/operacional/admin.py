from django.contrib import admin

from .models import (
    AgendamentoHorario, AgendamentoTurmas,
    Aluno, AvisoFalta, FichaAluno, Funcionario, Profissao, Turma, TurmaAlunos,
)


@admin.register(Aluno)
class AlunoAdmin(admin.ModelAdmin):
    list_display = ['alu_nome', 'alu_documento', 'alu_telefone', 'alu_email']
    search_fields = ['alu_nome', 'alu_documento', 'alu_email']
    ordering = ['alu_nome']


@admin.register(Profissao)
class ProfissaoAdmin(admin.ModelAdmin):
    list_display = ['prof_nome']
    search_fields = ['prof_nome']


@admin.register(Funcionario)
class FuncionarioAdmin(admin.ModelAdmin):
    list_display = ['func_nome', 'func_documento', 'prof', 'func_salario']
    list_filter = ['prof']
    search_fields = ['func_nome', 'func_documento']


@admin.register(Turma)
class TurmaAdmin(admin.ModelAdmin):
    list_display = ['tur_nome', 'tur_modalidade', 'tur_horario']
    list_filter = ['tur_modalidade']
    search_fields = ['tur_nome']


@admin.register(TurmaAlunos)
class TurmaAlunosAdmin(admin.ModelAdmin):
    list_display = ['tur', 'alu', 'data_matricula', 'ativo']
    list_filter = ['ativo', 'tur']
    search_fields = ['alu__alu_nome', 'tur__tur_nome']


@admin.register(FichaAluno)
class FichaAlunoAdmin(admin.ModelAdmin):
    list_display = ['aluno', 'fial_data', 'fial_peso', 'fial_porcentagem_gordura']
    list_filter = ['aluno']
    search_fields = ['aluno__alu_nome']
    date_hierarchy = 'fial_data'
    ordering = ['-fial_data']


@admin.register(AvisoFalta)
class AvisoFaltaAdmin(admin.ModelAdmin):
    list_display = ['aluno', 'turma', 'avi_data_aula', 'avi_tipo', 'avi_antecedencia_horas', 'avi_gera_credito']
    list_filter = ['avi_tipo', 'avi_gera_credito', 'turma']
    search_fields = ['aluno__alu_nome', 'turma__tur_nome']
    date_hierarchy = 'avi_data_aula'
    ordering = ['-avi_data_hora_aviso']
    readonly_fields = ['avi_antecedencia_horas', 'avi_gera_credito']


@admin.register(AgendamentoHorario)
class AgendamentoHorarioAdmin(admin.ModelAdmin):
    list_display = ['alu', 'agho_dias_disponiveis', 'agho_horarios_disponiveis']
    search_fields = ['alu__alu_nome']


@admin.register(AgendamentoTurmas)
class AgendamentoTurmasAdmin(admin.ModelAdmin):
    list_display = ['alu', 'agtu_dias_disponiveis', 'agtu_nivelamento']
    search_fields = ['alu__alu_nome']
