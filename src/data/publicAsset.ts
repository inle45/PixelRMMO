/**
 * Resolves a `public/` asset against the deployment's base path.
 *
 * Files under `src/assets` go through `import.meta.glob`/`import`, so Vite rewrites their URLs at
 * build time and they are always correct. Anything in `public/` is referenced by a plain string
 * instead — this codebase does that deliberately for a handful of large single-consumer images (the
 * World Map continent, the portrait zone backdrops, the chest spritesheet) — and a plain
 * root-absolute string is NOT rewritten. The moment the app is served from a subpath, every one of
 * them 404s.
 *
 * That is exactly what happened when `base` was set for GitHub Pages: the site is served from
 * /PixelRMMO/, so `/assets/camp/forest_edge_day_bg.png` resolved against the domain root and the
 * backdrops silently vanished. `BASE_URL` is '/PixelRMMO/' for the Pages build and '/' for the
 * Vercel one, so routing every public path through here keeps both targets correct.
 *
 * Pass a root-relative path starting with '/'.
 */
export function publicAsset(path: string): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "") + path;
}
