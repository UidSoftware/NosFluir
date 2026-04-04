import { useState } from 'react'
import { Users, Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { useList, useCreate, useUpdate, useDelete } from '@/hooks/useApi'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, FormField } from '@/components/ui/primitives'
import { formatDate, formatCPF, onlyNumbers } from '@/lib/utils'

const ENDPOINT = '/operacional/alunos/'
const KEY      = 'alunos'

function AlunoForm({ aluno, onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    defaultValues: aluno ? {
      alu_nome:                     aluno.alu_nome,
      alu_documento:                aluno.alu_documento,
      alu_data_nascimento:          aluno.alu_data_nascimento,
      alu_email:                    aluno.alu_email || '',
      alu_telefone:                 aluno.alu_telefone || '',
      alu_endereco:                 aluno.alu_endereco || '',
      alu_peso:                     aluno.alu_peso || '',
      alu_massa_muscular:           aluno.alu_massa_muscular || '',
      alu_massa_gorda:              aluno.alu_massa_gorda || '',
      alu_porcentagem_gordura:      aluno.alu_porcentagem_gordura || '',
      alu_circunferencia_abdominal: aluno.alu_circunferencia_abdominal || '',
    } : {},
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const onSubmit = (data) => {
    data.alu_documento = onlyNumbers(data.alu_documento)
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )
    if (aluno) update.mutate({ id: aluno.id, data: cleaned })
    else       create.mutate(cleaned)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Dados Pessoais</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Nome completo" required error={errors.alu_nome?.message} className="sm:col-span-2">
            <Input {...register('alu_nome', { required: 'Nome obrigatório' })} placeholder="Giulia Fagionato" disabled={busy} />
          </FormField>

          <FormField label="CPF" required error={errors.alu_documento?.message}>
            <Input
              {...register('alu_documento', {
                required: 'CPF obrigatório',
                validate: v => onlyNumbers(v).length === 11 || 'CPF deve ter 11 dígitos',
              })}
              placeholder="000.000.000-00"
              disabled={busy}
              onChange={e => {
                const n = onlyNumbers(e.target.value)
                const f = n.length <= 11
                  ? n.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) =>
                      d ? `${a}.${b}.${c}-${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a)
                  : e.target.value
                setValue('alu_documento', f)
              }}
            />
          </FormField>

          <FormField label="Data de Nascimento" required error={errors.alu_data_nascimento?.message}>
            <Input type="date" {...register('alu_data_nascimento', { required: 'Data obrigatória' })} disabled={busy} />
          </FormField>

          <FormField label="E-mail" error={errors.alu_email?.message}>
            <Input type="email" {...register('alu_email')} placeholder="giulia@email.com" disabled={busy} />
          </FormField>

          <FormField label="Telefone">
            <Input {...register('alu_telefone')} placeholder="(34) 99999-0000" disabled={busy} />
          </FormField>

          <FormField label="Endereço" className="sm:col-span-2">
            <Input {...register('alu_endereco')} placeholder="Rua Exemplo, 123 — Uberlândia, MG" disabled={busy} />
          </FormField>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Medidas Corporais <span className="normal-case">(opcional)</span>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <FormField label="Peso (kg)">
            <Input type="number" step="0.01" {...register('alu_peso')} placeholder="70.5" disabled={busy} />
          </FormField>
          <FormField label="Massa Muscular (kg)">
            <Input type="number" step="0.01" {...register('alu_massa_muscular')} placeholder="45.0" disabled={busy} />
          </FormField>
          <FormField label="Massa Gorda (kg)">
            <Input type="number" step="0.01" {...register('alu_massa_gorda')} placeholder="18.0" disabled={busy} />
          </FormField>
          <FormField label="% Gordura">
            <Input type="number" step="0.01" {...register('alu_porcentagem_gordura')} placeholder="15.5" disabled={busy} />
          </FormField>
          <FormField label="Circ. Abdominal (cm)">
            <Input type="number" step="0.01" {...register('alu_circunferencia_abdominal')} placeholder="85.0" disabled={busy} />
          </FormField>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : aluno ? 'Salvar Alterações' : 'Cadastrar Aluno'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function AlunoDetail({ aluno, onClose }) {
  if (!aluno) return null
  const F = ({ label, value }) => (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm mt-0.5">{value || '—'}</p>
    </div>
  )
  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <F label="Nome"       value={aluno.alu_nome} />
        <F label="CPF"        value={formatCPF(aluno.alu_documento)} />
        <F label="Nascimento" value={formatDate(aluno.alu_data_nascimento)} />
        <F label="E-mail"     value={aluno.alu_email} />
        <F label="Telefone"   value={aluno.alu_telefone} />
        <F label="Endereço"   value={aluno.alu_endereco} />
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-3">Medidas Corporais</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Peso',       aluno.alu_peso ? `${aluno.alu_peso} kg` : null],
            ['M. Muscular',aluno.alu_massa_muscular ? `${aluno.alu_massa_muscular} kg` : null],
            ['M. Gorda',   aluno.alu_massa_gorda ? `${aluno.alu_massa_gorda} kg` : null],
            ['% Gordura',  aluno.alu_porcentagem_gordura ? `${aluno.alu_porcentagem_gordura}%` : null],
            ['Circ. Abd.', aluno.alu_circunferencia_abdominal ? `${aluno.alu_circunferencia_abdominal} cm` : null],
          ].map(([l, v]) => <F key={l} label={l} value={v} />)}
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
      </DialogFooter>
    </div>
  )
}

export default function AlunosPage() {
  const [modalOpen, setModalOpen]   = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected]     = useState(null)
  const [deleteId, setDeleteId]     = useState(null)

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Aluno excluído.' })

  const openEdit   = (a) => { setSelected(a); setModalOpen(true) }
  const openCreate = ()  => { setSelected(null); setModalOpen(true) }
  const openDetail = (a) => { setSelected(a); setDetailOpen(true) }

  const columns = [
    { key: 'alu_nome',             header: 'Nome',       render: r => <span className="font-medium">{r.alu_nome}</span> },
    { key: 'alu_documento',        header: 'CPF',        render: r => formatCPF(r.alu_documento) },
    { key: 'alu_data_nascimento',  header: 'Nascimento', render: r => formatDate(r.alu_data_nascimento) },
    { key: 'alu_telefone',         header: 'Telefone',   render: r => r.alu_telefone || '—' },
    { key: 'alu_email',            header: 'E-mail',     render: r => r.alu_email || '—' },
    {
      key: 'acoes', header: '', cellClassName: 'w-24',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => openDetail(r)} title="Ver detalhes">
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(r)} title="Editar">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.id)} title="Excluir" className="text-red-400 hover:text-red-300">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alunos"
        description="Cadastro e gestão de alunos do Studio Fluir"
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4" />Novo Aluno</Button>}
      />

      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter placeholder="Buscar por nome, CPF ou e-mail..." onSearch={q => setFilters(q ? { search: q } : {})} />
          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum aluno cadastrado ainda." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected ? 'Editar Aluno' : 'Novo Aluno'}</DialogTitle>
          </DialogHeader>
          <AlunoForm aluno={selected} onClose={() => setModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-fluir-purple" />
              {selected?.alu_nome}
            </DialogTitle>
          </DialogHeader>
          <AlunoDetail aluno={selected} onClose={() => setDetailOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Excluir Aluno"
        description="Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
