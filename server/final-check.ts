import type { Pronouns } from '../src/input.ts'
import { cleanVerse } from '../src/verse.ts'
import { spanishVerseRhymes } from './rhyme.ts'

export interface VerseContext {
  lang: 'en' | 'es'
  pronouns: Pronouns
  // What the visitor typed, so their own spellings (TikTok, McAllen) never count against the verse.
  source: string
}

export type Problem = 'empty' | 'glued' | 'pronouns' | 'rhyme'

const BRANDS = new Set(['whatsapp', 'youtube', 'tiktok', 'linkedin', 'playstation', 'powerpoint', 'github', 'javascript', 'typescript', 'ebay', 'paypal'])

function plain(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

// Two words run together, like "Ya noCuenta chistes": a capital letter after a lowercase one.
function gluedWord(verse: string, source: string): boolean {
  const own = new Set(plain(source).match(/[\p{L}]+/gu) ?? [])
  const words = verse.match(/[\p{L}]+/gu) ?? []
  return words.some((word) => {
    if (!/\p{Ll}\p{Lu}/u.test(word)) return false
    const key = plain(word)
    return !own.has(key) && !BRANDS.has(key) && !/^(i|Mc|Mac)\p{Lu}/u.test(word)
  })
}

// Gendered object pronouns that the "they" prompt forbids: "la llevó", "se lo llevó", "llevarla", "llevándolo".
const CLITIC_VERB =
  /\b(la|lo)\s+(llev|hall|encontr|atrap|alcanz|busc|agarr|delat|arrastr|jal|sorprend|recog|abraz|salud)(o|aba|aban|aron|an|a|ara|e|io|ia|ian|ieron)\b/
const CLITIC_SEEN = /\b(la|lo)\s+(vio|veia|ve|ven|vieron)\b/
const ENCLITIC = /\b[a-z]{3,}(ar|er|ir|ando|iendo)l[oa]\b/g

function gendersThem(verse: string, source: string): boolean {
  const text = plain(verse)
  const own = new Set(plain(source).match(/[a-z]+/g) ?? [])
  if (CLITIC_VERB.test(text) || CLITIC_SEEN.test(text)) return true
  return (text.match(ENCLITIC) ?? []).some((word) => !own.has(word))
}

// The last check before a finished verse is accepted. Anything it finds sends the verse back to be rewritten.
export function finalProblem(raw: string, { lang, pronouns, source }: VerseContext): Problem | null {
  const verse = cleanVerse(raw)
  if (!verse.trim()) return 'empty'
  if (gluedWord(verse, source)) return 'glued'
  if (lang === 'es' && pronouns === 'they' && gendersThem(verse, source)) return 'pronouns'
  if (lang === 'es' && !spanishVerseRhymes(verse)) return 'rhyme'
  return null
}
