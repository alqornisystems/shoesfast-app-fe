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
 * Build a wa.me chat link from a phone number.
 * Normalizes to international format (62xxx, no leading 0/+).
 * Returns null when there's no usable number.
 */
export function waLink(phone?: string | null): string | null {
  if (!phone) return null
  let p = phone.replace(/\D/g, '')
  if (!p) return null
  p = p.replace(/^0+/, '')
  if (!p.startsWith('62')) p = '62' + p
  return `https://wa.me/${p}`
}
