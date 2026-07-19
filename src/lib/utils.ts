export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export function timeAgo(dateStr: string) {
  const d = new Date(dateStr).getTime()
  const diff = Date.now() - d
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}d`
  const w = Math.floor(days / 7)
  if (w < 5) return `${w}w`
  const mo = Math.floor(days / 30)
  if (mo < 12) return `${mo}mo`
  const y = Math.floor(days / 365)
  return `${y}y`
}

export function formatCount(n: number) {
  if (n < 1000) return `${n}`
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0).replace(/\.0$/, '')}K`
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
}

export function initials(name?: string | null) {
  if (!name) return 'U'
  return name.trim().slice(0, 2).toUpperCase()
}

export function extractHashtags(caption: string | null | undefined): string[] {
  if (!caption) return []
  const matches = caption.match(/#(\w+)/g) || []
  return matches.map((m) => m.slice(1).toLowerCase())
}

export function renderCaption(caption: string | null | undefined) {
  if (!caption) return []
  // Split into tokens, marking hashtags and mentions
  const tokens = caption.split(/(\s+)/)
  return tokens.map((tok, i) => {
    if (tok.startsWith('#')) return { type: 'tag' as const, text: tok, key: i }
    if (tok.startsWith('@')) return { type: 'mention' as const, text: tok, key: i }
    return { type: 'text' as const, text: tok, key: i }
  })
}
