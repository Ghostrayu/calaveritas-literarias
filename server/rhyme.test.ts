import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { rhymeTail, spanishVerseRhymes } from './rhyme.ts'

describe('rhymeTail', () => {
  it('matches true consonant rhymes', () => {
    for (const [a, b] of [
      ['campante', 'elegante'],
      ['café', 'fue'],
      ['panteón', 'montón'],
      ['corazón', 'razón'],
      ['historia', 'gloria'],
      ['cielo', 'suelo'],
      ['guerra', 'tierra'],
      ['querer', 'ser'],
      ['hoy', 'voy'],
      ['caza', 'casa'],
      ['vez', 'es'],
      ['país', 'maíz'],
      ['Catrina', 'cocina'],
    ]) {
      assert.equal(rhymeTail(a), rhymeTail(b), `${a}/${b}`)
    }
  })

  it('rejects half rhymes', () => {
    for (const [a, b] of [
      ['mano', 'hermana'],
      ['funeral', 'jamás'],
      ['cama', 'calma'],
      ['tumba', 'Catrina'],
    ]) {
      assert.notEqual(rhymeTail(a), rhymeTail(b), `${a}/${b}`)
    }
  })
})

describe('spanishVerseRhymes', () => {
  const rhymed = 'Iba Rosa muy campante\ncon su pan y su café;\nvino la Flaca elegante:\ncon ella Rosa se fue.'

  it('accepts stanzas whose second and fourth lines rhyme', () => {
    assert.equal(spanishVerseRhymes(`${rhymed}\n\n${rhymed}`), true)
  })

  it('rejects a stanza that loses the rhyme', () => {
    const broken = 'Llegó la Flaca a la casa\ncon su lista en la mano;\nAna no supo qué pasa\ny se fue con su hermana.'
    assert.equal(spanishVerseRhymes(`${rhymed}\n\n${broken}`), false)
  })

  it('ignores lines outside four-line stanzas', () => {
    assert.equal(spanishVerseRhymes(`Calaverita para Rosa\n\n${rhymed}`), true)
  })
})
