// Generates valid PNG icons — no external deps needed
const fs = require('fs')
const zlib = require('zlib')

function crc32(buf) {
  const table = []
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    table[i] = c
  }
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crcBuf = Buffer.concat([typeBytes, data])
  const crcVal = Buffer.alloc(4); crcVal.writeUInt32BE(crc32(crcBuf))
  return Buffer.concat([len, typeBytes, data, crcVal])
}

function makePNG(size) {
  // Build RGBA pixel data with a purple background + white "F"
  const rows = []
  for (let y = 0; y < size; y++) {
    const row = [0] // PNG filter byte = None
    for (let x = 0; x < size; x++) {
      const nx = x / size, ny = y / size
      // Rounded rect background check
      const margin = 0.1
      const inBg = nx >= margin && nx <= 1 - margin && ny >= margin && ny <= 1 - margin
      // Draw "F" shape
      const px = nx * 10, py = ny * 10
      const inVBar = px >= 3 && px <= 4.5 && py >= 1.5 && py <= 8.5
      const inTopBar = px >= 3 && px <= 7.5 && py >= 1.5 && py <= 3
      const inMidBar = px >= 3 && px <= 6.5 && py >= 4.5 && py <= 5.8
      const inF = inVBar || inTopBar || inMidBar

      if (inF) {
        row.push(255, 255, 255, 255) // white letter
      } else if (inBg) {
        row.push(124, 92, 252, 255)  // #7c5cfc purple
      } else {
        row.push(5, 5, 8, 255)       // #050508 dark bg
      }
    }
    rows.push(Buffer.from(row))
  }

  const raw = Buffer.concat(rows)
  const compressed = zlib.deflateSync(raw, { level: 9 })

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // color type: RGBA
  ihdr[10] = 0  // compression
  ihdr[11] = 0  // filter
  ihdr[12] = 0  // interlace

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [16, 48, 128]) {
  const buf = makePNG(size)
  fs.writeFileSync(`icon${size}.png`, buf)
  console.log(`icon${size}.png — ${buf.length} bytes`)
}
console.log('Done.')
