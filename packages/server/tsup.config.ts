import { defineConfig } from 'tsup';

export default defineConfig([
  // Main server entry
  {
    entry: ['src/index.ts', 'src/cli.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  // Core module (parsers, cost, types) - for import by cloud
  {
    entry: ['src/core/index.ts'],
    outDir: 'dist/core',
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
  },
]);
