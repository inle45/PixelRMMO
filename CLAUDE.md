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

React 19 + TypeScript + Vite, styled with Tailwind CSS v4 (via `@tailwindcss/vite`, config lives in `src/index.css` under `@theme` — there is no `tailwind.config.js`). `src/App.tsx` layers `NightSceneBackground` (fixed, `-z-10`) behind a centered `<main>` and switches between two screens via local `useState<Screen>` (`"auth" | "character-select"`) — no router. Submitting either auth form (no backend, so this is purely a demo transition) flips to the character-select screen.

- `src/components/background/NightSceneBackground.tsx` — the animated pixel-art scene (night skyline, moon, twinkling stars, lampposts with reflected glow, shimmering water). Pure SVG (`shapeRendering="crispEdges"` for the pixel look) plus a few absolutely-positioned HTML spans for glow/firefly effects; CSS keyframes for the animations live in `src/index.css` (`.animate-twinkle`, `.animate-lantern`, `.animate-water`, `.animate-float-up`) and respect `prefers-reduced-motion`. Star positions are generated once via a seeded PRNG in `starfield.ts` so the field doesn't reshuffle on re-render. A PixelLab-sprite version of this scene was tried and reverted — the generated building sprites didn't share a consistent scale/style with each other, so this stays hand-coded SVG/CSS. Don't retry that without solving the style-consistency problem first (e.g. `style_character_id`/reference-image matching isn't available for `create_map_object`).
- `src/components/auth/` — `AuthCard` (glassmorphism container, owns which tab is active, takes an `onAuthenticated` callback), `TabSwitcher` (Connexion/Inscription pill toggle), `LoginForm`, `RegisterForm`. Each form owns its own local state/validation and calls an optional `onSubmit` prop.
- `src/components/character/` — the character-select screen. `CharacterSelectScreen` owns `gender`/`selected` state (lazily initialized from `localStorage["pixelrmmo:hero"]`, no effect) and renders `GenderToggle` (♂/♀ pill, same sliding-pill pattern as `TabSwitcher`) plus a responsive grid of `ClassCard`. Class data (stats, passive, sprite imports, per-role color theme) lives in `src/data/classes.ts`, one `ClassDefinition` per class with a `sprites: Record<Gender, string>` map — confirming a hero persists `{classId, gender}` to `localStorage`.
- `src/components/ui/` — presentational primitives: `TextField`, `PasswordField` (show/hide toggle), `Checkbox`, `Button`, `StatBar` (labeled gauge used by `ClassCard`).
- `src/assets/characters/*.png` — 6 PixelLab-generated character sprites (south-facing rotation, transparent background), one per class×gender pair. Regenerated via `mcp__PixelLab__create_character` (mode `standard`, `view: "side"`, same detail/shading/outline/proportions params across all 6 for a consistent look) — unlike the background scene, isolated character portraits compose fine since each card only shows one sprite at a time with no shared-scene blending needed.

Custom Tailwind theme tokens (`--font-pixel`, `--color-lantern`, `--color-water`, `--color-ember`, `--color-mercenary`) are declared in the `@theme` block at the top of `src/index.css`; use those color names (`bg-lantern`, `text-lantern-glow`, etc.) instead of hardcoding hex values for anything scene/brand related. The three class-role accent colors (Tank = blue, DPS = emerald, Burst = violet) are plain Tailwind palette classes defined per-class in `classes.ts`, not theme tokens.

## Notes

- The `claude/pixellab-mcp-integration-vajrla` branch name refers to a PixelLab (pixellab.ai) MCP server registered for asset generation; it's connected and reachable from this environment. Use `mcp__PixelLab__create_character` for character/portrait sprites (works well) — see the caution above before using `create_map_object` for anything that needs to visually blend into one composed scene.
- The Google Fonts `@import` in `src/index.css` (for `Press Start 2P`) fails in network-restricted sandboxes (`fonts.googleapis.com` blocked) and silently falls back to the system sans stack — this is expected to work in normal deployments/browsers.
