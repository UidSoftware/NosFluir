from django.contrib import admin

from .models import (
    AgendamentoHorario, AgendamentoTurmas,
    Aluno, Funcionario, Profissao, Turma, TurmaAlunos,
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
    list_display = ['tur_nome', 'tur_horario']
    search_fields = ['tur_nome']


@admin.register(TurmaAlunos)
class TurmaAlunosAdmin(admin.ModelAdmin):
    list_display = ['tur', 'alu', 'data_matricula', 'ativo']
    list_filter = ['ativo', 'tur']
    search_fields = ['alu__alu_nome', 'tur__tur_nome']


@admin.register(AgendamentoHorario)
class AgendamentoHorarioAdmin(admin.ModelAdmin):
    list_display = ['alu', 'agho_dias_disponiveis', 'agho_horarios_disponiveis']
    search_fields = ['alu__alu_nome']


@admin.register(AgendamentoTurmas)
class AgendamentoTurmasAdmin(admin.ModelAdmin):
    list_display = ['alu', 'agtu_dias_disponiveis', 'agtu_nivelamento']
    search_fields = ['alu__alu_nome']
