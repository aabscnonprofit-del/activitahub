import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Locale, OnboardingPath } from '@/lib/types'

// Merge Tailwind CSS classes safely
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// Format a UTC ISO string for display in the user's timezone
export function formatDate(
  isoString: string,
  timezone: string = 'UTC',
  locale: Locale = 'en'
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(isoString))
}

export function formatDateTime(
  isoString: string,
  timezone: string = 'UTC',
  locale: Locale = 'en'
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString))
}

// Format a monetary amount
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: Locale = 'en'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

// Human-readable label for onboarding path
export function getPathLabel(path: OnboardingPath): string {
  return path === 'beginner' ? 'Beginner' : 'Experienced'
}

// Check if a subscription status means active access
export function isSubscriptionActive(status: string | null | undefined): boolean {
  return status === 'active'
}

// Build absolute URL from a path (for email links, QR codes, etc.)
export function absoluteUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  return `${base}${path}`
}
