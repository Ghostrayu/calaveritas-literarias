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
    ]) {
      assert.equal(isRestart(line), false, line)
    }
  })
})
