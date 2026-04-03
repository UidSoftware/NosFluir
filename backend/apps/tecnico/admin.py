from django.contrib import admin

from .models import Aula, CreditoReposicao, Exercicio, FichaTreino, FichaTreinoExercicios


@admin.register(Exercicio)
class ExercicioAdmin(admin.ModelAdmin):
    list_display = ['exe_nome', 'exe_aparelho']
    list_filter = ['exe_aparelho']
    search_fields = ['exe_nome']


class FichaTreinoExerciciosInline(admin.TabularInline):
    model = FichaTreinoExercicios
    extra = 0
    fields = ['exe', 'ftex_ordem', 'ftex_repeticoes', 'ftex_series', 'ftex_observacoes']
    ordering = ['ftex_ordem']


@admin.register(FichaTreino)
class FichaTreinoAdmin(admin.ModelAdmin):
    list_display = ['fitr_nome']
    search_fields = ['fitr_nome']
    inlines = [FichaTreinoExerciciosInline]


@admin.register(FichaTreinoExercicios)
class FichaTreinoExerciciosAdmin(admin.ModelAdmin):
    list_display = ['fitr', 'exe', 'ftex_ordem', 'ftex_repeticoes', 'ftex_series']
    list_filter = ['fitr']
    ordering = ['fitr', 'ftex_ordem']


@admin.register(Aula)
class AulaAdmin(admin.ModelAdmin):
    list_display = ['aul_data', 'tur', 'alu', 'aul_tipo_presenca', 'aul_pressao_inicio']
    list_filter = ['aul_tipo_presenca', 'aul_tipo_falta', 'tur']
    search_fields = ['alu__alu_nome', 'tur__tur_nome']
    date_hierarchy = 'aul_data'
    ordering = ['-aul_data', '-aul_hora_inicio']


@admin.register(CreditoReposicao)
class CreditoReposicaoAdmin(admin.ModelAdmin):
    list_display = ['alu', 'cred_status', 'cred_data_geracao', 'cred_data_expiracao', 'cred_usado']
    list_filter = ['cred_status', 'cred_usado']
    search_fields = ['alu__alu_nome']
    ordering = ['cred_data_expiracao']
