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
 * Source art is a transparent-background emblem (public/logo.png), trimmed to
 * its bounding box so it fills the given box edge-to-edge. Rendered directly —
 * no container chip — so it sits cleanly on light and dark surfaces alike.
 * Always paired with the wordmark, so the image itself is decorative.
 */
export function BrandMark({ size = 32, className, priority = false }: BrandMarkProps) {
  return (
    <Image
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      priority={priority}
      sizes={`${size}px`}
      className={cn('shrink-0 object-contain', className)}
      style={{ width: size, height: size }}
    />
  )
}

export default BrandMark
