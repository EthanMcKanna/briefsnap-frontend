const { build } = require('esbuild');

build({
  entryPoints: ['./functions/moderate-comment.js'],
  bundle: true,
  format: 'esm',
  outfile: './dist/moderate-comment.js',
  platform: 'node',
  target: 'node18',
  external: [
    'firebase-admin',
    'firebase-admin/*',
    '@google-cloud/*',
    'openai'
  ],
  define: {
    'process.env.NODE_ENV': '"production"',
    'global': 'globalThis',
  },
  inject: ['./functions/polyfills.js'],
  alias: {
    'buffer': 'node:buffer',
    'stream': 'node:stream',
    'util': 'node:util',
  },
  minify: true
}).catch(() => process.exit(1));