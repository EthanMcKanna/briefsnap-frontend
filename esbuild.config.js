const { build } = require('esbuild');

build({
  entryPoints: ['./functions/moderate-comment.js'],
  bundle: true,
  format: 'esm',
  outfile: './dist/moderate-comment.js',
  platform: 'browser',
  target: 'es2020',
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
    buffer: './functions/polyfills.js',
    stream: './functions/polyfills.js',
    util: './functions/polyfills.js',
  },
  minify: true
}).catch(() => process.exit(1));