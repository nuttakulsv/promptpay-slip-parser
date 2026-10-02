// Bundles the library for examples/browser so the demo works offline and on GitHub Pages.
import { copyFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { build } from 'tsup'

const demo = new URL('../examples/browser/', import.meta.url)
const vendor = new URL('vendor/', demo)
const samples = new URL('samples/', demo)

await build({
  entry: { 'promptpay-slip-parser': 'scripts/demo-entry.ts' },
  outDir: fileURLToPath(vendor),
  format: ['esm'],
  platform: 'browser',
  target: 'es2022',
  noExternal: [/.*/],
  minify: true,
  clean: true,
  silent: true,
  config: false,
})

const require = createRequire(import.meta.url)
await copyFile(
  require.resolve('zxing-wasm/reader/zxing_reader.wasm'),
  new URL('zxing_reader.wasm', vendor),
)

await mkdir(samples, { recursive: true })
for (const name of ['bank-basic.png', 'chat-screenshot.png', 'two-codes.png', 'tampered.png']) {
  await copyFile(new URL(`../test/fixtures/${name}`, import.meta.url), new URL(name, samples))
}

console.log('demo ready in examples/browser')
