import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  right?: ReactNode
}

export function SectionHeader({ title, subtitle, right }: SectionHeaderProps) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-zinc-400">{subtitle}</p> : null}
      </div>
      {right}
    </header>
  )
}
