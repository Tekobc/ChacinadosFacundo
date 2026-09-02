type MetricCardProps = {
  title: string
  value: string | number
  hint?: string
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
}

const toneClasses = {
  primary: 'text-[var(--color-primary)]',
  success: 'text-[var(--color-success)]',
  warning: 'text-[var(--color-warning)]',
  danger: 'text-[var(--color-danger)]',
  neutral: 'text-[var(--color-text)]',
} as const

export function MetricCard({ title, value, hint, tone = 'neutral' }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <p className="text-sm text-[var(--color-muted)]">{title}</p>
      <p className={`mt-3 text-3xl font-semibold ${toneClasses[tone]}`}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-[var(--color-muted)]">{hint}</p> : null}
    </div>
  )
}
