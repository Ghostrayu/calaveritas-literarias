const VOWELS = 'aeiouáéíóú'
const STRONG = 'aeoáéíóú'
const ACCENTED = 'áéíóú'
const UNACCENT: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' }

// Spell the word the way it sounds in Mexican Spanish, so caza/casa, vez/es and guerra/tierra
// compare equal: seseo, b/v, silent h and u, and y as a vowel at the end of a word.
function phonetic(word: string): string {
  return word
    .replace(/qu(?=[eiéí])/g, 'k')
    .replace(/gu(?=[eiéí])/g, 'G')
    .replace(/gü/g, 'Gu')
    .replace(/g(?=[eiéí])/g, 'j')
    .replace(/g/g, 'G')
    .replace(/ch/g, 'C')
    .replace(/c(?=[eiéí])/g, 's')
    .replace(/c/g, 'k')
    .replace(/z/g, 's')
    .replace(/v/g, 'b')
    .replace(/ll/g, 'y')
    .replace(/h/g, '')
    .replace(/ü/g, 'u')
    .replace(/y(?![aeiouáéíóú])/g, 'i')
}

// The sound from the stressed vowel to the end of the word: campante → ante, café → e.
export function rhymeTail(word: string): string {
  const lower = word.toLowerCase()
  const sound = phonetic(lower)

  const nuclei: { start: number; end: number }[] = []
  for (let i = 0; i < sound.length; i++) {
    if (!VOWELS.includes(sound[i])) continue
    const last = nuclei[nuclei.length - 1]
    const joinsDiphthong = last && last.end === i && !(STRONG.includes(sound[i - 1]) && STRONG.includes(sound[i]))
    if (joinsDiphthong) last.end = i + 1
    else nuclei.push({ start: i, end: i + 1 })
  }
  if (nuclei.length === 0) return sound

  const accented = nuclei.findIndex(({ start, end }) => [...sound.slice(start, end)].some((c) => ACCENTED.includes(c)))
  const llana = /[aeiouáéíóúns]$/.test(lower) && !lower.endsWith('y')
  const stressed = accented !== -1 ? accented : llana ? Math.max(nuclei.length - 2, 0) : nuclei.length - 1

  const { start, end } = nuclei[stressed]
  const vowels = sound.slice(start, end)
  const strong = [...vowels].findIndex((c) => STRONG.includes(c))
  const at = start + (strong !== -1 ? strong : vowels.length - 1)
  return sound.slice(at).replace(/[áéíóú]/g, (c) => UNACCENT[c])
}

function lastWord(line: string): string | null {
  const words = line.toLowerCase().match(/[a-záéíóúüñ]+/g)
  return words ? words[words.length - 1] : null
}

function rhymes(a: string, b: string): boolean {
  const wordA = lastWord(a)
  const wordB = lastWord(b)
  return wordA !== null && wordB !== null && rhymeTail(wordA) === rhymeTail(wordB)
}

// Every four-line stanza must rhyme lines 2 and 4, which both ABAB and ABCB require.
export function spanishVerseRhymes(verse: string): boolean {
  const stanzas = verse
    .split(/\n\s*\n/)
    .map((stanza) => stanza.split('\n').filter((line) => line.trim()))
    .filter((lines) => lines.length === 4)
  return stanzas.every((lines) => rhymes(lines[1], lines[3]))
}
