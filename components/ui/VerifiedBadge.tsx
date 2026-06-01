import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VerifiedBadgeProps {
  label: string
  /** Render just the shield (with the label as an accessible title). */
  iconOnly?: boolean
  className?: string
}

/**
 * Verified-organizer trust marker. Reinforces certification credibility wherever
 * an organizer appears. Purely presentational — reflects existing
 * `organizer_certified` data, introduces no new status system.
 */
export function VerifiedBadge({ label, iconOnly = false, className }: VerifiedBadgeProps) {
  if (iconOnly) {
    return (
      <ShieldCheck
        className={cn('h-4 w-4 text-green-600', className)}
        aria-label={label}
      />
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-200',
        className
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}

export default VerifiedBadge
