import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' hace que los assets funcionen en GitHub Pages
export default defineConfig({
  base: './',
  plugins: [react()],
})