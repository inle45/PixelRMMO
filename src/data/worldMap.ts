import mapNodesRaw from "../config/mapNodes.json";
import storyRaw from "../config/storyData.json";
import skullIcon from "../assets/icons/items/skull.png";
import castleIcon from "../assets/icons/dungeon/castle.png";
import campNavIcon from "../assets/icons/nav/anim/camp-0.png";
import heroMarker from "../assets/map/hero-marker.png";
import talkIcon from "../assets/icons/map/talk-bubble.png";
import caveIcon from "../assets/bestiary/portraits/myconid_guard.png";
import eclaireurPortrait from "../assets/map/npc/eclaireur.png";
import eruditPortrait from "../assets/map/npc/erudit.png";
import capitainePortrait from "../assets/map/npc/capitaine.png";

export type NodeKind = "camp" | "dungeon" | "city" | "volcano" | "cave";
export type NodeStatus = "accessible" | "locked" | "current";

export interface BiomeDef {
  index: number;
  id: string;
  name: string;
  /** Approximate vertical position on the continent (0 = far north, 100 = far south) — used only
   * for the fog-of-war's progress reasoning, not for pixel-precise placement. */
  yBand: number;
}

export interface MapNodeDef {
  id: string;
  biomeIndex: number;
  kind: NodeKind;
  name: string;
  levelRecommended: number;
  /** Percentage position within the (square) map image. */
  x: number;
  y: number;
  connectsTo: string[];
  dialogueId: string | null;
}

interface MapNodesFile {
  biomes: BiomeDef[];
  nodes: MapNodeDef[];
}

export interface DialogueDef {
  id: string;
  nodeId: string;
  npcName: string;
  lines: string[];
}

const data = mapNodesRaw as MapNodesFile;
export const BIOMES: BiomeDef[] = data.biomes;
export const MAP_NODES: MapNodeDef[] = data.nodes;
export const NODE_BY_ID: Record<string, MapNodeDef> = Object.fromEntries(MAP_NODES.map((n) => [n.id, n]));

export const DIALOGUES: DialogueDef[] = storyRaw as DialogueDef[];
export const DIALOGUE_BY_NODE: Record<string, DialogueDef> = Object.fromEntries(DIALOGUES.map((d) => [d.nodeId, d]));

const NPC_PORTRAIT_BY_DIALOGUE: Record<string, string> = {
  eclaireur: eclaireurPortrait,
  erudit: eruditPortrait,
  capitaine: capitainePortrait,
};

export function getDialoguePortrait(dialogueId: string): string {
  return NPC_PORTRAIT_BY_DIALOGUE[dialogueId] ?? "";
}

/** Reuses existing icons rather than commissioning new ones per node kind: the skull already IS
 * this game's "Donjon" glyph (DungeonHub/DUNGEONS use the same file), and the castle icon already
 * exists for the "return to camp" buttons. The volcano gets no icon at all — it's a distant, mostly
 * fogged silhouette, not a readable card, so a pulsing glow ring carries it instead. */
export const NODE_ICON_BY_KIND: Record<NodeKind, string> = {
  camp: campNavIcon,
  dungeon: skullIcon,
  city: castleIcon,
  volcano: "",
  // Reuses the Bestiaire's own mushroom-guardian portrait as the map glyph rather than a new
  // generation — the node IS that creature's lair, so it is the correct picture for it.
  cave: caveIcon,
};

export const talkBubbleIcon = talkIcon;
export const heroMarkerIcon = heroMarker;

/** Biomes at or before this index sit within the starting valley — matches the nodes that ship
 * pre-unlocked (camp/crypt/city all sit at biome ≤ 6). Everything north of it stays under the fog
 * for a future content drop, including the volcano's distant silhouette. */
export const REVEALED_BIOME_CEILING = 6;

/** Lives in /public rather than src/assets: at 512x512 this is by far the largest single asset in
 * the app, and a plain public URL avoids Vite base64-inlining or hash-churn on an image nothing else
 * imports as a module — every other scene background in the app is small enough that the normal
 * src/assets + import.meta.glob convention doesn't have this tradeoff. */
export const WORLD_MAP_BG = "/assets/maps/world_map_main.png";

/* ------------------------------------------------------------------------ vfx sprites */

const vfxModules = import.meta.glob("../assets/map/vfx/*.png", { eager: true, import: "default" }) as Record<
  string,
  string
>;

/** Collects `{prefix}-0.png, {prefix}-1.png, ...` in order, stopping at the first gap — the same
 * glob-by-numbered-suffix convention as classes.ts/bestiary.ts/campScene.ts. */
function getFrames(modules: Record<string, string>, prefix: string): string[] {
  const frames: string[] = [];
  for (let i = 0; ; i++) {
    const entry = Object.entries(modules).find(([path]) => path.endsWith(`/${prefix}-${i}.png`));
    if (!entry) break;
    frames.push(entry[1]);
  }
  return frames;
}

export const MIST_FRAMES = getFrames(vfxModules, "mist");
export const BAT_FRAMES = getFrames(vfxModules, "bat");
export const BIRD_FRAMES = getFrames(vfxModules, "bird-fly");
export const SMOKE_FRAMES = getFrames(vfxModules, "smoke");

/* ------------------------------------------------------------------------ reused camp props */

/** The Campement and Cité nodes reuse the Camp diorama's own campfire/banner loops instead of
 * commissioning near-duplicate art at a different scale — same pixel-art style throughout, and a
 * map-icon-scale prop is forgiving of moderate scale reuse (the same call already made for skill
 * icons reusing the Types & Météo badges). */
const campPropModules = import.meta.glob("../assets/camp/props/*.png", { eager: true, import: "default" }) as Record<
  string,
  string
>;

export const CAMPFIRE_FRAMES = getFrames(campPropModules, "campfire");
export const BANNER_FRAMES = getFrames(campPropModules, "banner");

/* ------------------------------------------------------------------------ wildlife */

const wildlifeModules = import.meta.glob("../assets/map/wildlife/*.png", { eager: true, import: "default" }) as Record<
  string,
  string
>;

export const DEER_FRAMES = getFrames(wildlifeModules, "deer");
