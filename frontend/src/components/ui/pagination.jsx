import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function Pagination({ page, totalPages, count, onPageChange, className }) {
  if (totalPages <= 1 && count === 0) return null

  const pages = buildPages(page, totalPages)

  return (
    <div className={cn('flex items-center justify-between gap-2 text-xs text-muted-foreground', className)}>
      <span>{count} registro{count !== 1 ? 's' : ''}</span>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>

          {pages.map((p, i) =>
            p === '...' ? (
              <span key={`dot-${i}`} className="px-1">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? 'default' : 'ghost'}
                size="icon-sm"
                onClick={() => onPageChange(p)}
                className={p === page ? 'bg-fluir-purple text-white' : ''}
              >
                {p}
              </Button>
            )
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

function buildPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = []
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i)
    pages.push('...')
    pages.push(total)
  } else if (current >= total - 3) {
    pages.push(1)
    pages.push('...')
    for (let i = total - 4; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    pages.push('...')
    for (let i = current - 1; i <= current + 1; i++) pages.push(i)
    pages.push('...')
    pages.push(total)
  }
  return pages
}
