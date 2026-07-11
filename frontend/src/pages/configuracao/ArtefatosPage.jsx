import { useState, useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import { cn } from '@/lib/utils'
import { useList, useDelete } from '@/hooks/useApi'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { Spinner } from '@/components/ui/primitives'

const ENDPOINT = '/artefatos/'
const KEY      = 'artefatos'

mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' })
let mermaidSeq = 0

function MermaidBlock({ code }) {
  const containerRef = useRef(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let cancelado = false
    const id = `mermaid-${++mermaidSeq}`
    mermaid.render(id, code.trim())
      .then(({ svg }) => { if (!cancelado && containerRef.current) containerRef.current.innerHTML = svg })
      .catch(() => { if (!cancelado) setErro('Não foi possível renderizar este diagrama.') })
    return () => { cancelado = true }
  }, [code])

  if (erro) {
    return <pre className="whitespace-pre-wrap font-mono text-xs text-destructive">{erro}</pre>
  }
  return (
    <div className="overflow-x-auto bg-white rounded-lg p-4">
      <div ref={containerRef} />
    </div>
  )
}

function extrairDiagramasMermaid(conteudo) {
  return [...(conteudo || '').matchAll(/```mermaid\n([\s\S]*?)```/g)].map(m => m[1])
}

function renderizarConteudo(conteudo) {
  const partes = conteudo.split(/```mermaid\n([\s\S]*?)```/g)
  return partes.map((parte, i) => {
    if (i % 2 === 1) return null // diagrama Mermaid — ver pelo botão "Diagrama"
    if (!parte.trim()) return null
    return (
      <pre key={i} className="whitespace-pre-wrap break-words font-mono text-xs text-foreground bg-fluir-dark-3 rounded-lg p-4">
        {parte}
      </pre>
    )
  })
}

const TIPO_LABELS = {
  levantamento_requisitos: 'Levantamento de Requisitos',
  uml_usecase: 'UML — Casos de Uso',
  uml_classes: 'UML — Classes',
  uml_activity: 'UML — Atividades',
  uml_sequencia: 'UML — Sequência',
  uml_estado: 'UML — Estado',
  uml_componentes: 'UML — Componentes',
  uml_implantacao: 'UML — Implantação',
  dicionario_dados: 'Dicionário de Dados',
  regras_negocio: 'Regras de Negócio',
  design_system: 'Design System',
  adr: 'ADR',
  contrato_servico: 'Contrato de Serviço (documento)',
  especificacao_hotfix: 'Especificação de Hotfix',
  especificacao_ui_hotfix: 'Especificação de UI (Hotfix)',
  relatorio_qa: 'Relatório de QA',
  deploy_info: 'Informações de Deploy',
  outro: 'Outro',
}

const AGENTE_LABELS = {
  planner: 'Planner', analista: 'Analista', analista_uml: 'Analista UML',
  blueprint: 'Blueprint', brush: 'Brush', doc_generator: 'Doc Generator',
  forge: 'Forge', loom: 'Loom', sentinel: 'Sentinel',
  pilot: 'Pilot', hotfix: 'Hotfix',
}

const AGENTE_CORES = {
  planner: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  analista: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  analista_uml: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  blueprint: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  brush: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  doc_generator: 'bg-fluir-purple/15 text-fluir-purple border-fluir-purple/20',
  forge: 'bg-red-500/15 text-red-400 border-red-500/20',
  loom: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
  sentinel: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  pilot: 'bg-green-500/15 text-green-400 border-green-500/20',
  hotfix: 'bg-red-500/15 text-red-400 border-red-500/20',
}

function Badge({ children, className }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium', className)}>
      {children}
    </span>
  )
}

function formatData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR')
}

