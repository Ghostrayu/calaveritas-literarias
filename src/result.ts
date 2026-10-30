import { GenerateError, generate, type GenerateErrorCode, type Quota } from './api'
import { downloadCardImage } from './card-image'
import { applyTranslations, getLang, t, type Lang, type Vars } from './i18n'
import type { CalaveritaInput } from './input'
import { canShareNatively, copyText, shareLinks, shareNatively } from './share'

const ERROR_KEYS: Record<GenerateErrorCode, string> = {
  blocked: 'generate.error.blocked',
  busy: 'generate.error.busy',
  invalid: 'generate.error.invalid',
  rateLimited: 'generate.error.rateLimited',
  refused: 'generate.error.refused',
  timeout: 'generate.error.timeout',
  unavailable: 'generate.error.unavailable',
}

const COPIED_MS = 2000

const QUOTA_WARNING_AT = 3

function setKey(el: HTMLElement, key: string | null, vars?: Vars): void {
  if (vars) el.dataset.i18nVars = JSON.stringify(vars)
  else delete el.dataset.i18nVars
  if (key) {
    el.dataset.i18n = key
    el.textContent = t(key, getLang(), vars)
  } else {
    delete el.dataset.i18n
    el.textContent = ''
  }
}

const minutes = (seconds: number) => Math.max(1, Math.ceil(seconds / 60))

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function quotaMessage({ remaining, resetSec }: Quota): [string, Vars] | null {
  if (remaining > QUOTA_WARNING_AT) return null
  if (remaining === 0) return ['quota.none', { minutes: minutes(resetSec) }]
  return [remaining === 1 ? 'quota.one' : 'quota.few', { count: remaining }]
}

export interface ResultView {
  run(input: CalaveritaInput, lang: Lang): Promise<void>
}

