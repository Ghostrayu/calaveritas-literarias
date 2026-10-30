import { startHaunting } from './haunting'

const NS = 'http://www.w3.org/2000/svg'
const FLAG_COLORS = ['#e4007c', '#f59e0b', '#00a6a6', '#9bcb3b', '#8e3fd1', '#ff5a36']

function el(tag: string, attrs: Record<string, string | number>): SVGElement {
  const node = document.createElementNS(NS, tag)
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value))
  return node
}

type FlagDesign = 'festive' | 'crossbones'

function cutSkull(mask: SVGElement, cx: number, cy: number): void {
  mask.append(
    el('path', {
      d: `M${cx - 18} ${cy}a18 18 0 1 1 36 0c0 7-3 11-6 13v6q0 3-3 3h-18q-3 0-3-3v-6c-3-2-6-6-6-13z`,
      fill: '#000',
    }),
    el('circle', { cx: cx - 7, cy: cy + 1, r: 5, fill: '#fff' }),
    el('circle', { cx: cx + 7, cy: cy + 1, r: 5, fill: '#fff' }),
    el('path', { d: `M${cx} ${cy + 12}l-2.5-4h5z`, fill: '#fff' }),
    el('path', { d: `M${cx - 9} ${cy + 18}h18`, stroke: '#fff', 'stroke-width': 1.5 }),
  )
}

function cutCrossbones(mask: SVGElement, cx: number, cy: number): void {
  for (const [x1, y1, x2, y2] of [
    [cx - 24, cy - 12, cx + 24, cy + 12],
    [cx + 24, cy - 12, cx - 24, cy + 12],
  ]) {
    mask.append(el('path', { d: `M${x1} ${y1}L${x2} ${y2}`, stroke: '#000', 'stroke-width': 6, 'stroke-linecap': 'round' }))
    const len = Math.hypot(x2 - x1, y2 - y1)
    const nx = (-(y2 - y1) / len) * 3.5
    const ny = ((x2 - x1) / len) * 3.5
    for (const [ex, ey] of [[x1, y1], [x2, y2]]) {
      mask.append(el('circle', { cx: ex + nx, cy: ey + ny, r: 4, fill: '#000' }))
      mask.append(el('circle', { cx: ex - nx, cy: ey - ny, r: 4, fill: '#000' }))
    }
  }
}

function buildMask(w: number, h: number, id: string, design: FlagDesign): SVGElement {
  const cut = '#000'
  const mask = el('mask', { id, maskContentUnits: 'userSpaceOnUse' })
  mask.append(el('rect', { width: w, height: h, fill: '#fff' }))

  let fringe = `M0 ${h}`
  for (let x = 0; x < w; x += 6) fringe += ` L${x + 3} ${h - 9} L${x + 6} ${h}`
  mask.append(el('path', { d: `${fringe}Z`, fill: cut }))

  for (let x = 10; x < w - 4; x += 12) mask.append(el('path', { d: `M${x} 10l4 4-4 4-4-4z`, fill: cut }))

  const cx = w / 2
  const cy = h * 0.52

  if (design === 'crossbones') {
    cutCrossbones(mask, cx, cy + 18)
    cutSkull(mask, cx, cy - 8)
    return mask
  }

  cutSkull(mask, cx, cy)
  for (const [dx, dy] of [[-30, -14], [30, -14], [-32, 14], [32, 14], [0, -30]]) {
    mask.append(el('circle', { cx: cx + dx, cy: cy + dy, r: 3.5, fill: cut }))
  }
  for (const [x, y] of [[14, 36], [w - 14, 36]]) {
    mask.append(el('path', { d: `M${x - 4} ${y}h8M${x} ${y - 4}v8`, stroke: cut, 'stroke-width': 2.4 }))
  }
  return mask
}

function drawPicado(svg: SVGSVGElement): void {
  svg.replaceChildren()
  const width = window.innerWidth
  const small = width < 600 || window.innerHeight < 500
  const fw = small ? 72 : 96
  const fh = small ? 92 : 118
  const gap = 8
  const count = Math.ceil(width / (fw + gap)) + 1
  const height = fh + 30
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.setAttribute('height', String(height))
  document.documentElement.style.setProperty('--picado-h', `${height}px`)

  const defs = el('defs', {})
  defs.append(buildMask(fw, fh, 'cut', 'festive'), buildMask(fw, fh, 'cut-haunted', 'crossbones'))
  svg.append(defs)

  svg.append(
    el('path', { d: `M-10 14 Q${width / 2} 30 ${width + 10} 14`, stroke: '#f3e6d0', 'stroke-width': 1.5, fill: 'none', opacity: 0.7 }),
  )

  for (let i = 0; i < count; i++) {
    const x = i * (fw + gap) - fw / 3
    const t = (x + fw / 2) / width
    const y = 14 + 16 * 4 * t * (1 - t) * 0.5
    const flag = el('g', { class: 'flag' })
    flag.style.animationDelay = `${-i * 0.37}s`
    flag.style.animationDuration = `${4 + (i % 3) * 0.6}s`
    const inner = el('g', { transform: `translate(${x} ${y})` })
    inner.append(el('rect', { width: fw, height: fh, fill: FLAG_COLORS[i % FLAG_COLORS.length], mask: 'url(#cut)', opacity: 0.95 }))
    flag.append(inner)
    svg.append(flag)
  }
}

