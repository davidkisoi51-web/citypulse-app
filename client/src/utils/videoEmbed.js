// Turns a video link into something the featured banner can play as a muted, looping
// background: a YouTube or Vimeo embed (iframe), or a direct file for <video>.
// Returns null for an empty or unrecognised link. A start time in the link (YouTube's
// ?t=120 / ?t=2m / ?start=120, Vimeo's #t=2m) is kept, so the video opens at that point.

const YOUTUBE_ID = /^[\w-]{11}$/

// "120", "120s", "2m", "2m30s", "1h2m3s" -> seconds; anything else -> 0.
export function startSeconds(value) {
  const text = String(value ?? '').trim().toLowerCase()
  if (/^\d+s?$/.test(text)) return parseInt(text, 10)
  const match = text.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
  if (!text || !match) return 0
  const [, h = 0, m = 0, sec = 0] = match
  return Number(h) * 3600 + Number(m) * 60 + Number(sec)
}

function youtubeId(url) {
  const host = url.hostname.replace(/^(www\.|m\.)/, '')
  if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0]
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') return null
  if (url.pathname === '/watch') return url.searchParams.get('v')
  const [, kind, id] = url.pathname.split('/')
  return ['embed', 'shorts', 'live', 'v'].includes(kind) ? id : null
}

function vimeoId(url) {
  const host = url.hostname.replace(/^www\./, '')
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null
  return url.pathname.split('/').find((part) => /^\d+$/.test(part)) ?? null
}

export function videoEmbed(link) {
  const text = (link || '').trim()
  if (!text) return null

  let url
  try {
    // Relative paths ("/videos/clip.mp4") are files served by the app itself.
    url = new URL(text, 'https://citypulse.local')
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

  const start = startSeconds(url.searchParams.get('t') ?? url.searchParams.get('start') ?? url.hash.match(/t=([\w]+)/)?.[1])

  const yt = youtubeId(url)
  if (yt && YOUTUBE_ID.test(yt)) {
    const params = new URLSearchParams({
      autoplay: '1', mute: '1', loop: '1', playlist: yt, controls: '0',
      playsinline: '1', rel: '0', modestbranding: '1', disablekb: '1', enablejsapi: '1',
      ...(start ? { start: String(start) } : {}),
    })
    return { type: 'youtube', src: `https://www.youtube-nocookie.com/embed/${yt}?${params}` }
  }

  const vimeo = vimeoId(url)
  if (vimeo) {
    // background=1: autoplay, muted, looped, no controls or titles.
    const at = start ? `#t=${start}s` : ''
    return { type: 'vimeo', src: `https://player.vimeo.com/video/${vimeo}?background=1&autopause=0${at}` }
  }

  if (/\.(mp4|webm|ogg|mov)$/i.test(url.pathname)) return { type: 'file', src: text }
  return null
}
