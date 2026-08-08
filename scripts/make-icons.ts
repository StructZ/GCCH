/**
 * Generates icons/16.png, icons/48.png and icons/128.png.
 *
 * Icons are generated rather than committed as opaque binaries so the artwork is
 * reviewable and tweakable in a diff. No image dependencies - a PNG is a header,
 * a deflate stream and three CRCs.
 *
 *   npm run icons
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Rgb = readonly [number, number, number];
type Point = readonly [number, number];

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../icons');

const BG: Rgb = [26, 115, 232]; // Google blue
const FG: Rgb = [255, 255, 255];
const SIZES = [16, 48, 128] as const;

/** Supersampling factor. A 16px icon with aliased edges reads as a rendering bug. */
const SS = 4;

/** Distance from a point to a line segment. */
function distToSegment(px: number, py: number, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / lengthSq));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}

/** Signed distance to a rounded square, negative inside. */
function distToRoundedRect(px: number, py: number, size: number, radius: number): number {
  const half = size / 2 - radius;
  const qx = Math.abs(px - size / 2) - half;
  const qy = Math.abs(py - size / 2) - half;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

/**
 * The mark: a `< >` pair around a slash. Coordinates are fractions of the icon
 * size, so the same geometry scales down to 16px without a separate asset.
 */
const STROKES: readonly (readonly [Point, Point])[] = [
  [
    [0.36, 0.34],
    [0.22, 0.5],
  ],
  [
    [0.22, 0.5],
    [0.36, 0.66],
  ],
  [
    [0.64, 0.34],
    [0.78, 0.5],
  ],
  [
    [0.78, 0.5],
    [0.64, 0.66],
  ],
  [
    [0.56, 0.3],
    [0.44, 0.7],
  ],
];

function glyphDistance(x: number, y: number, size: number): number {
  let best = Infinity;
  for (const [a, b] of STROKES) {
    const scaledA: Point = [a[0] * size, a[1] * size];
    const scaledB: Point = [b[0] * size, b[1] * size];
    best = Math.min(best, distToSegment(x, y, scaledA, scaledB));
  }
  return best;
}

function renderRgba(size: number): Buffer {
  const pixels = Buffer.alloc(size * size * 4);
  const radius = size * 0.22;
  const strokeWidth = Math.max(size * 0.075, 1.1);
  const samples = SS * SS;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bgHits = 0;
      let fgHits = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          if (distToRoundedRect(px, py, size, radius) <= 0) bgHits++;
          if (glyphDistance(px, py, size) <= strokeWidth / 2) fgHits++;
        }
      }

      const bgAlpha = bgHits / samples;
      const fgAlpha = (fgHits / samples) * bgAlpha; // glyph clipped to the tile
      const i = (y * size + x) * 4;

      for (let c = 0; c < 3; c++) {
        pixels[i + c] = Math.round(BG[c]! * (1 - fgAlpha) + FG[c]! * fgAlpha);
      }
      pixels[i + 3] = Math.round(bgAlpha * 255);
    }
  }

  return pixels;
}

const CRC_TABLE: Int32Array = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size: number, rgba: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with its filter byte (0 = None).
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(outDir, { recursive: true });
for (const size of SIZES) {
  const file = resolve(outDir, `${size}.png`);
  writeFileSync(file, encodePng(size, renderRgba(size)));
  process.stdout.write(`wrote ${file}\n`);
}
