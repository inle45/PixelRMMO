import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// This project ships to two targets from the same `npm run build`, at two different URL shapes:
// GitHub Pages serves it as a project site under a subpath (https://inle45.github.io/PixelRMMO/),
// while Vercel serves it at its own domain root (https://pixel-rmmo.vercel.app/). A single fixed
// `base` breaks one or the other — confirmed both ways: unprefixed paths 404 on the Pages subpath,
// and prefixing them then 404s on Vercel's root once Vercel auto-redeployed from the same commit.
// Vercel's own build environment sets `VERCEL=1` automatically (GitHub Actions does not), so that's
// the one signal already available to tell the two builds apart without a separate config file.
export default defineConfig({
  base: process.env.VERCEL ? '/' : '/PixelRMMO/',
  plugins: [react(), tailwindcss()],
})
