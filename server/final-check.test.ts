import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { finalProblem, type VerseContext } from './final-check.ts'

const stanza = (a: string, b: string, c: string, d: string) => [a, b, c, d].join('\n')
const rhymed = stanza('Iba Rosa muy campante', 'con su pan y su café;', 'vino la Flaca elegante:', 'con ella Rosa se fue.')

const es: VerseContext = { lang: 'es', pronouns: 'she', source: 'Rosa Pérez\npanadera\nama el café' }
const esThey: VerseContext = { lang: 'es', pronouns: 'they', source: 'Ale Torres\nmaestra de música\ncanta todo el día' }
const en: VerseContext = { lang: 'en', pronouns: 'she', source: 'Priya Patel\nengineer\nloves TikTok' }

describe('finalProblem', () => {
  it('accepts a clean, rhymed verse', () => {
    assert.equal(finalProblem(rhymed, es), null)
  })

  it('flags an empty verse, even one that is only a preamble', () => {
    assert.equal(finalProblem('', es), 'empty')
    assert.equal(finalProblem('  \n\n', en), 'empty')
    assert.equal(finalProblem('Aquí tienes tu calaverita:\n', es), 'empty')
  })

  it('flags two words run together', () => {
    const glued = rhymed.replace('muy campante', 'muyCampante')
    assert.equal(finalProblem(glued, es), 'glued')
    assert.equal(finalProblem('Ya noCuenta chistes flojos', en), 'glued')
  })

  it('allows brands, Mc/Mac names, iPhone and the visitor’s own spellings', () => {
    for (const line of ['She posted it on YouTube', 'He ate at McDonald’s', 'MacArthur danced', 'Her iPhone rang', 'She lived on TikTok']) {
      assert.equal(finalProblem(line, en), null, line)
    }
    assert.equal(finalProblem('La GranFlaca bailaba', { ...en, source: 'GranFlaca' }), null)
  })

  it('flags gendered object pronouns for "they" in Spanish', () => {
    for (const line of [
      'y la Flaca la llevó',
      'pero la Huesuda se lo llevó',
      'la Catrina lo halló dormido',
      'vino a llevarla al panteón',
      'y buscándolo en la plaza',
      'la Muerte la vio cantar',
    ]) {
      const verse = rhymed.replace('vino la Flaca elegante:', line)
      assert.equal(finalProblem(verse, esThey), 'pronouns', line)
    }
  })

  it('lets neutral wording and lookalike words through for "they"', () => {
    for (const line of ['y se llevó a Ale cantando', 'la Flaca llegó a la plaza', 'cantaba en la espera', 'Carla y Perla bailaban', 'lo que dijo la Catrina']) {
      const verse = rhymed.replace('vino la Flaca elegante:', line)
      assert.equal(finalProblem(verse, esThey), null, line)
    }
  })

  it('only applies the pronoun check to "they"', () => {
    const verse = rhymed.replace('vino la Flaca elegante:', 'y la Flaca la llevó')
    assert.equal(finalProblem(verse, es), null)
  })

  it('flags a Spanish verse that loses the rhyme, but not an English one', () => {
    const broken = stanza('Llegó la Flaca a la casa', 'con su lista en la mano;', 'Ana no supo qué pasa', 'y se fue con su hermana.')
    assert.equal(finalProblem(broken, es), 'rhyme')
    assert.equal(finalProblem(broken, en), null)
  })
})
