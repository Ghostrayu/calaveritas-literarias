export const PRONOUNS = ['he', 'she', 'they'] as const
export type Pronouns = (typeof PRONOUNS)[number]

export const TONES = ['gentle', 'roast', 'sweet', 'spooky'] as const
export type Tone = (typeof TONES)[number]

export const LIMITS = { name: 40, occupation: 60, traits: 200 } as const

export interface CalaveritaInput {
  name: string
  pronouns: Pronouns
  occupation: string
  traits: string
  tone: Tone
}

export type Field = keyof CalaveritaInput

export type FieldErrors = Partial<Record<Field, string>>

export type ParseResult = { ok: true; input: CalaveritaInput } | { ok: false; errors: FieldErrors }

function clean(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return options.includes(value as T)
}

export function parseInput(raw: Record<string, unknown>): ParseResult {
  const name = clean(raw.name)
  const occupation = clean(raw.occupation)
  const traits = clean(raw.traits)
  const errors: FieldErrors = {}

  if (!name) errors.name = 'form.name.required'
  else if (name.length > LIMITS.name) errors.name = 'form.name.tooLong'

  if (!isOneOf(PRONOUNS, raw.pronouns)) errors.pronouns = 'form.pronouns.required'

  if (occupation.length > LIMITS.occupation) errors.occupation = 'form.occupation.tooLong'
  if (traits.length > LIMITS.traits) errors.traits = 'form.traits.tooLong'

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    input: {
      name,
      pronouns: raw.pronouns as Pronouns,
      occupation,
      traits,
      tone: isOneOf(TONES, raw.tone) ? raw.tone : 'gentle',
    },
  }
}
