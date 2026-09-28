import { ReactNode } from 'react'

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <h3 className="text-lg font-serif mb-1">{title}</h3>
      <p className="text-slate mb-4">{description}</p>
      {action}
    </div>
  )
}
