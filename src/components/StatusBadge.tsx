type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const toneClasses: Record<BadgeTone, string> = {
  success: 'bg-[rgba(76,122,107,0.12)] text-[var(--color-success)]',
  warning: 'bg-[rgba(217,164,65,0.12)] text-[var(--color-warning)]',
  danger: 'bg-[rgba(178,58,52,0.12)] text-[var(--color-danger)]',
  info: 'bg-[rgba(193,68,14,0.12)] text-[var(--color-primary)]',
  neutral: 'bg-[rgba(30,36,34,0.08)] text-[var(--color-text)]',
}

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}>
      {label}
    </span>
  )
}
