import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { STREAM_FAILED, STREAM_REFUSED, STREAM_RESET } from '../src/stream-protocol.ts'
import { isBlocked, moderatedVerse } from './moderation.ts'

describe('isBlocked', () => {
  const clean = {
    en: [
      'Maria',
      'Dick Van Dyke',
      'nurse, loves coffee, always late',
      'graduated cum laude and plays the bassoon',
      'grows shiitake mushrooms in Sussex',
      'Death came knocking with a grin, and off to the graveyard Sam would go',
      'they skip leg day and kill it at karaoke',
    ],
    es: [
      'José Ñúñez',
      'maestra de computación, siempre llega tarde',
      'toca el fagot y es pinche de cocina',
      'le dicen el Gordo y es muy cabrón para el dominó',
      'Andaba Ana muy campante sin pensar en el panteón',
      'la Catrina se lo llevó a la tumba por glotón',
      'come panocha de piloncillo cada Día de Muertos',
    ],
  }

  const offensive = {
    en: [
      'kill yourself',
      'loves porn',
      'is a total bitch',
      'F U C K this guy',
      'sh!t-talker',
      'fuuuuck',
      'a$$hole',
      'B1TCH',
      'retarded coworker',
      'thinks about suicide',
    ],
    es: [
      'es un pendejo',
      'Pút0 el que lo lea',
      'hijo de puta',
      'te voy a matar',
      'mátate',
      'p e n d e j o',
      'chíngate',
      'le gusta el porno',
      'es una zorra',
      'habla de suicidarse',
    ],
  }

  for (const lang of ['en', 'es'] as const) {
    for (const text of clean[lang]) {
      it(`allows (${lang}): ${text}`, () => assert.equal(isBlocked(text), false))
    }
    for (const text of offensive[lang]) {
      it(`blocks (${lang}): ${text}`, () => assert.equal(isBlocked(text), true))
    }
  }

  it('catches a phrase split across lines', () => {
    assert.equal(isBlocked('nobody really\nloves you'), false)
    assert.equal(isBlocked('kill\nyourself'), true)
  })
})

async function* chunksOf(...chunks: string[]): AsyncGenerator<string> {
  yield* chunks
}

async function collect(stream: AsyncGenerator<string>): Promise<string> {
  let out = ''
  for await (const chunk of stream) out += chunk
  return out
}

describe('moderatedVerse', () => {
  it('passes a clean verse through unchanged', async () => {
    const verse = 'Andaba Ana muy campante\nsin pensar en el panteón,\ncuando vio a la Catrina'
    let retries = 0
    const out = await collect(
      moderatedVerse(chunksOf('Andaba Ana muy ', 'campante\nsin pensar en el panteón,\n', 'cuando vio a la Catrina'), async () => {
        retries++
        return chunksOf()
      }),
    )
    assert.equal(out, verse)
    assert.equal(retries, 0)
  })

  it('never sends the blocked line, then retries once', async () => {
    const out = await collect(
      moderatedVerse(chunksOf('First line is fine,\n', 'this one says fuck\n', 'never reached\n'), async () =>
        chunksOf('A kinder verse\n', 'all the way through\n'),
      ),
    )
    assert.equal(out, `First line is fine,\n${STREAM_RESET}A kinder verse\nall the way through\n`)
  })

  it('refuses when the retry fails too', async () => {
    const out = await collect(
      moderatedVerse(chunksOf('pendejo\n'), async () => chunksOf('Clean start\n', 'otra vez pendejo')),
    )
    assert.equal(out, `${STREAM_RESET}Clean start\n${STREAM_REFUSED}`)
  })

  it('stops reading the model once a line fails', async () => {
    let finished = false
    async function* model() {
      try {
        yield 'bitch\n'
        yield 'more\n'
      } finally {
        finished = true
      }
    }
    await collect(moderatedVerse(model(), async () => chunksOf('ok\n')))
    assert.equal(finished, true)
  })

  it('drops a verse the model starts over, then retries', async () => {
    const out = await collect(
      moderatedVerse(chunksOf('Llegó la Flaca al taxi\n', 'Perdón, empiezo de nuevo.\n', 'never sent\n'), async () =>
        chunksOf('Una versión limpia\n'),
      ),
    )
    assert.equal(out, `Llegó la Flaca al taxi\n${STREAM_RESET}Una versión limpia\n`)
  })

  it('gives up with STREAM_FAILED after repeated restarts', async () => {
    let retries = 0
    const out = await collect(
      moderatedVerse(chunksOf('Ahora lo hago bien:\n'), async () => {
        retries++
        return chunksOf('Me sigue sin cuadrar. Intento una última vez:\n')
      }),
    )
    assert.equal(retries, 2)
    assert.equal(out, `${STREAM_RESET}${STREAM_RESET}${STREAM_FAILED}`)
  })

  const rhymed = 'Iba Rosa muy campante\ncon su pan y su café;\nvino la Flaca elegante:\ncon ella Rosa se fue.\n'
  const unrhymed = 'Llegó la Flaca a la casa\ncon su lista en la mano;\nAna no supo qué pasa\ny se fue con su hermana.\n'

  it('drops a remark about the rhyme and rewrites', async () => {
    const out = await collect(
      moderatedVerse(
        chunksOf('Iba Rosa muy campante\n', '\n', '---\n', 'Some lines need reshaping to hold the rhyme.\n'),
        async () => chunksOf(rhymed),
      ),
    )
    assert.equal(out, `Iba Rosa muy campante\n\n${STREAM_RESET}${rhymed}`)
    assert.ok(!out.includes('reshaping'))
  })

  it('rewrites a Spanish verse that fails the final rhyme check', async () => {
    let retries = 0
    const out = await collect(
      moderatedVerse(
        chunksOf(unrhymed),
        async () => {
          retries++
          return chunksOf(rhymed)
        },
        'es',
      ),
    )
    assert.equal(retries, 1)
    assert.equal(out, `${unrhymed}${STREAM_RESET}${rhymed}`)
  })

  it('keeps the last verse once rhyme rewrites run out', async () => {
    let retries = 0
    const out = await collect(
      moderatedVerse(
        chunksOf(unrhymed),
        async () => {
          retries++
          return chunksOf(unrhymed)
        },
        'es',
      ),
    )
    assert.equal(retries, 2)
    assert.equal(out, `${unrhymed}${STREAM_RESET}${unrhymed}${STREAM_RESET}${unrhymed}`)
  })

  it('skips the rhyme check for English', async () => {
    const verse = 'Death came for Sam\nwho sat on a chair\nshe took him away\nto the graveyard there\n'
    const out = await collect(moderatedVerse(chunksOf(verse), async () => chunksOf(), 'en'))
    assert.ok(!out.includes(STREAM_RESET))
  })
})
