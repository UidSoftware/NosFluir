from django.contrib import admin

from .models import Acessorio, Aparelho, Aulas, CreditoReposicao, Exercicio, FichaTreino, FichaTreinoExercicios, MinistrarAula


@admin.register(Acessorio)
class AcessorioAdmin(admin.ModelAdmin):
    list_display = ['acess_nome', 'acess_ativo']
    list_filter = ['acess_ativo']
    search_fields = ['acess_nome']


@admin.register(Aparelho)
class AparelhoAdmin(admin.ModelAdmin):
    list_display = ['apar_nome', 'apar_modalidade', 'apar_ativo']
    list_filter = ['apar_modalidade', 'apar_ativo']
    search_fields = ['apar_nome']


@admin.register(Aulas)
class AulasAdmin(admin.ModelAdmin):
    list_display = ['aul_nome', 'tur', 'aul_modalidade', 'aul_data', 'func']
    list_filter = ['aul_modalidade', 'aul_data']
    search_fields = ['aul_nome', 'tur__tur_nome']
    date_hierarchy = 'aul_data'


@admin.register(Exercicio)
class ExercicioAdmin(admin.ModelAdmin):
    list_display = ['exe_nome', 'exe_modalidade', 'exe_aparelho', 'exe_acessorio']
    list_filter = ['exe_modalidade', 'exe_aparelho', 'exe_acessorio']
    search_fields = ['exe_nome']


class FichaTreinoExerciciosInline(admin.TabularInline):
    model = FichaTreinoExercicios
    extra = 0
    fields = ['exe', 'ftex_secao', 'ftex_ordem', 'ftex_repeticoes', 'ftex_series', 'ftex_observacoes']
    ordering = ['ftex_ordem']


@admin.register(FichaTreino)
class FichaTreinoAdmin(admin.ModelAdmin):
    list_display = ['fitr_nome', 'fitr_modalidade']
    list_filter = ['fitr_modalidade']
    search_fields = ['fitr_nome']
    inlines = [FichaTreinoExerciciosInline]


@admin.register(FichaTreinoExercicios)
class FichaTreinoExerciciosAdmin(admin.ModelAdmin):
    list_display = ['fitr', 'exe', 'ftex_secao', 'ftex_ordem', 'ftex_repeticoes', 'ftex_series']
    list_filter = ['fitr']
    ordering = ['fitr', 'ftex_ordem']


@admin.register(MinistrarAula)
class MinistrarAulaAdmin(admin.ModelAdmin):
    list_display = ['miau_data', 'tur', 'alu', 'func', 'miau_tipo_presenca', 'miau_pas_inicio', 'miau_pad_inicio']
    list_filter = ['miau_tipo_presenca', 'miau_tipo_falta', 'tur', 'func']
    search_fields = ['alu__alu_nome', 'tur__tur_nome']
    date_hierarchy = 'miau_data'
    ordering = ['-miau_data']


@admin.register(CreditoReposicao)
class CreditoReposicaoAdmin(admin.ModelAdmin):
    list_display = ['alu', 'cred_status', 'cred_data_geracao', 'cred_data_expiracao', 'cred_usado']
    list_filter = ['cred_status', 'cred_usado']
    search_fields = ['alu__alu_nome']
    ordering = ['cred_data_expiracao']
