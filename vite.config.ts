import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this repo as a project site at /PixelRMMO/, not domain root — without this,
  // the built index.html's asset paths are root-absolute ("/assets/...") and 404 on the real subpath
  // (confirmed live: https://inle45.github.io/assets/... 404s, .../PixelRMMO/assets/... 200s).
  base: '/PixelRMMO/',
  plugins: [react(), tailwindcss()],
})
