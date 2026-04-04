import { cn } from '@/lib/utils'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/utils'

export function StatusBadge({ status, className }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>

  const colorClass = STATUS_COLORS[status] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
  const label = STATUS_LABELS[status] || status

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  )
}

export function BooleanBadge({ value, trueLabel = 'Sim', falseLabel = 'Não' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        value
          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
          : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
      )}
    >
      {value ? trueLabel : falseLabel}
    </span>
  )
}
