import type { CardDef, Requirements } from "./types";

export interface PlayerStatsLike {
  strength: number;
  defense: number;
  speed: number;
  dexterity: number;
  level: number;
}

export const STAT_LABELS: Record<string, string> = {
  strength: "Strength",
  defense: "Defence",
  speed: "Speed",
  dexterity: "Dexterity",
  level: "Level",
};

export function requirementEntries(requirements: Requirements) {
  return Object.entries(requirements ?? {}) as [keyof Requirements, number][];
}

export function unmetRequirements(
  requirements: Requirements,
  player: PlayerStatsLike,
): string[] {
  return requirementEntries(requirements)
    .filter(([key, value]) => (player[key] ?? 0) < value)
    .map(([key, value]) => `${STAT_LABELS[key] ?? key} ${value}`);
}

export function meetsRequirements(
  requirements: Requirements,
  player: PlayerStatsLike,
): boolean {
  return unmetRequirements(requirements, player).length === 0;
}

export function describeRequirements(requirements: Requirements): string {
  const entries = requirementEntries(requirements);
  if (entries.length === 0) return "No requirements";
  return entries.map(([key, value]) => `${STAT_LABELS[key] ?? key} ${value}`).join(" · ");
}

export function cardTier(card: CardDef): number {
  const entries = requirementEntries(card.requirements);
  if (entries.length === 0) return 1;
  const highest = Math.max(...entries.filter(([k]) => k !== "level").map(([, v]) => v), 0);
  if (highest >= 700) return 5;
  if (highest >= 350) return 4;
  if (highest >= 150) return 3;
  return 2;
}
