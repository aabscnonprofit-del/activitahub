'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

/**
 * Cinematic hero background. Drop additional warm/golden-hour photos into
 * public/hero/ and add their paths below to enable a slow, controls-free
 * cross-fade rotation (45–90s dwell). A single image renders as a static photo;
 * an empty list falls back to the golden-hour gradient. The first image is
 * preloaded (priority) to avoid layout shift.
 */
const HERO_IMAGES = ['/hero/hero-1.jpg']

export function HeroBackground() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (HERO_IMAGES.length < 2) return
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const ms = 45000 + Math.random() * 45000 // 45–90s cinematic dwell
      timer = setTimeout(() => {
        setActive((a) => (a + 1) % HERO_IMAGES.length)
        tick()
      }, ms)
    }
    tick()
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Warm golden-hour fallback — also visible while the first photo loads. */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-950 via-amber-800 to-slate-950" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 75% 55% at 50% 78%, rgba(251,191,36,0.45), transparent 70%)',
        }}
      />

      {/* Photo layers — slow cross-fade, no controls/carousel. */}
      {HERO_IMAGES.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          priority={i === 0}
          sizes="100vw"
          className={`object-cover object-center transition-opacity duration-[2000ms] ease-in-out ${
            i === active ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {/* Readability overlay — darker top/bottom, lighter through the middle. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/65" />
    </div>
  )
}

export default HeroBackground
