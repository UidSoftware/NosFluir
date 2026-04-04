import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { subscribeToast } from '@/hooks/useToast'

const ToastProvider = ToastPrimitive.Provider
const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      'fixed bottom-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col gap-2',
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitive.Viewport.displayName

const ICONS = {
  success:     <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
  destructive: <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />,
  default:     <Info className="w-4 h-4 text-fluir-cyan shrink-0" />,
}

function ToastItem({ title, description, variant = 'default', onClose }) {
  const [open, setOpen] = React.useState(true)

  return (
    <ToastPrimitive.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setTimeout(onClose, 300)
      }}
      duration={4000}
      className={cn(
        'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-xl',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full',
        'data-[state=open]:slide-in-from-bottom-full',
        variant === 'destructive'
          ? 'bg-red-950/80 border-red-500/30'
          : variant === 'success'
          ? 'bg-emerald-950/80 border-emerald-500/30'
          : 'bg-card border-border'
      )}
    >
      {ICONS[variant] || ICONS.default}
      <div className="flex-1 min-w-0">
        {title && (
          <ToastPrimitive.Title className="text-sm font-medium leading-snug">
            {title}
          </ToastPrimitive.Title>
        )}
        {description && (
          <ToastPrimitive.Description className="text-xs text-muted-foreground mt-0.5">
            {description}
          </ToastPrimitive.Description>
        )}
      </div>
      <ToastPrimitive.Close
        onClick={() => setOpen(false)}
        className="shrink-0 text-muted-foreground hover:text-foreground mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  )
}

// ── Toaster — coloque em AppLayout ───────────────────────────────────────────
export function Toaster() {
  const [toasts, setToasts] = React.useState([])

  React.useEffect(() => {
    const unsub = subscribeToast((opts) => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, ...opts }])
    })
    return unsub
  }, [])

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(t => (
        <ToastItem key={t.id} {...t} onClose={() => remove(t.id)} />
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}

// Re-export para uso sem hook
export { useToast } from '@radix-ui/react-toast'
