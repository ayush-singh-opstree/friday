/**
 * Generates the PWA icons as real PNG files (Chrome and iOS require bitmaps).
 *
 * Zero dependencies: a tiny PNG encoder (IHDR/IDAT/IEND + CRC32 + zlib deflate)
 * rasterises the Threadwise mark - a brand-blue rounded tile with three white
 * "thread" bars.
 *
 * Usage: npm run icons
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(HERE, '..', 'public', 'icons')
const SIZES = [32, 180, 192, 512]

const BRAND = [79, 106, 245]
const MARK = [255, 255, 255]
const SAMPLES = 4

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([length, body, checksum])
}

function encodePng(size, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type RGBA
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (stride + 1)
    raw[rowStart] = 0
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function inRoundedRect(x, y, left, top, width, height, radius) {
  if (x < left || y < top || x > left + width || y > top + height) return false
  const r = Math.min(radius, width / 2, height / 2)
  const dx = x < left + r ? left + r - x : x > left + width - r ? x - (left + width - r) : 0
  const dy = y < top + r ? top + r - y : y > top + height - r ? y - (top + height - r) : 0
  return dx * dx + dy * dy <= r * r
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4)
  const tileRadius = size * 0.235
  const barHeight = Math.max(1, Math.round(size * 0.115))
  const bars = [
    { left: size * 0.245, width: size * 0.51, centerY: size * 0.345 },
    { left: size * 0.245, width: size * 0.51, centerY: size * 0.5 },
    { left: size * 0.245, width: size * 0.29, centerY: size * 0.655 },
  ].map((bar) => ({
    left: bar.left,
    top: bar.centerY - barHeight / 2,
    width: bar.width,
    height: barHeight,
    radius: barHeight / 2,
  }))

  const step = 1 / SAMPLES
  const total = SAMPLES * SAMPLES

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let a = 0
      let pr = 0
      let pg = 0
      let pb = 0
      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const px = x + (sx + 0.5) * step
          const py = y + (sy + 0.5) * step
          if (!inRoundedRect(px, py, 0, 0, size, size, tileRadius)) continue
          const onMark = bars.some((bar) =>
            inRoundedRect(px, py, bar.left, bar.top, bar.width, bar.height, bar.radius),
          )
          const [r, g, b] = onMark ? MARK : BRAND
          a += 1
          pr += r
          pg += g
          pb += b
        }
      }
      const offset = (y * size + x) * 4
      if (a === 0) continue
      rgba[offset] = Math.round(pr / a)
      rgba[offset + 1] = Math.round(pg / a)
      rgba[offset + 2] = Math.round(pb / a)
      rgba[offset + 3] = Math.round((a / total) * 255)
    }
  }

  return rgba
}

mkdirSync(OUT_DIR, { recursive: true })
for (const size of SIZES) {
  const file = resolve(OUT_DIR, `icon${size}.png`)
  writeFileSync(file, encodePng(size, drawIcon(size)))
  console.log(`wrote ${file}`)
}
console.log(`\n${SIZES.length} icons generated.`)