import Image from 'next/image'
import { cn } from '@/lib/utils'

interface BrandMarkProps {
  /** Rendered width/height in px. Defaults to 32. */
  size?: number
  className?: string
  priority?: boolean
}

/**
 * ActivLife Hub primary compact logo mark.
 *
 * The source art is a circular emblem on a white field; we clip it into a
 * `rounded-full` white chip so it reads cleanly on light headers, the dark
 * hero gradient, and slate footers alike. Always paired with the wordmark,
 * so the image itself is decorative (empty alt).
 */
export function BrandMark({ size = 32, className, priority = false }: BrandMarkProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-black/5',
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.png"
        alt=""
        width={size}
        height={size}
        priority={priority}
        className="h-full w-full object-cover"
      />
    </span>
  )
}

export default BrandMark
