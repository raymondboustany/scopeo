import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { LOCALE, tr } from '@/i18n'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

const DATE_FMT = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })
const DATE_SHORT = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' })

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : DATE_FMT.format(d)
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : DATE_SHORT.format(d)
}

export function formatEur(n: number): string {
  const en = LOCALE === 'en-GB'
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    const v = m.toLocaleString(LOCALE, { maximumFractionDigits: m < 10 ? 1 : 0 })
    return en ? `€${v}M` : `${v} M€`
  }
  if (n >= 1_000) {
    const v = Math.round(n / 1_000).toLocaleString(LOCALE)
    return en ? `€${v}k` : `${v} k€`
  }
  return en ? `€${n.toLocaleString(LOCALE)}` : `${n.toLocaleString(LOCALE)} €`
}

export function formatPct(ratio: number): string {
  return LOCALE === 'en-GB' ? `${Math.round(ratio * 100)}%` : `${Math.round(ratio * 100)} %`
}

/** Délai en heures rendu lisible : 24 h, 72 h, 1 mois. */
export function formatDelay(hours: number): string {
  if (hours < 24) return `${hours} h`
  if (hours === 24) return '24 h'
  if (hours < 168) return `${hours} h`
  if (hours === 336) return tr('2 semaines', '2 weeks')
  if (hours >= 672 && hours <= 744) return tr('1 mois', '1 month')
  return tr(`${Math.round(hours / 24)} jours`, `${Math.round(hours / 24)} days`)
}

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function uid(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** Nombre de jours entre aujourd'hui et une date ISO. Négatif si passée. */
export function daysUntil(iso: string): number {
  const target = new Date(iso).getTime()
  const now = Date.now()
  return Math.round((target - now) / 86_400_000)
}
