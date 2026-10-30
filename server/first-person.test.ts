import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { toFirstPerson } from './first-person.ts'

describe('toFirstPerson', () => {
  const cases: ['en' | 'es', string, string | null][] = [
    ['en', 'has a baby', 'I have a baby'],
    ['en', 'loves her cat', 'I love my cat'],
    ['en', 'always late', "I'm always late"],
    ['en', 'is always late', "I'm always late"],
    ['en', 'always forgets his keys', 'I always forget my keys'],
    ['en', 'watches telenovelas', 'I watch telenovelas'],
    ['en', 'cries at movies', 'I cry at movies'],
    ['en', 'plays guitar', 'I play guitar'],
    ['en', 'loud laugh', null],
    ['en', '', null],
    ['es', 'tiene un bebé', 'tengo un bebé'],
    ['es', 'siempre llega tarde', 'siempre llego tarde'],
    ['es', 'le gusta el café', 'me gusta el café'],
    ['es', 'se duerme en el cine', 'me duermo en el cine'],
    ['es', 'es muy puntual', 'soy muy puntual'],
    ['es', 'nunca pierde sus llaves', 'nunca pierdo mis llaves'],
    ['es', 'risa escandalosa', null],
  ]
  for (const [lang, trait, expected] of cases) {
    it(`${lang}: "${trait}" → ${expected === null ? 'left out' : `"${expected}"`}`, () => {
      assert.equal(toFirstPerson(trait, lang), expected)
    })
  }
})
