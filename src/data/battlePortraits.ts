import type { ClassId, Gender } from "./classes";

const modules = import.meta.glob("../assets/characters/battle/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function get(prefix: string): string {
  const entry = Object.entries(modules).find(([path]) => path.endsWith(`/${prefix}.png`));
  return entry?.[1] ?? "";
}

/** Back-view "weapon raised" battle portraits — distinct from classes.ts's side-view character-select sprites. */
export function getBattlePortrait(classId: ClassId, gender: Gender): string {
  return get(`${classId}-${gender}`);
}

const idleFrameModules = import.meta.glob("../assets/characters/battle/idle/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

/** Collects the numbered idle-breathing frames (starting at 0) for a `{class}-{gender}` back-view portrait. */
export function getBattleIdleFrames(classId: ClassId, gender: Gender): string[] {
  const prefix = `${classId}-${gender}`;
  const frames: string[] = [];
  for (let i = 0; ; i++) {
    const entry = Object.entries(idleFrameModules).find(([path]) => path.endsWith(`/${prefix}-${i}.png`));
    if (!entry) break;
    frames.push(entry[1]);
  }
  return frames;
}

const attackFrameModules = import.meta.glob("../assets/characters/battle/attack/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

/** Collects the numbered attack frames (starting at 1) for a `{class}-{gender}` back-view portrait. */
export function getBattleAttackFrames(classId: ClassId, gender: Gender): string[] {
  const prefix = `${classId}-${gender}`;
  const frames: string[] = [];
  for (let i = 1; i <= 8; i++) {
    const entry = Object.entries(attackFrameModules).find(([path]) => path.endsWith(`/${prefix}-${i}.png`));
    if (!entry) break;
    frames.push(entry[1]);
  }
  return frames;
}
