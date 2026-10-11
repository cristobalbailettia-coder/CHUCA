// Generador de imágenes (PNG) y audios (WAV) ilustrativos para los datos de ejemplo.
// No son fotos reales: son escenas dibujadas por código del bosque seco.
import zlib from 'node:zlib'

const W = 480
const H = 320

export function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const lerp = (a, b, t) => a + (b - a) * t
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]

class Img {
  constructor() {
    this.px = new Float32Array(W * H * 3)
  }
  set(x, y, c, a = 1) {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= W || y >= H) return
    const i = (y * W + x) * 3
    this.px[i] = this.px[i] * (1 - a) + c[0] * a
    this.px[i + 1] = this.px[i + 1] * (1 - a) + c[1] * a
    this.px[i + 2] = this.px[i + 2] * (1 - a) + c[2] * a
  }
  rect(x0, y0, x1, y1, c, a = 1) {
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, y1); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, x1); x++) this.set(x, y, c, a)
  }
  ellipse(cx, cy, rx, ry, c, a = 1) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
        if (d <= 1) this.set(x, y, c, a)
      }
  }
  tri(p, q, r, c, a = 1) {
    const minX = Math.floor(Math.min(p[0], q[0], r[0]))
    const maxX = Math.ceil(Math.max(p[0], q[0], r[0]))
    const minY = Math.floor(Math.min(p[1], q[1], r[1]))
    const maxY = Math.ceil(Math.max(p[1], q[1], r[1]))
    const den = (q[1] - r[1]) * (p[0] - r[0]) + (r[0] - q[0]) * (p[1] - r[1])
    if (Math.abs(den) < 1e-9) return
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const l1 = ((q[1] - r[1]) * (x - r[0]) + (r[0] - q[0]) * (y - r[1])) / den
        const l2 = ((r[1] - p[1]) * (x - r[0]) + (p[0] - r[0]) * (y - r[1])) / den
        if (l1 >= 0 && l2 >= 0 && 1 - l1 - l2 >= 0) this.set(x, y, c, a)
      }
  }
  quad(a, b, c, d, col, al = 1) {
    this.tri(a, b, c, col, al)
    this.tri(a, c, d, col, al)
  }
  line(x0, y0, x1, y1, w, c, a = 1) {
    const dx = x1 - x0
    const dy = y1 - y0
    const len = Math.hypot(dx, dy) || 1
    const nx = (-dy / len) * (w / 2)
    const ny = (dx / len) * (w / 2)
    this.quad([x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny], c, a)
  }
  png(rng) {
    // grano leve y viñeteo para que no se vea tan "plano"
    const raw = Buffer.alloc((W * 3 + 1) * H)
    for (let y = 0; y < H; y++) {
      raw[y * (W * 3 + 1)] = 0
      for (let x = 0; x < W; x++) {
        const v = 1 - 0.28 * (((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2) * 0.6
        for (let k = 0; k < 3; k++) {
          const val = this.px[(y * W + x) * 3 + k] * v + (rng() - 0.5) * 14
          raw[y * (W * 3 + 1) + 1 + x * 3 + k] = Math.max(0, Math.min(255, val))
        }
      }
    }
    const crcTable = Array.from({ length: 256 }, (_, n) => {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      return c >>> 0
    })
    const crc = (buf) => {
      let c = 0xffffffff
      for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
      return (c ^ 0xffffffff) >>> 0
    }
    const chunk = (type, data) => {
      const len = Buffer.alloc(4)
      len.writeUInt32BE(data.length)
      const td = Buffer.concat([Buffer.from(type), data])
      const c = Buffer.alloc(4)
      c.writeUInt32BE(crc(td))
      return Buffer.concat([len, td, c])
    }
    const ihdr = Buffer.alloc(13)
    ihdr.writeUInt32BE(W, 0)
    ihdr.writeUInt32BE(H, 4)
    ihdr[8] = 8
    ihdr[9] = 2
    return Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ])
  }
}

function baseScene(img, rng, { haze = [238, 226, 200], close = false } = {}) {
  const horizon = close ? 90 : 150
  for (let y = 0; y < H; y++) {
    const c = y < horizon ? mix([112, 165, 214], haze, y / horizon) : mix([170, 142, 90], [104, 80, 48], (y - horizon) / (H - horizon))
    img.rect(0, y, W, y + 1, c)
  }
  if (!close) {
    const p1 = rng() * 6
    const p2 = rng() * 6
    for (let x = 0; x < W; x++) {
      img.rect(x, horizon - 34 - 16 * Math.sin(x / 90 + p1), x + 1, horizon + 2, [150, 150, 112], 0.9)
      img.rect(x, horizon - 14 - 10 * Math.sin(x / 55 + p2), x + 1, horizon + 6, [118, 120, 76])
    }
    for (let i = 0; i < 70; i++) img.ellipse(rng() * W, horizon + 8 + rng() * 150, 3 + rng() * 9, 1.5 + rng() * 3, rng() < 0.5 ? [120, 118, 70] : [150, 128, 86], 0.8)
    for (let i = 0; i < 4; i++) tree(img, rng, 40 + rng() * 400, horizon + 10 + rng() * 40, 0.5 + rng() * 0.5)
  } else {
    for (let i = 0; i < 160; i++) img.ellipse(rng() * W, horizon + rng() * 230, 2 + rng() * 6, 1 + rng() * 2, rng() < 0.5 ? [135, 105, 66] : [90, 68, 40], 0.7)
  }
}