export function createResult(container: HTMLElement): ResultView {
  const section = document.createElement('section')
  section.className = 'result'
  section.tabIndex = -1
  section.hidden = true
  section.innerHTML = `
    <div class="result__error" hidden>
      <p class="result__error-text" role="alert"></p>
      <button type="button" class="result__retry" data-i18n="generate.retry"></button>
    </div>
    <article class="card" hidden>
      <p class="card__for"><span data-i18n="card.for"></span> <span class="card__name"></span></p>
      <p class="verse" aria-live="polite"></p>
    </article>
    <div class="actions" hidden>
      <button type="button" class="action action--primary" data-action="regenerate" data-i18n="card.regenerate"></button>
      <button type="button" class="action" data-action="copy" data-i18n="card.copy"></button>
      <button type="button" class="action" data-action="share" data-i18n="card.share"></button>
      <button type="button" class="action" data-action="download" data-i18n="card.download"></button>
      <div class="share-links" id="share-links" role="group" data-i18n-attr="aria-label:card.shareVia" hidden>
        <a class="share-link" data-network="whatsapp" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a class="share-link" data-network="x" target="_blank" rel="noopener noreferrer">X</a>
        <a class="share-link" data-network="facebook" target="_blank" rel="noopener noreferrer">Facebook</a>
      </div>
      <p class="actions__note" role="status"></p>
    </div>
    <p class="result__quota" role="status"></p>`
  applyTranslations(section)
  container.append(section)

  const loading = document.createElement('dialog')
  loading.className = 'loading'
  loading.setAttribute('aria-labelledby', 'loading-text')
  loading.innerHTML = `
    <div class="loading__candle" aria-hidden="true">
      <div class="vela"><div class="halo"></div><div class="llama"></div></div>
    </div>
    <p class="loading__text" id="loading-text" role="status" data-i18n="generate.writing"></p>
    <button type="button" class="action" data-i18n="generate.cancel"></button>`
  applyTranslations(loading)
  document.body.append(loading)
  const cancel = () => current?.abort()
  loading.querySelector('button')!.addEventListener('click', cancel)
  loading.addEventListener('cancel', (event) => {
    event.preventDefault()
    cancel()
  })

  const errorBox = section.querySelector<HTMLElement>('.result__error')!
  const errorText = section.querySelector<HTMLElement>('.result__error-text')!
  const retryButton = section.querySelector<HTMLButtonElement>('.result__retry')!
  const quotaNote = section.querySelector<HTMLElement>('.result__quota')!
  const card = section.querySelector<HTMLElement>('.card')!
  const cardName = section.querySelector<HTMLElement>('.card__name')!
  const verse = section.querySelector<HTMLElement>('.verse')!
  const actions = section.querySelector<HTMLElement>('.actions')!
  const copyButton = section.querySelector<HTMLButtonElement>('[data-action="copy"]')!
  const shareButton = section.querySelector<HTMLButtonElement>('[data-action="share"]')!
  const downloadButton = section.querySelector<HTMLButtonElement>('[data-action="download"]')!
  const links = section.querySelector<HTMLElement>('.share-links')!
  const note = section.querySelector<HTMLElement>('.actions__note')!

  if (!canShareNatively()) {
    shareButton.setAttribute('aria-expanded', 'false')
    shareButton.setAttribute('aria-controls', links.id)
  }

  let current: AbortController | null = null
  let lastInput: CalaveritaInput | null = null
  let copiedTimer: ReturnType<typeof setTimeout> | undefined
  let countdown: ReturnType<typeof setInterval> | undefined

  const startCountdown = (seconds: number) => {
    const until = Date.now() + seconds * 1000
    const tick = () => {
      const left = Math.ceil((until - Date.now()) / 1000)
      if (left > 0) {
        retryButton.disabled = true
        setKey(retryButton, 'generate.retryIn', { time: clock(left) })
      } else {
        clearInterval(countdown)
        retryButton.disabled = false
        setKey(retryButton, 'generate.retry')
      }
    }
    tick()
    countdown = setInterval(tick, 1000)
  }

  const stopCountdown = () => {
    clearInterval(countdown)
    retryButton.disabled = false
    setKey(retryButton, 'generate.retry')
  }

  const setVerse = (text: string) => {
    verse.textContent = text
    card.hidden = text === ''
  }

  const resetActions = () => {
    actions.hidden = true
    links.hidden = true
    if (shareButton.hasAttribute('aria-expanded')) shareButton.setAttribute('aria-expanded', 'false')
    clearTimeout(copiedTimer)
    setKey(copyButton, 'card.copy')
    setKey(note, null)
  }

  async function run(input: CalaveritaInput, lang: Lang): Promise<void> {
    current?.abort()
    const controller = new AbortController()
    current = controller
    lastInput = input

    section.hidden = false
    errorBox.hidden = true
    setKey(errorText, null)
    stopCountdown()
    setKey(quotaNote, null)
    let quota = null as Quota | null
    resetActions()
    cardName.textContent = input.name
    setVerse('')
    if (!loading.open) loading.showModal()

    try {
      setVerse(await generate(input, lang, { signal: controller.signal, onQuota: (q) => (quota = q) }))
      actions.hidden = false
      const message = quota && quotaMessage(quota)
      if (message) setKey(quotaNote, message[0], message[1])
    } catch (err) {
      if (controller.signal.aborted) {
        if (current === controller) section.hidden = true
        return
      }
      setVerse('')
      const code = err instanceof GenerateError ? err.code : 'unavailable'
      if (err instanceof GenerateError && code === 'rateLimited') {
        setKey(errorText, ERROR_KEYS[code], { minutes: minutes(err.retryAfter) })
        startCountdown(err.retryAfter)
      } else {
        setKey(errorText, ERROR_KEYS[code])
      }
      retryButton.hidden = code === 'blocked'
      errorBox.hidden = false
    } finally {
      if (current === controller) {
        loading.close()
        if (!section.hidden) {
          const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
        }
      }
    }
  }

  const runAgain = () => {
    if (!lastInput) return
    section.focus()
    void run(lastInput, getLang())
  }
  retryButton.addEventListener('click', runAgain)
  section.querySelector('[data-action="regenerate"]')!.addEventListener('click', runAgain)

  copyButton.addEventListener('click', async () => {
    clearTimeout(copiedTimer)
    if (await copyText(verse.textContent ?? '')) {
      setKey(copyButton, 'card.copied')
      setKey(note, 'card.copied')
      copiedTimer = setTimeout(() => {
        setKey(copyButton, 'card.copy')
        setKey(note, null)
      }, COPIED_MS)
    } else {
      setKey(note, 'card.copyFailed')
    }
  })

  shareButton.addEventListener('click', async () => {
    const text = verse.textContent ?? ''
    if (canShareNatively()) {
      const outcome = await shareNatively(t('card.shareTitle'), text)
      if (outcome !== 'failed') return
    }
    const hrefs = shareLinks(text)
    links.querySelectorAll<HTMLAnchorElement>('[data-network]').forEach((link) => {
      link.href = hrefs[link.dataset.network as keyof typeof hrefs]
    })
    links.hidden = !links.hidden
    shareButton.setAttribute('aria-expanded', String(!links.hidden))
    shareButton.setAttribute('aria-controls', links.id)
  })

  downloadButton.addEventListener('click', async () => {
    const text = verse.textContent ?? ''
    if (!lastInput || !text) return
    downloadButton.disabled = true
    setKey(note, null)
    try {
      const saved = await downloadCardImage({
        forLabel: t('card.for'),
        name: lastInput.name,
        verse: text,
        footer: location.host,
      })
      if (!saved) setKey(note, 'card.downloadFailed')
    } catch {
      setKey(note, 'card.downloadFailed')
    } finally {
      downloadButton.disabled = false
    }
  })

  return { run }
}
