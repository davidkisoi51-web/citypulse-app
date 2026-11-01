import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startSeconds, videoEmbed } from '../utils/videoEmbed.js'

const ID = 'dQw4w9WgXcQ'

test('YouTube links in their usual forms become a muted, looping embed', () => {
  for (const link of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://m.youtube.com/watch?v=${ID}`,
  ]) {
    const embed = videoEmbed(link)
    assert.equal(embed?.type, 'youtube', link)
    const src = new URL(embed.src)
    assert.equal(src.pathname, `/embed/${ID}`)
    assert.equal(src.searchParams.get('mute'), '1')
    assert.equal(src.searchParams.get('autoplay'), '1')
    // YouTube only loops a single video when it is also its own playlist.
    assert.equal(src.searchParams.get('playlist'), ID)
  }
})

test('Vimeo links become a background-mode player', () => {
  for (const link of ['https://vimeo.com/76979871', 'https://player.vimeo.com/video/76979871']) {
    const embed = videoEmbed(link)
    assert.equal(embed?.type, 'vimeo', link)
    assert.match(embed.src, /^https:\/\/player\.vimeo\.com\/video\/76979871\?background=1/)
  }
})

test('direct video files, full URLs or paths in the app, play as files', () => {
  assert.deepEqual(videoEmbed('https://cdn.example.com/clips/crowd.mp4'), {
    type: 'file',
    src: 'https://cdn.example.com/clips/crowd.mp4',
  })
  assert.deepEqual(videoEmbed('/videos/featured.webm'), { type: 'file', src: '/videos/featured.webm' })
})

test('empty, unsafe or unrecognised links give nothing', () => {
  assert.equal(videoEmbed(''), null)
  assert.equal(videoEmbed(null), null)
  assert.equal(videoEmbed('   '), null)
  assert.equal(videoEmbed('javascript:alert(1)'), null)
  assert.equal(videoEmbed('https://example.com/page'), null)
  assert.equal(videoEmbed('https://www.youtube.com/watch?v=short'), null)
})

test('start times read in YouTube and Vimeo formats', () => {
  assert.equal(startSeconds('120'), 120)
  assert.equal(startSeconds('120s'), 120)
  assert.equal(startSeconds('2m'), 120)
  assert.equal(startSeconds('2m30s'), 150)
  assert.equal(startSeconds('1h2m3s'), 3723)
  assert.equal(startSeconds(''), 0)
  assert.equal(startSeconds(null), 0)
  assert.equal(startSeconds('soon'), 0)
})

test('a start time in the link carries into the embed', () => {
  for (const link of [`https://youtu.be/${ID}?t=120`, `https://youtu.be/${ID}?si=x&t=2m`, `https://www.youtube.com/watch?v=${ID}&start=120`]) {
    assert.equal(new URL(videoEmbed(link).src).searchParams.get('start'), '120', link)
  }
  assert.equal(new URL(videoEmbed(`https://youtu.be/${ID}`).src).searchParams.has('start'), false)
  assert.match(videoEmbed('https://vimeo.com/76979871#t=2m').src, /#t=120s$/)
})