function tree(img, rng, x, y, s) {
  img.rect(x - 4 * s, y - 55 * s, x + 4 * s, y, [78, 58, 38])
  img.line(x, y - 45 * s, x - 22 * s, y - 70 * s, 3 * s, [78, 58, 38])
  img.line(x, y - 45 * s, x + 24 * s, y - 72 * s, 3 * s, [78, 58, 38])
  for (let i = 0; i < 7; i++) img.ellipse(x + (rng() - 0.5) * 70 * s, y - 70 * s + (rng() - 0.5) * 14 * s, (18 + rng() * 14) * s, (7 + rng() * 6) * s, rng() < 0.6 ? [92, 112, 58] : [118, 128, 70], 0.9)
}

function deer(img, x, y, s, rng) {
  const body = [158, 112, 70]
  const dark = [112, 78, 48]
  for (const dx of [-26, -18, 18, 26]) img.line(x + dx * s, y + 12 * s, x + dx * s + 1, y + 46 * s, 4 * s, dark)
  img.ellipse(x, y, 38 * s, 17 * s, body)
  img.ellipse(x - 6 * s, y + 8 * s, 28 * s, 9 * s, [210, 190, 160], 0.7)
  img.quad([x + 28 * s, y - 8 * s], [x + 40 * s, y - 34 * s], [x + 50 * s, y - 30 * s], [x + 36 * s, y + 2 * s], body)
  img.ellipse(x + 52 * s, y - 33 * s, 11 * s, 7 * s, body)
  img.ellipse(x + 46 * s, y - 40 * s, 3 * s, 6 * s, body)
  img.ellipse(x + 57 * s, y - 33 * s, 2 * s, 2 * s, [30, 24, 20])
  img.ellipse(x - 39 * s, y - 6 * s, 5 * s, 9 * s, [245, 240, 230])
  if (rng() < 0.6) {
    img.line(x + 50 * s, y - 40 * s, x + 46 * s, y - 62 * s, 2 * s, [196, 176, 140])
    img.line(x + 47 * s, y - 55 * s, x + 56 * s, y - 64 * s, 2 * s, [196, 176, 140])
    img.line(x + 54 * s, y - 40 * s, x + 62 * s, y - 60 * s, 2 * s, [196, 176, 140])
  }
}

function goat(img, x, y, s, col) {
  for (const dx of [-8, -3, 5, 9]) img.line(x + dx * s, y + 5 * s, x + dx * s, y + 17 * s, 2 * s, [60, 46, 36])
  img.ellipse(x, y, 14 * s, 7 * s, col)
  img.ellipse(x + 14 * s, y - 6 * s, 5 * s, 4 * s, col)
  img.line(x + 14 * s, y - 9 * s, x + 17 * s, y - 15 * s, 1.5 * s, [70, 60, 50])
  img.ellipse(x + 17 * s, y - 6 * s, 1 * s, 1 * s, [20, 20, 20])
}

function stump(img, x, y, s, rng) {
  img.rect(x - 15 * s, y, x + 15 * s, y + 20 * s, [96, 70, 44])
  img.ellipse(x, y + 20 * s, 15 * s, 4 * s, [96, 70, 44])
  img.ellipse(x, y, 15 * s, 5 * s, [222, 188, 138])
  img.ellipse(x, y, 10 * s, 3.2 * s, [196, 156, 104], 0.8)
  img.ellipse(x, y, 5 * s, 1.6 * s, [170, 128, 80], 0.8)
  for (let i = 0; i < 5; i++) img.ellipse(x + (rng() - 0.5) * 50 * s, y + 22 * s + rng() * 6, 4 * s, 1.5 * s, [220, 190, 140], 0.7)
}

function smoke(img, x, y) {
  for (let i = 0; i < 10; i++) img.ellipse(x + i * 6 + Math.sin(i) * 8, y - i * 17, 14 + i * 5, 10 + i * 4, [92, 90, 90], 0.3)
}

function paw(img, x, y, s, rot = 0) {
  const c = [70, 52, 34]
  img.ellipse(x, y, 11 * s, 9 * s, c, 0.9)
  for (const a of [-0.9, -0.3, 0.3, 0.9]) img.ellipse(x + Math.sin(a + rot) * 14 * s, y - Math.cos(a + rot) * 14 * s, 4.5 * s, 5.5 * s, c, 0.9)
}

