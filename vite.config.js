import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'handle-redirects',
      buildEnd() {
        fs.copyFileSync('public/_redirects', 'build/_redirects')
        
        const content = fs.readFileSync('build/_redirects', 'utf8')
        const updated = content.replace(':VITE_FIREBASE_PROJECT_ID', process.env.VITE_FIREBASE_PROJECT_ID)
        fs.writeFileSync('build/_redirects', updated)
      }
    }
  ],
  server: {
    port: 3000,
    proxy: {
      '/__/auth': {
        target: `https://${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
        changeOrigin: true,
        secure: true,
      }
    }
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  },
  build: {
    outDir: 'build',
    emptyOutDir: true
  }
})