import '@fontsource/sancreek/400.css'
import '@fontsource/bitter/400-italic.css'
import '@fontsource/alegreya/400.css'
import '@fontsource/alegreya/400-italic.css'
import '@fontsource/alegreya-sans/400.css'
import '@fontsource/alegreya-sans/700.css'
import './styles/main.css'
import { renderForm } from './form'
import { LANGS, applyTranslations, getLang, getSavedLang, setLang, t, type Lang } from './i18n'
import { createResult } from './result'
import { initScrollTop } from './scroll-top'
import { initTheme } from './theme'

history.scrollRestoration = 'manual'
window.scrollTo(0, 0)
window.addEventListener('pageshow', (event) => {
  if (event.persisted) window.scrollTo(0, 0)
})

initTheme()
initScrollTop()

const app = document.querySelector<HTMLDivElement>('#app')!

function languageButton(lang: Lang, className: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = className
  button.lang = lang
  button.dataset.lang = lang
  button.textContent = t('language.name', lang)
  button.addEventListener('click', onClick)
  return button
}

function renderGate(): void {
  app.innerHTML = `
    <main class="gate">
      <h1 class="gate__title"></h1>
      <div class="gate__options"></div>
    </main>`

  const title = app.querySelector('.gate__title')!
  const options = app.querySelector('.gate__options')!

  LANGS.forEach((lang, i) => {
    if (i > 0) title.append(' / ')
    const prompt = document.createElement('span')
    prompt.lang = lang
    prompt.textContent = t('language.gatePrompt', lang)
    title.append(prompt)

    options.append(
      languageButton(lang, 'gate__option', () => {
        setLang(lang)
        renderApp({ focusHeading: true })
      }),
    )
  })
}

function updateToggle(): void {
  app.querySelectorAll<HTMLButtonElement>('.lang-toggle button').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.lang === getLang()))
  })
}

function renderApp({ focusHeading = false } = {}): void {
  app.innerHTML = `
    <header class="site-header">
      <div class="lang-toggle" role="group" data-i18n-attr="aria-label:language.toggleLabel"></div>
    </header>
    <main class="site-main">
      <h1 class="wordmark" tabindex="-1" data-i18n="app.title"></h1>
      <p class="tagline" data-i18n="app.tagline"></p>
      <p class="theme-hint" data-i18n="app.candleHint"></p>
    </main>`

  const main = app.querySelector('main')!
  renderForm(main, (input) => void result.run(input, getLang()))
  const result = createResult(main)

  const toggle = app.querySelector('.lang-toggle')!
  for (const lang of LANGS) {
    toggle.append(
      languageButton(lang, 'lang-toggle__option', () => {
        setLang(lang)
        updateToggle()
      }),
    )
  }

  applyTranslations(app)
  updateToggle()
  if (focusHeading) app.querySelector<HTMLElement>('h1')!.focus()
}

const saved = getSavedLang()
if (saved) {
  setLang(saved)
  renderApp()
} else {
  applyTranslations()
  renderGate()
}
