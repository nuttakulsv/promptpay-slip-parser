import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { index: 'src/index.ts', image: 'src/image.ts' },
    format: ['esm', 'cjs'],
    dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
    clean: true,
    target: 'es2022',
  },
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    target: 'node20',
    banner: { js: '#!/usr/bin/env node' },
  },
])
