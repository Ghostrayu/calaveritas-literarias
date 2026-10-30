const EN_IRREGULAR: Record<string, string> = { has: 'have', is: 'am', does: 'do', goes: 'go', was: 'was', says: 'say' }
const EN_ADVERBS = new Set(['always', 'never', 'often', 'still', 'really', 'usually', 'constantly', 'sometimes', 'secretly', 'totally', 'basically', 'also', 'just'])
const EN_PRONOUNS: Record<string, string> = {
  his: 'my', her: 'my', their: 'my', him: 'me', them: 'me',
  himself: 'myself', herself: 'myself', themself: 'myself', themselves: 'myself',
}

function englishBaseForm(word: string): string | null {
  if (EN_IRREGULAR[word]) return EN_IRREGULAR[word]
  if (word.length < 4 || !word.endsWith('s') || /(ss|us|is)$/.test(word)) return null
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (/(ch|sh|x|z|o)es$/.test(word)) return word.slice(0, -2)
  return word.slice(0, -1)
}

function englishFirstPerson(trait: string): string | null {
  const words = trait.split(' ')
  let i = 0
  while (i < words.length && EN_ADVERBS.has(words[i].toLowerCase())) i++
  const verb = words[i]?.toLowerCase()
  const adverbs = words.slice(0, i)
  const rest = words.slice(i + 1).map((word) => EN_PRONOUNS[word.toLowerCase()] ?? word)

  if (verb === 'is') return ["I'm", ...adverbs, ...rest].join(' ')
  if (adverbs.length > 0 && verb && !englishBaseForm(verb)) return ["I'm", ...adverbs, ...words.slice(i)].join(' ')

  const base = verb && englishBaseForm(verb)
  if (!base) return null
  return ['I', ...adverbs, base, ...rest].join(' ')
}

const ES_VERBS: Record<string, string> = {
  tiene: 'tengo', es: 'soy', está: 'estoy', va: 'voy', hace: 'hago', sabe: 'sé', dice: 'digo', pone: 'pongo',
  sale: 'salgo', viene: 'vengo', quiere: 'quiero', puede: 'puedo', juega: 'juego', duerme: 'duermo',
  piensa: 'pienso', prefiere: 'prefiero', pierde: 'pierdo', cuenta: 'cuento', sueña: 'sueño', ve: 'veo',
}
const ES_ADVERBS = new Set(['siempre', 'nunca', 'todavía', 'casi', 'ya', 'también', 'aún'])
const ES_POSSESSIVES: Record<string, string> = { su: 'mi', sus: 'mis' }

function spanishRegular(word: string): string {
  return word.replace(/[ae]$/, 'o')
}

function spanishFirstPerson(trait: string): string | null {
  const words = trait.split(' ')
  let i = 0
  while (i < words.length && ES_ADVERBS.has(words[i].toLowerCase())) i++
  const adverbs = words.slice(0, i)

  const clitic = words[i]?.toLowerCase()
  if ((clitic === 'le' || clitic === 'se') && words[i + 1]) {
    const verb = words[i + 1].toLowerCase()
    const conjugated = clitic === 'le' ? verb : (ES_VERBS[verb] ?? spanishRegular(verb))
    return [...adverbs, 'me', conjugated, ...swapSpanish(words.slice(i + 2))].join(' ')
  }

  const verb = words[i]?.toLowerCase()
  if (!verb) return null
  const known = ES_VERBS[verb]
  const conjugated = known ?? (adverbs.length > 0 && /[ae]$/.test(verb) ? spanishRegular(verb) : null)
  if (!conjugated) return null
  return [...adverbs, conjugated, ...swapSpanish(words.slice(i + 1))].join(' ')
}

function swapSpanish(words: string[]): string[] {
  return words.map((word) => ES_POSSESSIVES[word.toLowerCase()] ?? word)
}

export function toFirstPerson(trait: string, lang: 'en' | 'es'): string | null {
  const clean = trait.trim().replace(/\s+/g, ' ')
  if (!clean) return null
  return lang === 'es' ? spanishFirstPerson(clean) : englishFirstPerson(clean)
}
