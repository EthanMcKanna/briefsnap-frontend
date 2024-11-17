const { build } = require('esbuild');

build({
  entryPoints: ['./functions/moderate-comment.js'],
  bundle: true,
  format: 'esm',
  outfile: './dist/moderate-comment.js',
  platform: 'neutral',
  target: 'es2020',
  external: [
    'firebase-admin',
    'firebase-admin/*',
    '@google-cloud/*',
    'openai'
  ],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  minify: true
}).catch(() => process.exit(1));