import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-fluir-purple text-white hover:bg-fluir-purple/90 active:scale-95',
        gradient:
          'bg-gradient-fluir text-white hover:opacity-90 active:scale-95 shadow-md shadow-fluir-purple/20',
        outline:
          'border border-border bg-transparent text-foreground hover:bg-fluir-dark-3',
        ghost:
          'bg-transparent text-muted-foreground hover:bg-fluir-dark-3 hover:text-foreground',
        destructive:
          'bg-destructive/10 text-red-400 border border-destructive/20 hover:bg-destructive/20',
        secondary:
          'bg-fluir-dark-3 text-foreground hover:bg-fluir-dark-4',
        link:
          'text-fluir-cyan underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default:  'h-9 px-4 py-2',
        sm:       'h-8 px-3 text-xs',
        lg:       'h-10 px-6',
        icon:     'h-9 w-9',
        'icon-sm': 'h-7 w-7 text-xs rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = 'Button'

export { Button, buttonVariants }
