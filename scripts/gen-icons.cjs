/* Generate Starvia PWA PNG icons using Node built-ins only. */
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function insidePolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function render(size) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  const points = [
    [0.5, 0.18], [0.57, 0.41], [0.78, 0.5], [0.57, 0.59],
    [0.5, 0.82], [0.43, 0.59], [0.22, 0.5], [0.43, 0.41],
  ];
  const radius = 0.22;

  for (let y = 0; y < size; y += 1) {
    const row = y * stride;
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const px = (x + 0.5) / size;
      const py = (y + 0.5) / size;
      const blend = Math.min(1, Math.max(0, (px + py) / 2));
      const blueBlend = Math.max(0, Math.min(1, px * 0.72 + py * 0.28));
      let r = Math.round(79 * (1 - blend) + 14 * blend);
      let g = Math.round(70 * (1 - blend) + 165 * blueBlend);
      let b = Math.round(229 * (1 - blueBlend) + 233 * blueBlend);

      const edge = Math.min(px, py, 1 - px, 1 - py);
      const cornerX = Math.max(0, radius - Math.min(px, 1 - px));
      const cornerY = Math.max(0, radius - Math.min(py, 1 - py));
      const outsideRound = cornerX * cornerX + cornerY * cornerY > radius * radius;
      if (outsideRound) {
        r = 8; g = 11; b = 24;
      }

      if (insidePolygon(px, py, points)) {
        const glow = 0.92 + 0.08 * (1 - py);
        r = Math.round(255 * glow);
        g = Math.round(255 * glow);
        b = 255;
      }

      const sparkle = Math.hypot(px - 0.73, py - 0.28);
      if (sparkle < 0.027 || (Math.abs(px - 0.73) < 0.012 && Math.abs(py - 0.28) < 0.065)) {
        r = 255; g = 255; b = 255;
      }

      const offset = row + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const output = path.join(__dirname, "..", "public");
for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
  const file = path.join(output, name);
  fs.writeFileSync(file, render(size));
  console.log(`generated ${path.relative(process.cwd(), file)} (${size}×${size})`);
}
