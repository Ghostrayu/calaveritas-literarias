const PUPIL_TRAVEL = 3
const MAX_TILT = 8
const BLINK_MS = 160
const FIRST_WALK_MS = 4000
const WALK_GAP_MS = [25_000, 45_000] as const
const GUST_GAP_MS = [12_000, 24_000] as const
const GUST_STEP_MS = 70
const FLAG_SWAP_STEP_MS = 90
const FLAG_FALL_MS = 1600

let started = false

const between = ([min, max]: readonly [number, number]) => min + Math.random() * (max - min)

function watchPointer(skull: SVGSVGElement): void {
  let frame = 0
  let pointer = { x: 0, y: 0 }

  const aim = () => {
    frame = 0
    const box = skull.getBoundingClientRect()
    const dx = pointer.x - (box.left + box.width / 2)
    const dy = pointer.y - (box.top + box.height / 2)
    const distance = Math.hypot(dx, dy) || 1
    skull.style.setProperty('--mira-x', String(((dx / distance) * PUPIL_TRAVEL).toFixed(2)))
    skull.style.setProperty('--mira-y', String(((dy / distance) * PUPIL_TRAVEL).toFixed(2)))
    skull.style.setProperty('--giro', `${Math.max(-MAX_TILT, Math.min(MAX_TILT, dx / 60)).toFixed(1)}deg`)
  }

  window.addEventListener('pointermove', (event) => {
    pointer = { x: event.clientX, y: event.clientY }
    if (!frame) frame = requestAnimationFrame(aim)
  })

  const blink = () => {
    skull.classList.add('is-blinking')
    setTimeout(() => skull.classList.remove('is-blinking'), BLINK_MS)
    setTimeout(blink, 3000 + Math.random() * 6000)
  }
  setTimeout(blink, 2000)
}

function swapFlags(banner: SVGSVGElement, animate: boolean): void {
  if (!animate) {
    banner.classList.add('is-crossbones')
    return
  }
  const flags = [...banner.querySelectorAll<SVGElement>('.flag')]
  flags.forEach((flag, i) => {
    if (flag.classList.contains('is-falling')) return
    flag.dataset.sway = flag.style.animationDelay + '|' + flag.style.animationDuration
    flag.style.removeProperty('animation-delay')
    flag.style.removeProperty('animation-duration')
    flag.style.setProperty('--fall-x', `${Math.random() * 120 - 60}px`)
    flag.style.setProperty('--fall-spin', `${Math.random() * 240 - 120}deg`)
    setTimeout(() => flag.classList.add('is-falling'), i * FLAG_SWAP_STEP_MS)
  })

  setTimeout(() => {
    banner.classList.add('is-crossbones')
    flags.forEach((flag, i) => {
      flag.classList.remove('is-falling')
      flag.style.setProperty('--appear-delay', `${i * FLAG_SWAP_STEP_MS}ms`)
      flag.classList.add('is-appearing')
      flag.addEventListener(
        'animationend',
        () => {
          flag.classList.remove('is-appearing')
          const [delay, duration] = (flag.dataset.sway ?? '|').split('|')
          if (delay) flag.style.animationDelay = delay
          if (duration) flag.style.animationDuration = duration
        },
        { once: true },
      )
    })
  }, flags.length * FLAG_SWAP_STEP_MS + FLAG_FALL_MS)
}

function gust(): void {
  document.querySelectorAll<SVGElement>('#picado .flag:not(.is-falling):not(.is-appearing)').forEach((flag, i) => {
    flag.style.setProperty('--gust-delay', `${i * GUST_STEP_MS}ms`)
    flag.classList.add('is-gust')
    flag.addEventListener('animationend', () => flag.classList.remove('is-gust'), { once: true })
  })
}

const PHONE = window.matchMedia('(max-width: 599px)')

function walk(shadow: HTMLElement): void {
  if (!PHONE.matches) {
    shadow.classList.add('is-walking')
    shadow.addEventListener('animationend', () => shadow.classList.remove('is-walking'), { once: true })
    setTimeout(gust, 6000)
  }
  setTimeout(() => walk(shadow), between(WALK_GAP_MS))
}

function gusts(): void {
  setTimeout(() => {
    gust()
    gusts()
  }, between(GUST_GAP_MS))
}

export function startHaunting(): void {
  if (started) return
  started = true
  document.documentElement.classList.add('is-haunted')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#07060a')

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const banner = document.querySelector<SVGSVGElement>('#picado')
  if (banner) swapFlags(banner, !reduceMotion)

  if (reduceMotion) return
  const skull = document.querySelector<SVGSVGElement>('.vigia')
  const shadow = document.querySelector<HTMLElement>('.sombra')
  if (skull) watchPointer(skull)
  if (shadow) setTimeout(() => walk(shadow), FIRST_WALK_MS)
  gusts()
}
