const WIDTH = 1080
const HEIGHT = 1350

const COLORS = {
  noche: '#23103a',
  noche2: '#3a1452',
  cempasuchil: '#f59e0b',
  rosa: '#e4007c',
  turquesa: '#00a6a6',
  hueso: '#f3e6d0',
  vela: '#ffcf6e',
  flags: ['#e4007c', '#f59e0b', '#00a6a6', '#9bcb3b', '#8e3fd1', '#ff5a36'],
}

const FONTS = {
  display: '"Sancreek", Georgia, serif',
  verse: '"Alegreya", Georgia, serif',
  ui: '"Alegreya Sans", system-ui, sans-serif',
}

const CARD = { x: 90, y: 200, w: 900, h: 1020, radius: 24 }
const PAD_X = 70
const VERSE_TOP_GAP = 34
const VERSE_BOTTOM = CARD.y + CARD.h - 56
const MAX_TOP_SLACK = 40

const VERSE_MAX_PX = 46
const VERSE_MIN_PX = 22
const LINE_HEIGHT = 1.42
const STANZA_GAP = 0.55

export interface CardImageText {
  forLabel: string
  name: string
  verse: string
  footer: string
}

async function loadFonts(text: string): Promise<void> {
  await Promise.all([
    document.fonts.load(`400 64px ${FONTS.display}`, text),
    document.fonts.load(`400 40px ${FONTS.verse}`, text),
    document.fonts.load(`700 30px ${FONTS.ui}`, text),
  ])
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const night = ctx.createRadialGradient(WIDTH / 2, HEIGHT * 0.4, 0, WIDTH / 2, HEIGHT * 0.4, HEIGHT * 0.75)
  night.addColorStop(0, COLORS.noche2)
  night.addColorStop(1, COLORS.noche)
  ctx.fillStyle = night
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT * 1.1, 0, WIDTH / 2, HEIGHT * 1.1, HEIGHT * 0.5)
  glow.addColorStop(0, 'rgba(255, 160, 40, 0.45)')
  glow.addColorStop(1, 'rgba(255, 160, 40, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.save()
  ctx.globalAlpha = 0.28
  for (const [x, y, r] of [[40, 300, 54], [1040, 520, 46], [30, 1010, 50], [1050, 1150, 58]]) {
    drawMarigold(ctx, x, y, r)
  }
  ctx.restore()
}

function drawMarigold(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.lineCap = 'butt'
  for (const [radius, width, color, dash] of [
    [r, r * 0.33, COLORS.cempasuchil, [5, 4]],
    [r * 0.66, r * 0.29, '#ffb534', [4.5, 3]],
  ] as const) {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.lineWidth = width
    ctx.strokeStyle = color
    ctx.setLineDash([...dash])
    ctx.stroke()
  }
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.arc(x, y, r * 0.37, 0, Math.PI * 2)
  ctx.fillStyle = '#ffcf6e'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, y, r * 0.17, 0, Math.PI * 2)
  ctx.fillStyle = '#d9570b'
  ctx.fill()
}

