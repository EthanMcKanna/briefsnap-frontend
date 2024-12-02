import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'handle-redirects',
      buildEnd() {
        const buildDir = 'build';
        if (!fs.existsSync(buildDir)) {
          fs.mkdirSync(buildDir);
        }

        const redirectsContent = `/__/auth/* https://${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com/__/auth/:splat 200
/* /index.html 200`;
        
        fs.writeFileSync(path.join(buildDir, '_redirects'), redirectsContent);
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