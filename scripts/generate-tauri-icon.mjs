import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outputPath = join(root, 'src-tauri', 'icons', 'icon.ico');

function createDib(size) {
  const width = size;
  const height = size;
  const pixels = Buffer.alloc(width * height * 4);
  const background = { r: 0x16, g: 0x1c, b: 0x2c };
  const foreground = { r: 0xf5, g: 0x9e, b: 0x0b };
  const stroke = Math.max(2, Math.floor(size / 8));
  const left = Math.floor(size / 4);
  const right = size - Math.floor(size / 4) - stroke;
  const top = Math.floor(size / 5);
  const bottom = size - Math.floor(size / 5);
  const middle = Math.floor(size / 2) - Math.floor(stroke / 2);

  let offset = 0;
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = 0; x < width; x += 1) {
      const isHermesH =
        (x >= left && x < left + stroke && y >= top && y < bottom) ||
        (x >= right && x < right + stroke && y >= top && y < bottom) ||
        (x >= left && x < right + stroke && y >= middle && y < middle + stroke);
      const color = isHermesH ? foreground : background;
      pixels[offset] = color.b;
      pixels[offset + 1] = color.g;
      pixels[offset + 2] = color.r;
      pixels[offset + 3] = 0xff;
      offset += 4;
    }
  }

  const maskRowBytes = Math.ceil(width / 32) * 4;
  const andMask = Buffer.alloc(maskRowBytes * height);
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeUInt32LE(width, 4);
  header.writeUInt32LE(height * 2, 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  header.writeUInt32LE(0, 16);
  header.writeUInt32LE(pixels.length, 20);
  header.writeUInt32LE(0, 24);
  header.writeUInt32LE(0, 28);
  header.writeUInt32LE(0, 32);
  header.writeUInt32LE(0, 36);

  return Buffer.concat([header, pixels, andMask]);
}

function createIco(sizes) {
  const images = sizes.map(createDib);
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = Buffer.alloc(images.length * 16);
  let imageOffset = 6 + entries.length;
  images.forEach((image, index) => {
    const size = sizes[index];
    const entryOffset = index * 16;
    entries.writeUInt8(size === 256 ? 0 : size, entryOffset);
    entries.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
    entries.writeUInt8(0, entryOffset + 2);
    entries.writeUInt8(0, entryOffset + 3);
    entries.writeUInt16LE(1, entryOffset + 4);
    entries.writeUInt16LE(32, entryOffset + 6);
    entries.writeUInt32LE(image.length, entryOffset + 8);
    entries.writeUInt32LE(imageOffset, entryOffset + 12);
    imageOffset += image.length;
  });

  return Buffer.concat([header, entries, ...images]);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, createIco([16, 32, 64, 128, 256]));
console.log(`Generated ${outputPath}`);