function flagImage(color: string, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)

  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let x = 0; x < w; x += 8) {
    ctx.lineTo(x + 4, h - 12)
    ctx.lineTo(x + 8, h)
  }
  ctx.fill()
  for (let x = 14; x < w - 6; x += 16) {
    ctx.beginPath()
    ctx.moveTo(x, 12)
    ctx.lineTo(x + 5, 17)
    ctx.lineTo(x, 22)
    ctx.lineTo(x - 5, 17)
    ctx.fill()
  }
  const cx = w / 2
  const cy = h * 0.52
  const s = w / 96
  ctx.beginPath()
  ctx.arc(cx, cy, 22 * s, Math.PI, 0)
  ctx.lineTo(cx + 22 * s, cy + 6 * s)
  ctx.quadraticCurveTo(cx + 21 * s, cy + 14 * s, cx + 14 * s, cy + 17 * s)
  ctx.lineTo(cx + 14 * s, cy + 26 * s)
  ctx.lineTo(cx - 14 * s, cy + 26 * s)
  ctx.lineTo(cx - 14 * s, cy + 17 * s)
  ctx.quadraticCurveTo(cx - 21 * s, cy + 14 * s, cx - 22 * s, cy + 6 * s)
  ctx.closePath()
  ctx.fill()
  for (const [dx, dy] of [[-34, -16], [34, -16], [-36, 16], [36, 16], [0, -34]]) {
    ctx.beginPath()
    ctx.arc(cx + dx * s, cy + dy * s, 4.2 * s, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = color
  for (const dx of [-8.5, 8.5]) {
    ctx.beginPath()
    ctx.arc(cx + dx * s, cy + 2 * s, 6 * s, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.moveTo(cx, cy + 10 * s)
  ctx.lineTo(cx - 3 * s, cy + 15 * s)
  ctx.lineTo(cx + 3 * s, cy + 15 * s)
  ctx.fill()
  ctx.fillRect(cx - 11 * s, cy + 20 * s, 22 * s, 2 * s)
  return canvas
}

function drawPicado(ctx: CanvasRenderingContext2D): void {
  const fw = 120
  const fh = 150
  const gap = 14
  const sag = (x: number) => 18 + 22 * 4 * (x / WIDTH) * (1 - x / WIDTH) * 0.5
  ctx.beginPath()
  ctx.moveTo(-10, 18)
  ctx.quadraticCurveTo(WIDTH / 2, 40, WIDTH + 10, 18)
  ctx.strokeStyle = 'rgba(243, 230, 208, 0.7)'
  ctx.lineWidth = 2
  ctx.stroke()

  const count = Math.ceil(WIDTH / (fw + gap)) + 1
  for (let i = 0; i < count; i++) {
    const x = i * (fw + gap) - fw / 3
    ctx.drawImage(flagImage(COLORS.flags[i % COLORS.flags.length], fw, fh), x, sag(x + fw / 2))
  }
}

function fitText(ctx: CanvasRenderingContext2D, text: string, family: string, max: number, min: number, maxWidth: number): number {
  for (let size = max; size > min; size -= 2) {
    ctx.font = `400 ${size}px ${family}`
    if (ctx.measureText(text).width <= maxWidth) return size
  }
  return min
}

function wrapLine(ctx: CanvasRenderingContext2D, line: string, maxWidth: number): string[] {
  if (ctx.measureText(line).width <= maxWidth) return [line]
  const pieces: string[] = []
  let current = ''
  for (const word of line.split(' ')) {
    const next = current ? `${current} ${word}` : word
    if (current && ctx.measureText(next).width > maxWidth) {
      pieces.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) pieces.push(current)
  return pieces
}

interface VerseLayout {
  size: number
  rows: (string | null)[]
  height: number
}

function layoutVerse(ctx: CanvasRenderingContext2D, verse: string, maxWidth: number, maxHeight: number): VerseLayout {
  const lines = verse.split('\n').map((line) => line.trim())
  let layout: VerseLayout | null = null
  for (let size = VERSE_MAX_PX; size >= VERSE_MIN_PX; size -= 1) {
    ctx.font = `400 ${size}px ${FONTS.verse}`
    const rows: VerseLayout['rows'] = []
    for (const line of lines) {
      if (!line) {
        if (rows.length > 0 && rows[rows.length - 1] !== null) rows.push(null)
        continue
      }
      rows.push(...wrapLine(ctx, line, maxWidth))
    }
    while (rows[rows.length - 1] === null) rows.pop()
    const lineHeight = size * LINE_HEIGHT
    const height = rows.reduce((sum, row) => sum + (row ? lineHeight : lineHeight * STANZA_GAP), 0)
    layout = { size, rows, height }
    if (height <= maxHeight) break
  }
  return layout!
}

function drawCard(ctx: CanvasRenderingContext2D, { forLabel, name, verse }: CardImageText): void {
  ctx.fillStyle = COLORS.turquesa
  roundedRect(ctx, CARD.x - 10, CARD.y - 8, CARD.w, CARD.h, CARD.radius)
  ctx.fill()
  ctx.fillStyle = COLORS.rosa
  roundedRect(ctx, CARD.x + 14, CARD.y + 14, CARD.w, CARD.h, CARD.radius)
  ctx.fill()
  ctx.fillStyle = COLORS.hueso
  roundedRect(ctx, CARD.x, CARD.y, CARD.w, CARD.h, CARD.radius)
  ctx.fill()

  const innerWidth = CARD.w - PAD_X * 2
  const centerX = CARD.x + CARD.w / 2

  const heading = `${forLabel} ${name}`
  const headingSize = fitText(ctx, heading, FONTS.display, 68, 36, innerWidth)
  ctx.font = `400 ${headingSize}px ${FONTS.display}`
  ctx.fillStyle = COLORS.rosa
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const headingBaseline = CARD.y + 56 + headingSize * 0.8
  ctx.fillText(heading, centerX, headingBaseline)

  const dividerY = headingBaseline + 30
  ctx.beginPath()
  ctx.moveTo(CARD.x + PAD_X - 10, dividerY)
  ctx.lineTo(CARD.x + CARD.w - PAD_X + 10, dividerY)
  ctx.setLineDash([10, 8])
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(35, 16, 58, 0.25)'
  ctx.stroke()
  ctx.setLineDash([])

  const top = dividerY + VERSE_TOP_GAP
  const layout = layoutVerse(ctx, verse, innerWidth, VERSE_BOTTOM - top)
  const lineHeight = layout.size * LINE_HEIGHT
  let y = top + Math.min(MAX_TOP_SLACK, Math.max(0, (VERSE_BOTTOM - top - layout.height) / 2))
  ctx.font = `400 ${layout.size}px ${FONTS.verse}`
  ctx.fillStyle = COLORS.noche
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (const row of layout.rows) {
    if (row) {
      ctx.fillText(row, centerX, y + (lineHeight - layout.size) / 2)
      y += lineHeight
    } else {
      y += lineHeight * STANZA_GAP
    }
  }
}

function drawFooter(ctx: CanvasRenderingContext2D, footer: string): void {
  ctx.font = `700 30px ${FONTS.ui}`
  ctx.fillStyle = COLORS.vela
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(footer, WIDTH / 2, (CARD.y + CARD.h + 14 + HEIGHT) / 2)
}

export async function renderCardImage(text: CardImageText): Promise<HTMLCanvasElement> {
  await loadFonts(`${text.forLabel} ${text.name} ${text.verse} ${text.footer}`)
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!
  drawBackground(ctx)
  drawPicado(ctx)
  drawCard(ctx, text)
  drawFooter(ctx, text.footer)
  return canvas
}

export function imageFileName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `calaverita${slug ? `-${slug}` : ''}.png`
}

export async function downloadCardImage(text: CardImageText): Promise<boolean> {
  const canvas = await renderCardImage(text)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return false

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = imageFileName(text.name)
  link.hidden = true
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return true
}