function drawCandles(container: HTMLElement): void {
  container.replaceChildren()
  const width = window.innerWidth
  const spacing = width < 600 ? 30 : 44
  const count = Math.max(7, Math.round(width / spacing))
  for (let i = 0; i < count; i++) {
    const mid = Math.abs(i - (count - 1) / 2) / ((count - 1) / 2)
    const candle = document.createElement('div')
    candle.className = 'vela'
    candle.style.setProperty('--h', `${(7 + (1 - mid) * 11 + Math.random() * 3).toFixed(1)}vh`)
    candle.style.setProperty('--w', `${(11 + Math.random() * 12).toFixed(0)}px`)
    candle.style.setProperty('--f', `${(0.12 + Math.random() * 0.25).toFixed(2)}s`)
    candle.innerHTML = '<div class="halo"></div><div class="llama"></div>'
    container.append(candle)
  }
}

function addPetals(container: HTMLElement): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const count = window.innerWidth < 600 ? 18 : 34
  for (let i = 0; i < count; i++) {
    const petal = document.createElement('span')
    const scale = 0.6 + Math.random() * 0.9
    petal.className = 'petal'
    petal.style.left = `${Math.random() * 100}vw`
    petal.style.width = `${14 * scale}px`
    petal.style.height = `${10 * scale}px`
    petal.style.setProperty('--dur', `${9 + Math.random() * 10}s`)
    petal.style.setProperty('--delay', `${-Math.random() * 18}s`)
    petal.style.setProperty('--drift', `${Math.random() * 160 - 80}px`)
    petal.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`)
    container.append(petal)
  }
}

const CANDLE_OUT_MS = 2000
const CANDLE_WAVE_STEP_MS = 100
const FLAME_FADE_MS = 150

const FLAME_STAGES = ['is-red', 'is-blue'] as const

function blowOutCandles(container: HTMLElement): void {
  const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>()
  let stage = -1

  const setStage = (el: Element, flame: string) => {
    el.classList.remove(...FLAME_STAGES)
    el.classList.add(flame)
  }

  const blowOut = (candle: Element, flame: string) => {
    clearTimeout(timers.get(candle))
    candle.classList.add('is-out')
    setTimeout(() => setStage(candle, flame), FLAME_FADE_MS)
    timers.set(candle, setTimeout(() => candle.classList.remove('is-out'), CANDLE_OUT_MS))
  }

  container.addEventListener('click', (event) => {
    const clicked = (event.target as Element).closest('.vela')
    if (!clicked) return
    const candles = [...container.children]
    const start = candles.indexOf(clicked)
    stage = Math.min(stage + 1, FLAME_STAGES.length - 1)
    const flame = FLAME_STAGES[stage]

    blowOut(clicked, flame)
    const reach = Math.max(start, candles.length - 1 - start)
    for (let step = 1; step <= reach; step++) {
      const neighbours = [candles[start - step], candles[start + step]].filter(Boolean)
      setTimeout(() => neighbours.forEach((candle) => blowOut(candle, flame)), step * CANDLE_WAVE_STEP_MS)
    }
    setTimeout(() => {
      setStage(container, flame)
      if (flame === 'is-blue') startHaunting()
    }, reach * CANDLE_WAVE_STEP_MS + FLAME_FADE_MS)
  })
}

function dropFlags(svg: SVGSVGElement): void {
  svg.addEventListener('click', (event) => {
    const flag = (event.target as Element).closest<SVGElement>('.flag')
    if (!flag || flag.classList.contains('is-falling')) return
    flag.style.removeProperty('animation-delay')
    flag.style.removeProperty('animation-duration')
    flag.style.setProperty('--fall-x', `${Math.random() * 120 - 60}px`)
    flag.style.setProperty('--fall-spin', `${Math.random() * 240 - 120}deg`)
    flag.classList.add('is-falling')
  })
}

export function initTheme(): void {
  const wallpaper = document.querySelector<HTMLElement>('.wallpaper')
  const picado = document.querySelector<SVGSVGElement>('#picado')
  const velas = document.querySelector<HTMLElement>('#velas')
  if (!wallpaper || !picado || !velas) return

  drawPicado(picado)
  drawCandles(velas)
  addPetals(wallpaper)
  blowOutCandles(velas)
  dropFlags(picado)

  let last = { width: window.innerWidth, short: window.innerHeight < 500 }
  let timer: ReturnType<typeof setTimeout>
  window.addEventListener('resize', () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      const now = { width: window.innerWidth, short: window.innerHeight < 500 }
      if (now.width === last.width && now.short === last.short) return
      last = now
      drawPicado(picado)
      drawCandles(velas)
    }, 150)
  })
}
