import { STREAM_FAILED, STREAM_REFUSED, STREAM_RESET } from '../src/stream-protocol.ts'
import { cleanVerse } from '../src/verse.ts'
import { EN_BLOCKLIST } from './blocklists/en.ts'
import { ES_BLOCKLIST } from './blocklists/es.ts'
import { isRestart } from './restarts.ts'
import { spanishVerseRhymes } from './rhyme.ts'

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', $: 's', '!': 'i' }

const WORD_SEPARATORS = /[\s\-_/\\|,;:?¿¡()[\]{}"'`«»“”‘’*+=<>~^&%#]+/

type Word = string[]

function normalizeWord(raw: string): string {
  let word = raw.replace(/^[.!…]+|[.!…]+$/g, '')
  if (/[a-z]/.test(word)) word = word.replace(/[0134578@$!]/g, (c) => LEET[c])
  return word.replace(/[^a-z]/g, '')
}

function spellings(word: string): Word {
  return [...new Set([word, word.replace(/(.)\1{2,}/g, '$1'), word.replace(/(.)\1{2,}/g, '$1$1')])]
}

export function normalize(text: string): Word[] {
  const words = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(WORD_SEPARATORS)
    .map(normalizeWord)
    .filter(Boolean)

  const merged: string[] = []
  for (let i = 0; i < words.length; ) {
    let end = i
    while (end < words.length && words[end].length === 1) end++
    if (end - i >= 3) {
      merged.push(words.slice(i, end).join(''))
      i = end
    } else {
      merged.push(words[i])
      i++
    }
  }
  return merged.map(spellings)
}

interface Entry {
  words: string[]
  prefix: boolean
}

function compile(list: string[]): Entry[] {
  return list.map((raw) => {
    const prefix = raw.endsWith('*')
    const words = normalize(prefix ? raw.slice(0, -1) : raw).map((spelling) => spelling[0])
    return { words, prefix }
  })
}

const ENTRIES = compile([...EN_BLOCKLIST, ...ES_BLOCKLIST])

function matchesAt(words: Word[], start: number, entry: Entry): boolean {
  if (start + entry.words.length > words.length) return false
  return entry.words.every((target, k) => {
    const isPrefix = entry.prefix && k === entry.words.length - 1
    return words[start + k].some((spelling) => (isPrefix ? spelling.startsWith(target) : spelling === target))
  })
}

export function isBlocked(text: string): boolean {
  const words = normalize(text)
  for (let i = 0; i < words.length; i++) {
    if (ENTRIES.some((entry) => matchesAt(words, i, entry))) return true
  }
  return false
}

const MAX_RESTARTS = 2
const MAX_REWRITES = 2

type Outcome = 'ok' | 'blocked' | 'restarted' | 'unrhymed'

export async function* moderatedVerse(
  first: AsyncGenerator<string>,
  retry: () => Promise<AsyncGenerator<string>>,
  lang?: 'en' | 'es',
): AsyncGenerator<string> {
  let blocked = 0
  let restarts = 0
  let rewrites = 0
  for (let attempt = 0; ; attempt++) {
    if (attempt > 0) yield STREAM_RESET
    const chunks = attempt === 0 ? first : await retry()
    const outcome = yield* checkedLines(chunks, lang)
    if (outcome === 'ok') return
    // Out of rewrites: the last verse is already on screen and free of remarks, so keep it.
    if (outcome === 'unrhymed' && ++rewrites > MAX_REWRITES) return
    if (outcome === 'blocked' && ++blocked === 2) break
    if (outcome === 'restarted' && ++restarts > MAX_RESTARTS) {
      yield STREAM_FAILED
      return
    }
  }
  yield STREAM_REFUSED
}

// Last check once the whole verse is in, before the stream closes: Spanish verses must rhyme.
function finalCheck(verse: string, lang?: 'en' | 'es'): Outcome {
  return lang === 'es' && !spanishVerseRhymes(cleanVerse(verse)) ? 'unrhymed' : 'ok'
}

async function* checkedLines(chunks: AsyncGenerator<string>, lang?: 'en' | 'es'): AsyncGenerator<string, Outcome> {
  let pending = ''
  let previous = ''
  let sent = ''
  const check = (line: string): Outcome => {
    const blocked = isBlocked(`${previous} ${line}`)
    previous = line
    if (blocked) return 'blocked'
    return isRestart(line) ? 'restarted' : 'ok'
  }

  try {
    for await (const chunk of chunks) {
      pending += chunk
      let newline: number
      while ((newline = pending.indexOf('\n')) !== -1) {
        const line = pending.slice(0, newline + 1)
        pending = pending.slice(newline + 1)
        const outcome = check(line)
        if (outcome !== 'ok') return outcome
        yield line
        sent += line
      }
    }
    if (pending) {
      const outcome = check(pending)
      if (outcome !== 'ok') return outcome
      yield pending
      sent += pending
    }
    return finalCheck(sent, lang)
  } finally {
    await chunks.return(undefined)
  }
}
