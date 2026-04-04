import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

// ── Input ────────────────────────────────────────────────────────────────────
export const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-9 w-full rounded-lg border border-input bg-fluir-dark-3',
      'px-3 py-2 text-sm placeholder:text-muted-foreground/60',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'transition-colors',
      className
    )}
    {...props}
  />
))
Input.displayName = 'Input'

// ── Textarea ─────────────────────────────────────────────────────────────────
export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[80px] w-full rounded-lg border border-input bg-fluir-dark-3',
      'px-3 py-2 text-sm placeholder:text-muted-foreground/60',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'resize-none transition-colors',
      className
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

// ── Label ────────────────────────────────────────────────────────────────────
export const Label = React.forwardRef(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-xs font-medium text-muted-foreground', className)}
    {...props}
  />
))
Label.displayName = 'Label'

// ── FormField ────────────────────────────────────────────────────────────────
export function FormField({ label, required, error, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </Label>
      )}
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ children, className, variant = 'default' }) {
  const variants = {
    default:     'bg-fluir-purple/15 text-fluir-purple border-fluir-purple/20',
    secondary:   'bg-fluir-dark-3 text-muted-foreground border-border',
    success:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    warning:     'bg-amber-500/15 text-amber-400 border-amber-500/20',
    destructive: 'bg-red-500/15 text-red-400 border-red-500/20',
    cyan:        'bg-fluir-cyan/10 text-fluir-cyan border-fluir-cyan/20',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        variants[variant] || variants.default,
        className
      )}
    >
      {children}
    </span>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-fluir-dark-3', className)}
      {...props}
    />
  )
}

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ className, size = 'default' }) {
  const sizes = { sm: 'w-3.5 h-3.5', default: 'w-5 h-5', lg: 'w-7 h-7' }
  return (
    <div
      className={cn(
        'rounded-full border-2 border-border border-t-fluir-purple animate-spin',
        sizes[size] || sizes.default,
        className
      )}
    />
  )
}

// ── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-fluir-dark-3 flex items-center justify-center">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
      {action}
    </div>
  )
}
