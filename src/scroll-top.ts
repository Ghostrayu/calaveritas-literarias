const SHOW_AFTER = 0.75

export function initScrollTop(): void {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'scroll-top'
  button.dataset.i18nAttr = 'aria-label:scrollTop.label;title:scrollTop.label'
  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>`
  document.body.append(button)

  const update = () => {
    button.classList.toggle('is-visible', window.scrollY > window.innerHeight * SHOW_AFTER)
  }
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update, { passive: true })
  update()

  button.addEventListener('click', () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
    document.querySelector<HTMLElement>('h1[tabindex="-1"]')?.focus({ preventScroll: true })
  })
}
