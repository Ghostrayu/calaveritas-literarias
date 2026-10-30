export function siteUrl(): string {
  return `${location.origin}${location.pathname}`
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const previous = document.activeElement as HTMLElement | null
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.append(area)
    area.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    area.remove()
    previous?.focus()
    return ok
  }
}

export function canShareNatively(): boolean {
  return typeof navigator.share === 'function'
}

export type ShareOutcome = 'shared' | 'cancelled' | 'failed'

export async function shareNatively(title: string, text: string): Promise<ShareOutcome> {
  try {
    await navigator.share({ title, text, url: siteUrl() })
    return 'shared'
  } catch (err) {
    return err instanceof DOMException && err.name === 'AbortError' ? 'cancelled' : 'failed'
  }
}

export function shareLinks(text: string): Record<'whatsapp' | 'x' | 'facebook', string> {
  const url = siteUrl()
  const enc = encodeURIComponent
  return {
    whatsapp: `https://wa.me/?text=${enc(`${text}\n\n${url}`)}`,
    x: `https://x.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
  }
}
