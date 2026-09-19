export type CardType = "minion" | "spell" | "weapon";
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type StatKey = "strength" | "defense" | "speed" | "dexterity";

export type EffectTarget =
  | "any"
  | "hero"
  | "enemy_hero"
  | "enemy_minions"
  | "friendly_minions";

export type CardEffect =
  | { kind: "damage"; amount: number; target: EffectTarget }
  | { kind: "heal"; amount: number; target: EffectTarget }
  | { kind: "buff"; attack: number; health: number; target: EffectTarget }
  | { kind: "draw"; amount: number }
  | { kind: "aoe"; amount: number; target: EffectTarget }
  | { kind: "multi"; effects: CardEffect[] };

export interface Requirements {
  strength?: number;
  defense?: number;
  speed?: number;
  dexterity?: number;
  level?: number;
}

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  cost: number;
  attack: number;
  health: number;
  durability: number;
  keywords: string[];
  effect: CardEffect | null;
  rarity: Rarity;
  price: number;
  requirements: Requirements;
  flavor: string | null;
  art_key: string;
  art_url: string | null;
}

export type CardIndex = Record<string, CardDef>;

export interface CombatStats {
  strength: number;
  defense: number;
  speed: number;
  dexterity: number;
}

export interface MinionState {
  uid: string;
  cardId: string;
  name: string;
  attack: number;
  health: number;
  maxHealth: number;
  keywords: string[];
  canAttack: boolean;
  divineShield: boolean;
}

export interface WeaponState {
  cardId: string;
  name: string;
  attack: number;
  durability: number;
}

export type SideKey = "player" | "enemy";

export interface SideState {
  key: SideKey;
  name: string;
  life: number;
  maxLife: number;
  armor: number;
  mana: number;
  maxMana: number;
  deck: string[];
  hand: string[];
  board: MinionState[];
  weapon: WeaponState | null;
  weaponBonus: number;
  dodgeChance: number;
  dodgeUsed: boolean;
  heroAttacked: boolean;
  fatigue: number;
  stats: CombatStats;
}

export interface BattleState {
  player: SideState;
  enemy: SideState;
  turn: SideKey;
  turnNumber: number;
  log: string[];
  status: "active" | "won" | "lost";
  seed: number;
  version: 1;
}

export type TargetRef =
  | { kind: "hero"; side: SideKey }
  | { kind: "minion"; side: SideKey; uid: string };

export type BattleAction =
  | { type: "play_card"; handIndex: number; target?: TargetRef }
  | { type: "attack"; attacker: string; target: TargetRef }
  | { type: "end_turn" };

export const BOARD_LIMIT = 7;
export const HAND_LIMIT = 8;
export const MANA_LIMIT = 10;
export const HERO_LIFE = 30;
