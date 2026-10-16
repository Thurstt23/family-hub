import { cn } from 'cn'

// A styled native <select>. Used in admin filter bars and forms that must work
// as plain GET/POST forms, where a native control submits without JavaScript
// and gets platform keyboard and screen reader behaviour for free.
export function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-10 w-full min-w-0 rounded-sm border border-input bg-card px-3 text-sm text-ink transition-colors outline-none',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'flex min-h-24 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-sm text-ink outline-none transition-colors',
        'placeholder:text-slate focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export function FieldLabel({ className, ...props }: React.ComponentProps<'label'>) {
  return <label className={cn('block text-sm font-medium text-ink mb-1.5', className)} {...props} />
}
