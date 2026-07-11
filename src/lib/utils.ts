import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, fromUnixTime } from "date-fns"
import { id } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency in Indonesian Rupiah
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format Unix timestamp to readable date
 */
export function formatDate(timestamp: number, formatStr: string = 'dd MMM yyyy'): string {
  return format(fromUnixTime(timestamp), formatStr, { locale: id })
}

/**
 * Title-case a string (capitalize each word). Safe for empty/undefined.
 */
export function titleCase(value?: string | null): string {
  if (!value) return ''
  return value
    .toLowerCase()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase())
}

/**
 * Build a wa.me chat link from a phone number, with an optional prefilled text.
 * Normalizes to international format (62xxx, no leading 0/+).
 * Returns null when there's no usable number.
 */
export function waLink(phone?: string | null, text?: string | null): string | null {
  if (!phone) return null
  let p = phone.replace(/\D/g, '')
  if (!p) return null
  p = p.replace(/^0+/, '')
  if (!p.startsWith('62')) p = '62' + p
  const base = `https://wa.me/${p}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
