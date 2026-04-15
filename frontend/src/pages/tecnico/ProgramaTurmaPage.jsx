import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Plus, ClipboardList } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/primitives'
import { toast } from '@/hooks/useToast'
import { fetchAll } from '@/hooks/useApi'
import api from '@/services/api'

function SortableItem({ item, onDelete }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: item.prog_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-border bg-fluir-dark-2 px-3 py-2.5"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical size={18} />
      </button>
      <span className="w-6 text-xs text-muted-foreground font-mono">{item.prog_ordem}.</span>
      <span className="flex-1 text-sm font-medium">{item.fitr_nome}</span>
      <button
        onClick={() => onDelete(item)}
        className="text-muted-foreground hover:text-red-400 transition-colors"
        title="Remover do programa"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

export default function ProgramaTurmaPage() {
  const [turmaId, setTurmaId] = useState('')
  const [fichaParaAdicionar, setFichaParaAdicionar] = useState('')
  const qc = useQueryClient()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const { data: turmas, isLoading: loadingTurmas } = useQuery({
    queryKey: ['turmas-select'],
    queryFn: () => fetchAll('/turmas/'),
  })

  const { data: fichas } = useQuery({
    queryKey: ['fichas-select'],
    queryFn: () => fetchAll('/fichas-treino/'),
  })

  const { data: programa, isLoading: loadingPrograma } = useQuery({
    queryKey: ['programa-turma', turmaId],
    queryFn: () => api.get('/programa-turma/', { params: { turma: turmaId, ordering: 'prog_ordem' } })
      .then(r => r.data.results),
    enabled: !!turmaId,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['programa-turma', turmaId] })

  const addMutation = useMutation({
    mutationFn: ({ turma, fitr, prog_ordem }) =>
      api.post('/programa-turma/', { turma, fitr, prog_ordem }),
    onSuccess: () => {
      toast({ title: 'Ficha adicionada ao programa.' })
      setFichaParaAdicionar('')
      invalidate()
    },
    onError: err => {
      const detail = err.response?.data
      const msg = JSON.stringify(detail).includes('único') || JSON.stringify(detail).includes('unique')
        ? 'Essa ficha já está no programa desta turma.'
        : 'Erro ao adicionar ficha.'
      toast({ title: msg, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/programa-turma/${id}/`),
    onSuccess: () => { toast({ title: 'Ficha removida do programa.' }); invalidate() },
    onError: () => toast({ title: 'Erro ao remover ficha.', variant: 'destructive' }),
  })

  // Patch em sequência para renumerar após drag
  const reorderMutation = useMutation({
    mutationFn: async (itens) => {
      for (let i = 0; i < itens.length; i++) {
        await api.patch(`/programa-turma/${itens[i].prog_id}/`, { prog_ordem: i + 1 })
      }
    },
    onSuccess: invalidate,
    onError: () => { toast({ title: 'Erro ao reordenar.', variant: 'destructive' }); invalidate() },
  })

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = programa.findIndex(p => p.prog_id === active.id)
    const newIndex = programa.findIndex(p => p.prog_id === over.id)
    const reordenado = arrayMove(programa, oldIndex, newIndex)
    // Otimista — atualiza cache imediatamente
    qc.setQueryData(['programa-turma', turmaId], reordenado.map((p, i) => ({ ...p, prog_ordem: i + 1 })))
    reorderMutation.mutate(reordenado)
  }

  const handleAdicionar = () => {
    if (!fichaParaAdicionar || fichaParaAdicionar === '__none__') {
      toast({ title: 'Selecione uma ficha para adicionar.', variant: 'destructive' })
      return
    }
    const proximaOrdem = (programa?.length ?? 0) + 1
    addMutation.mutate({
      turma: parseInt(turmaId),
      fitr: parseInt(fichaParaAdicionar),
      prog_ordem: proximaOrdem,
    })
  }

  // Fichas já no programa para filtrar o select de adição
  const fichasNoPrograma = new Set(programa?.map(p => p.fitr) ?? [])
  const fichasDisponiveis = fichas?.filter(f => !fichasNoPrograma.has(f.fitr_id)) ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        title="Programa das Turmas"
        description="Defina a sequência de fichas de treino para cada turma"
      />

      <Card className="max-w-lg">
        <CardContent className="pt-4 pb-4">
          <Select
            value={turmaId || '__none__'}
            onValueChange={v => setTurmaId(v === '__none__' ? '' : v)}
            disabled={loadingTurmas}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar turma..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-muted-foreground italic">
                Selecionar turma...
              </SelectItem>
              {turmas?.map(t => (
                <SelectItem key={t.tur_id} value={String(t.tur_id)}>{t.tur_nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {turmaId && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ClipboardList className="w-4 h-4 text-fluir-cyan" />
              {turmas?.find(t => String(t.tur_id) === turmaId)?.tur_nome}
              {programa && (
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  — {programa.length} ficha(s) no ciclo
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            {loadingPrograma ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : programa?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma ficha no programa. Adicione abaixo.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={programa.map(p => p.prog_id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {programa.map(item => (
                      <SortableItem
                        key={item.prog_id}
                        item={item}
                        onDelete={p => deleteMutation.mutate(p.prog_id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Adicionar ficha */}
            <div className="flex gap-2 pt-1">
              <div className="flex-1">
                <Select
                  value={fichaParaAdicionar || '__none__'}
                  onValueChange={v => setFichaParaAdicionar(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar ficha..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-muted-foreground italic">
                      Adicionar ficha...
                    </SelectItem>
                    {fichasDisponiveis.map(f => (
                      <SelectItem key={f.fitr_id} value={String(f.fitr_id)}>{f.fitr_nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={handleAdicionar}
                disabled={addMutation.isPending}
                className="shrink-0"
              >
                <Plus size={16} className="mr-1" /> Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
