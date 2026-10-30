import type { CalaveritaInput } from '../src/input.ts'
import { toFirstPerson } from './first-person.ts'

const LINE_DELAY_MS = 150

const EN_PRONOUNS = {
  he: { subject: 'he', possessive: 'his' },
  she: { subject: 'she', possessive: 'her' },
  they: { subject: 'they', possessive: 'their' },
} as const

function pick<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)]
}

function firstName(name: string): string {
  return name.split(' ')[0]
}

function firstItem(list: string): string {
  return list.split(',')[0].trim()
}

function englishVerse({ name, pronouns, occupation, traits }: CalaveritaInput): string[] {
  const { subject, possessive } = EN_PRONOUNS[pronouns]
  const short = firstName(name)
  const plea = toFirstPerson(firstItem(traits), 'en')
  return [
    `Here's a calaverita for ${name}:`,
    '',
    `**Calaverita for ${name}**`,
    '',
    `${name} was strolling, carefree and bright,`,
    'not thinking of graves or of gloom,',
    'when La Catrina stepped into the light',
    'and smiled: "I have saved you a room."',
    '',
    occupation ? `"Farewell, ${firstItem(occupation)}, your shift is done,"` : '"Your time on this earth is now done,"',
    'she said with a rattle of bone;',
    '"come dance where the marigolds run,',
    'you won\'t be returning alone."',
    '',
    `${short} begged for just one more day,`,
    plea ? `"But ${plea}!" ${subject} pleaded with charm;` : `with a wink, ${subject} pleaded with charm;`,
    'but Catrina just laughed it away',
    `and walked off with ${short} by the arm.`,
    '',
    ...pick([
      [
        'So set out the candles alight,',
        `leave ${possessive} favorite treat by the door;`,
        `${short} is out dancing tonight`,
        'in the graveyard, the same as before.',
      ],
      [
        'Now under the marigold glow,',
        `${short} is the life of the ball;`,
        'the skeletons all want to know',
        `how ${subject} got the best seat of all.`,
      ],
    ]),
    '',
    'I hope you enjoy it!',
  ]
}

function spanishVerse({ name, occupation, traits }: CalaveritaInput): string[] {
  const short = firstName(name)
  const plea = toFirstPerson(firstItem(traits), 'es')
  return [
    `¡Claro! Aquí tienes una calaverita para ${name}:`,
    '',
    `**Calaverita para ${name}**`,
    '',
    `Andaba ${name} muy campante`,
    'sin pensar en el panteón,',
    'cuando vio a la elegante',
    'Catrina en su callejón.',
    '',
    '—Vengo por ti —dijo ella—,',
    'ya te llegó tu ocasión;',
    occupation ? `de ser ${firstItem(occupation)} no queda huella,` : 'de tus días no queda huella,',
    'hoy te vas en mi camión.',
    '',
    plea ? `«¡Pero ${plea}!», quiso alegar` : 'Por su vida quiso alegar',
    `${short} con picardía;`,
    'la Catrina, sin dudar,',
    'se rió con alegría.',
    '',
    ...pick([
      [
        'Y así, entre flores y canto,',
        `se fue ${short} al más allá;`,
        'en el panteón, con su manto,',
        'sigue de fiesta quizá.',
      ],
      [
        'Ahora en el panteón florido',
        `${short} baila sin parar;`,
        'dice que nunca ha vivido',
        'tan a gusto en su lugar.',
      ],
    ]),
    '',
    '¡Espero que te guste!',
  ]
}

export async function* mockVerseChunks(
  input: CalaveritaInput,
  lang: 'en' | 'es',
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const lines = lang === 'es' ? spanishVerse(input) : englishVerse(input)
  for (const line of lines) {
    if (signal?.aborted) return
    await new Promise((resolve) => setTimeout(resolve, LINE_DELAY_MS))
    yield `${line}\n`
  }
}
