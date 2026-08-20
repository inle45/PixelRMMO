# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # install dependencies
npm run dev        # Vite dev server (http://localhost:5173)
npm run build       # tsc -b (typecheck) then vite build -> dist/
npm run lint        # oxlint
npm run preview      # serve the production build locally
```

There is no test suite yet. There is no single-test command because there are no tests.

## Architecture

React 19 + TypeScript + Vite, styled with Tailwind CSS v4 (via `@tailwindcss/vite`, config lives in `src/index.css` under `@theme` — there is no `tailwind.config.js`). The app is a single auth screen: `src/App.tsx` layers `NightSceneBackground` (fixed, `-z-10`) behind a centered `AuthCard`.

- `src/components/background/NightSceneBackground.tsx` — the animated pixel-art scene (night skyline, moon, twinkling stars, lampposts with reflected glow, shimmering water). Pure SVG (`shapeRendering="crispEdges"` for the pixel look) plus a few absolutely-positioned HTML spans for glow/firefly effects; CSS keyframes for the animations live in `src/index.css` (`.animate-twinkle`, `.animate-lantern`, `.animate-water`, `.animate-float-up`) and respect `prefers-reduced-motion`. Star positions are generated once via a seeded PRNG in `starfield.ts` so the field doesn't reshuffle on re-render.
- `src/components/auth/` — `AuthCard` (glassmorphism container, owns which tab is active), `TabSwitcher` (Connexion/Inscription pill toggle), `LoginForm`, `RegisterForm`. Each form owns its own local state/validation and calls an optional `onSubmit` prop — there is no backend wired up yet, so submit handlers are no-ops unless a parent passes one in.
- `src/components/ui/` — presentational primitives shared by both forms: `TextField`, `PasswordField` (show/hide toggle), `Checkbox`, `Button`.

Custom Tailwind theme tokens (`--font-pixel`, `--color-lantern`, `--color-water`, `--color-ember`, `--color-mercenary`) are declared in the `@theme` block at the top of `src/index.css`; use those color names (`bg-lantern`, `text-lantern-glow`, etc.) instead of hardcoding hex values for anything scene/brand related.

## Notes

- The `claude/pixellab-mcp-integration-vajrla` branch name refers to a PixelLab (pixellab.ai) MCP server registered locally for asset generation (`claude mcp add pixellab ...`). That registration is session/CLI config, not part of this repo, and is not currently reachable from Claude Code Remote sessions here (no `pixellab` connector at the claude.ai org level, and the sandbox's network policy blocks `api.pixellab.ai` outbound). The background scene is hand-coded SVG/CSS as a stand-in; swap it for real PixelLab-generated art once the connector is properly available.
- The Google Fonts `@import` in `src/index.css` (for `Press Start 2P`) fails in network-restricted sandboxes (`fonts.googleapis.com` blocked) and silently falls back to the system sans stack — this is expected to work in normal deployments/browsers.
