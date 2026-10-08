import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// base './' hace que los assets funcionen en GitHub Pages
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        aviario: resolve(import.meta.dirname, 'aviario.html'),
        Enciclopedia: resolve(import.meta.dirname, 'Enciclopedia.html'),
      },
    },
  },
})
