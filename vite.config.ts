import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: [
      '@metaplex-foundation/umi',
      '@metaplex-foundation/mpl-core',
      '@metaplex-foundation/umi-bundle-defaults',
      '@metaplex-foundation/umi-web3js-adapters',
    ],
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