export default function ArtefatosPage() {
  const [selecionado, setSelecionado]   = useState(null)
  const [deleteAlvo, setDeleteAlvo]     = useState(null)
  const [modalDiagrama, setModalDiagrama] = useState(null)

  const { data, isLoading, page, setPage, totalPages, count, setFilters, filters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, {
    successMsg: 'Artefato excluído.',
    onSuccess: () => setSelecionado(null),
  })

  const aplicarFiltro = (campo, valor) => {
    const novos = { ...filters }
    if (valor) novos[campo] = valor
    else delete novos[campo]
    setFilters(novos)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Artefatos"
        description={`Documentação técnica gerada pelos agents do Claw Empire — ${count} artefato${count !== 1 ? 's' : ''}`}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <SearchFilter placeholder="Buscar por título ou conteúdo..." onSearch={q => aplicarFiltro('search', q)} className="flex-1" />
        <Select value={filters.tipo || 'todos'} onValueChange={v => aplicarFiltro('tipo', v === 'todos' ? '' : v)}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPO_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.agente || 'todos'} onValueChange={v => aplicarFiltro('agente', v === 'todos' ? '' : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Agent" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os agents</SelectItem>
            {Object.entries(AGENTE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-4 items-start">
        {/* Lista */}
        <Card className={cn('overflow-hidden', selecionado ? 'w-[380px] shrink-0' : 'flex-1')}>
          {isLoading ? (
            <div className="p-8 flex justify-center"><Spinner /></div>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum artefato encontrado.</p>
          ) : data.map(a => (
            <div key={a.id}
              onClick={() => setSelecionado(a)}
              className={cn(
                'px-4 py-3 border-b border-border cursor-pointer hover:bg-fluir-dark-3/50 transition-colors',
                selecionado?.id === a.id && 'bg-primary/10'
              )}>
              <div className="flex justify-between items-center mb-1.5">
                <Badge className={AGENTE_CORES[a.agente] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'}>
                  {AGENTE_LABELS[a.agente] || a.agente}
                </Badge>
                <span className="text-[11px] text-muted-foreground">{formatData(a.criado_em)}</span>
              </div>
              <div className="text-sm font-semibold text-foreground mb-0.5">{a.titulo}</div>
              <div className="text-[11px] text-muted-foreground">{TIPO_LABELS[a.tipo] || a.tipo}</div>
            </div>
          ))}
          <div className="p-3">
            <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
          </div>
        </Card>

        {/* Viewer */}
        {selecionado && (
          <Card className="flex-1 min-w-0 p-6">
            <div className="flex justify-between items-start mb-4 gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground font-display">{selecionado.titulo}</h2>
                <div className="flex gap-2 mt-2 items-center flex-wrap">
                  <Badge className={AGENTE_CORES[selecionado.agente] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'}>
                    {AGENTE_LABELS[selecionado.agente] || selecionado.agente}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{TIPO_LABELS[selecionado.tipo] || selecionado.tipo}</span>
                  {selecionado.status && <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20">{selecionado.status}</Badge>}
                  {extrairDiagramasMermaid(selecionado.conteudo).length > 0 && (
                    <Button size="sm" variant="secondary" onClick={() => setModalDiagrama({
                      titulo: selecionado.titulo,
                      diagramas: extrairDiagramasMermaid(selecionado.conteudo),
                    })}>
                      📊 Diagrama
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => setDeleteAlvo(selecionado)}>
                  Excluir
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelecionado(null)}>Fechar</Button>
              </div>
            </div>

            {(selecionado.commit_hash || selecionado.deploy_url) && (
              <div className="flex gap-4 flex-wrap mb-4 px-3.5 py-2.5 bg-fluir-dark-3 rounded-lg text-xs">
                {selecionado.commit_hash && (
                  <span className="text-muted-foreground">Commit: <code className="text-foreground">{selecionado.commit_hash.slice(0, 10)}</code></span>
                )}
                {selecionado.deploy_url && (
                  <a href={selecionado.deploy_url} target="_blank" rel="noreferrer" className="text-primary">🔗 Ver deploy</a>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 max-h-[560px] overflow-y-auto">
              {selecionado.conteudo ? renderizarConteudo(selecionado.conteudo) : (
                <pre className="text-muted-foreground">(sem conteúdo)</pre>
              )}
            </div>
          </Card>
        )}
      </div>

      <Dialog open={!!modalDiagrama} onOpenChange={() => setModalDiagrama(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{modalDiagrama?.titulo}</DialogTitle></DialogHeader>
          <div className="p-5 pt-3 overflow-auto flex flex-col gap-4">
            {modalDiagrama?.diagramas.map((codigo, i) => <MermaidBlock key={i} code={codigo} />)}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteAlvo} onOpenChange={() => setDeleteAlvo(null)}
        title="Excluir Artefato"
        description={`Tem certeza que deseja excluir "${deleteAlvo?.titulo}"?`}
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteAlvo.id); setDeleteAlvo(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
