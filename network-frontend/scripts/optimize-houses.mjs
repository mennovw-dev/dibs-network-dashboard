// One-off: convert public/houses/*.png to optimized WebP and remove the PNGs.
// Requires sharp (not a runtime dep): npm i -D sharp && node scripts/optimize-houses.mjs
import { readdir, unlink, stat } from 'node:fs/promises'
import { join, dirname, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = dirname(fileURLToPath(import.meta.url))
const dir = join(root, '..', 'public', 'houses')
const MAX_WIDTH = 960
const QUALITY = 78

const files = (await readdir(dir)).filter((f) => extname(f).toLowerCase() === '.png')
let before = 0
let after = 0

for (const file of files) {
  const src = join(dir, file)
  const out = join(dir, `${basename(file, '.png')}.webp`)
  const srcSize = (await stat(src)).size
  before += srcSize

  await sharp(src)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(out)

  const outSize = (await stat(out)).size
  after += outSize
  await unlink(src)
  console.log(
    `${file} → ${basename(out)}  ${(srcSize / 1024).toFixed(0)}KB → ${(outSize / 1024).toFixed(0)}KB`,
  )
}

console.log(
  `\nTotal: ${(before / 1024 / 1024).toFixed(2)}MB → ${(after / 1024 / 1024).toFixed(2)}MB ` +
    `(${(100 - (after / before) * 100).toFixed(0)}% smaller)`,
)