/** theme: tala | incendio | pastoreo | fauna | huellas | paisaje */
export function scene(theme, seed) {
  const rng = mulberry32(seed)
  const img = new Img()
  if (theme === 'huellas') {
    baseScene(img, rng, { close: true })
    for (let i = 0; i < 4; i++) paw(img, 110 + i * 85 + rng() * 10, 260 - i * 38 + rng() * 8, 1.4, -0.2 + rng() * 0.2)
  } else if (theme === 'incendio') {
    baseScene(img, rng, { haze: [250, 190, 120] })
    img.ellipse(240 + rng() * 80, 160, 190, 55, [255, 120, 30], 0.35)
    const fx = 190 + rng() * 120
    for (let i = 0; i < 16; i++) {
      const x = fx + (rng() - 0.5) * 150
      const h = 14 + rng() * 26
      img.tri([x - 8, 168], [x + 8, 168], [x + (rng() - 0.5) * 6, 168 - h], rng() < 0.5 ? [255, 96, 20] : [255, 188, 40], 0.9)
    }
    smoke(img, fx + 10, 150)
  } else if (theme === 'tala') {
    baseScene(img, rng)
    img.quad([70, 258], [330, 232], [334, 252], [74, 280], [104, 76, 48])
    img.ellipse(332, 242, 9, 12, [214, 176, 124])
    stump(img, 380 + rng() * 30, 238, 1.5, rng)
    stump(img, 170 + rng() * 30, 214, 1.1, rng)
    stump(img, 470, 270, 1.2, rng)
  } else if (theme === 'pastoreo') {
    baseScene(img, rng)
    const cols = [[240, 236, 226], [140, 100, 66], [48, 40, 36], [200, 190, 170]]
    for (let i = 0; i < 9; i++) goat(img, 60 + rng() * 380, 200 + rng() * 85, 1 + rng() * 0.8, cols[Math.floor(rng() * cols.length)])
  } else if (theme === 'fauna') {
    baseScene(img, rng)
    deer(img, 170 + rng() * 120, 230, 1.5 + rng() * 0.3, rng)
  } else {
    baseScene(img, rng)
    tree(img, rng, 120, 290, 2.2)
    tree(img, rng, 360, 270, 1.8)
  }
  return img.png(rng)
}

export function wav(variant, seed) {
  const rng = mulberry32(seed)
  const sr = 11025
  const n = sr * 6
  const out = new Float32Array(n)
  let lp = 0
  for (let i = 0; i < n; i++) {
    lp += (rng() - 0.5 - lp) * 0.06
    out[i] = lp * (0.25 + 0.15 * Math.sin(i / sr / 1.7)) // viento suave
  }
  if (variant === 'cigarras') {
    for (let i = 0; i < n; i++) out[i] += 0.16 * Math.sin((2 * Math.PI * 3100 * i) / sr) * (0.5 + 0.5 * Math.sin((2 * Math.PI * 38 * i) / sr)) * (0.6 + 0.4 * Math.sin(i / sr / 0.9))
  }
  const calls = variant === 'ave' ? 6 : 2
  for (let c = 0; c < calls; c++) {
    const t0 = Math.floor((0.3 + rng() * 5) * sr)
    const len = Math.floor((0.12 + rng() * 0.3) * sr)
    const f0 = 1800 + rng() * 1200
    const f1 = f0 + (rng() < 0.5 ? 1 : -1) * (600 + rng() * 900)
    let ph = 0
    for (let i = 0; i < len && t0 + i < n; i++) {
      const u = i / len
      ph += (2 * Math.PI * lerp(f0, f1, u * u)) / sr
      out[t0 + i] += 0.42 * Math.sin(ph) * Math.sin(Math.PI * u) * (0.7 + 0.3 * Math.sin(ph * 0.05))
    }
  }
  const data = Buffer.alloc(n * 2)
  for (let i = 0; i < n; i++) data.writeInt16LE(Math.max(-1, Math.min(1, out[i])) * 30000, i * 2)
  const h = Buffer.alloc(44)
  h.write('RIFF', 0)
  h.writeUInt32LE(36 + data.length, 4)
  h.write('WAVEfmt ', 8)
  h.writeUInt32LE(16, 16)
  h.writeUInt16LE(1, 20)
  h.writeUInt16LE(1, 22)
  h.writeUInt32LE(sr, 24)
  h.writeUInt32LE(sr * 2, 28)
  h.writeUInt16LE(2, 32)
  h.writeUInt16LE(16, 34)
  h.write('data', 36)
  h.writeUInt32LE(data.length, 40)
  return Buffer.concat([h, data])
}
