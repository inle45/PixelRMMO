const impactModules = import.meta.glob("../assets/dungeon/vfx/impact-burst-*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const dissolveModules = import.meta.glob("../assets/dungeon/vfx/death-dissolve-*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function collect(modules: Record<string, string>, prefix: string): string[] {
  const frames: string[] = [];
  for (let i = 0; ; i++) {
    const entry = Object.entries(modules).find(([path]) => path.endsWith(`/${prefix}-${i}.png`));
    if (!entry) break;
    frames.push(entry[1]);
  }
  return frames;
}

/** Generic white spark-burst loop, played over a combatant on a landed hit, tinted per damage type in CSS. */
export const IMPACT_BURST_FRAMES = collect(impactModules, "impact-burst");

/** Smoke/dust dissolve loop, played over a combatant the instant it's knocked out. */
export const DEATH_DISSOLVE_FRAMES = collect(dissolveModules, "death-dissolve");

export interface ImpactBurst {
  id: string;
  color: string;
}

export interface DeathBurst {
  id: string;
}
