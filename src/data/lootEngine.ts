import type { MonsterDef } from "./bestiary";
import { MATERIAL_BY_ID, type MaterialCategory } from "./materials";
import type { RarityId } from "./rarity";

export interface LootResult {
  ecus: number;
  materials: Record<string, number>;
}

function rollMonsterLoot(monster: MonsterDef): LootResult {
  let ecus = 0;
  const materials: Record<string, number> = {};
  for (const drop of monster.drops) {
    if (Math.random() * 100 >= drop.chance) continue;
    if (drop.currency) {
      const min = drop.min ?? 0;
      const max = drop.max ?? min;
      ecus += Math.round(min + Math.random() * (max - min));
    } else if (drop.materialId) {
      materials[drop.materialId] = (materials[drop.materialId] ?? 0) + 1;
    }
  }
  return { ecus, materials };
}

/** Independent per-drop chance rolls (each bestiary.json drop entry already carries its own %), summed across every defeated monster. */
export function rollDungeonLoot(defeatedMonsters: MonsterDef[]): LootResult {
  let ecus = 0;
  const materials: Record<string, number> = {};
  for (const m of defeatedMonsters) {
    const rolled = rollMonsterLoot(m);
    ecus += rolled.ecus;
    for (const [id, count] of Object.entries(rolled.materials)) {
      materials[id] = (materials[id] ?? 0) + count;
    }
  }
  return { ecus, materials };
}

/** Flat power proxy (HP/4 + ATK) — a first full clear should land a hero close to a level-up. */
export function computeXpReward(defeatedMonsters: MonsterDef[]): number {
  return defeatedMonsters.reduce((total, m) => total + Math.round(m.stats.hp / 4 + m.stats.atk), 0);
}

export interface LootCard {
  materialId: string;
  name: string;
  icon: string;
  rarity: RarityId;
  category: MaterialCategory;
  count: number;
}

export function toLootCards(materials: Record<string, number>): LootCard[] {
  return Object.entries(materials)
    .map(([id, count]) => {
      const mat = MATERIAL_BY_ID[id];
      return mat ? { materialId: id, name: mat.name, icon: mat.icon, rarity: mat.rarity, category: mat.category, count } : null;
    })
    .filter((c): c is LootCard => !!c)
    .sort((a, b) => b.count - a.count);
}
