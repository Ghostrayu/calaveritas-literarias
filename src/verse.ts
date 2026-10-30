const LEADING_NOISE = /^[\s¡¿*_#>"“«-]+/

const PREAMBLE = [
  /^here('s| is| are)\b/i,
  /^(sure|certainly|of course|absolutely)\s*[!,.]/i,
  /^(claro|por supuesto|con gusto|desde luego)\s*[!,.]/i,
  /^aquí (tienes|está|te dejo|va)\b/i,
  /^(title|título)\s*:/i,
  /^calaverita (for|para|de)\b/i,
]

const CLOSING = [
  /^(i hope|hope you|enjoy)\b/i,
  /^(espero que|ojalá (te|le) guste|que (lo|la) disfrutes|disfrútal[oa])/i,
  /^(note|nota)\s*:/i,
]

function matches(line: string, patterns: RegExp[]): boolean {
  const text = line.replace(LEADING_NOISE, '')
  return patterns.some((pattern) => pattern.test(text))
}

function isTitle(line: string): boolean {
  return /^#+\s/.test(line) || /^(\*\*|__).+(\*\*|__)$/.test(line)
}

function stripMarkdown(line: string): string {
  return line
    .replace(/^#+\s*/, '')
    .replace(/^>\s?/, '')
    .replace(/\*\*|__/g, '')
}

export function cleanVerse(raw: string): string {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n').map((line) => line.trim())

  while (lines.length > 0 && (lines[0] === '' || isTitle(lines[0]) || matches(lines[0], PREAMBLE))) {
    lines.shift()
  }
  while (lines.length > 0 && (lines[lines.length - 1] === '' || matches(lines[lines.length - 1], CLOSING))) {
    lines.pop()
  }

  return lines
    .map(stripMarkdown)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
}
