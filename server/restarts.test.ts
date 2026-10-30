import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isRestart } from './restarts.ts'

describe('isRestart', () => {
  it('catches the restarts Sonnet wrote in testing', () => {
    for (const line of [
      'Perdón, empiezo de nuevo.',
      'Disculpa, mejor lo hago bien.',
      'Perdón por el desorden. Esta es la versión final:',
      'Lo siento, ese verso no me convence. Va de nuevo, ahora sí con calma:',
      'Me sigue sin cuadrar. Intento una última vez:',
      'Perdón, no logré dar con la versión redonda. Aquí tienes la mejor que pude:',
      'Perdón, no me corrijo: la versión es esta.',
      'Mejor reescribo con cuidado, sin errores de rima:',
      'Ahora lo hago bien:',
      'Sorry, let me try that again.',
      'Scratch that — here is a revised version:',
      'Some lines need reshaping to hold the rhyme.',
      'SOME LINES NEED RESHAPING TO HOLD THE RHYME',
      '(Some lines need reshaping to hold the rhyme)',
      'Note: I adjusted the meter in the second stanza.',
      'Algunos versos necesitan reajuste para sostener la rima.',
      'La rima del tercer verso necesita ajuste.',
      '---',
      '***',
      '—',
    ]) {
      assert.equal(isRestart(line), true, line)
    }
  })

  it('lets ordinary verse lines through', () => {
    for (const line of [
      '«¡Perdón, Flaca, otro añito!»',
      'y Beto volvió de nuevo',
      'llegó tarde hasta a su entierro',
      'la Flaca le dijo: «Ya es hora, mi viejo».',
      'Sam begged for just one more day,',
      '"I\'m sorry," they said, "but my ferns need me!"',
      'she kept the rhythm all night long,',
      'and wrote her lines in the graveyard book',
      'el poeta buscaba una rima',
      'leyendo versos en el panteón',
      '— ¡Ya me voy! —dijo Beto',
      '',
    ]) {
      assert.equal(isRestart(line), false, line)
    }
  })
})
