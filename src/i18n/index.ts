import en from './en.json'
import esJson from './es.json'

export type Lang = 'en' | 'es'
export type Messages = typeof en

export const LANGS: readonly Lang[] = ['en', 'es']

const es: Messages = esJson
const messages: Record<Lang, Messages> = { en, es }

const STORAGE_KEY = 'calaverita.lang'
let current: Lang = 'en'

function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'es'
}

export function getSavedLang(): Lang | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isLang(value) ? value : null
  } catch {
    return null
  }
}

function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
  }
}

export function getLang(): Lang {
  return current
}

export type Vars = Record<string, string | number>

export function t(key: string, lang: Lang = current, vars?: Vars): string {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages[lang])
  if (typeof value !== 'string') return key
  return vars ? value.replace(/\{(\w+)\}/g, (match, name: string) => String(vars[name] ?? match)) : value
}

export function applyTranslations(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const vars = el.dataset.i18nVars ? (JSON.parse(el.dataset.i18nVars) as Vars) : undefined
    el.textContent = t(el.dataset.i18n!, current, vars)
  })
  root.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach((el) => {
    for (const pair of el.dataset.i18nAttr!.split(';')) {
      const [attr, key] = pair.split(':')
      el.setAttribute(attr.trim(), t(key.trim()))
    }
  })
}

export function setLang(lang: Lang): void {
  current = lang
  saveLang(lang)
  document.documentElement.lang = lang
  document.title = t('app.title')
  applyTranslations()
}
