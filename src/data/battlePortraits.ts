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
