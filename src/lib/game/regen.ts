/** Timer maths shared by the server (authoritative) and the UI (live countdowns). */

export const ENERGY_MAX = 100;
export const ENERGY_PER_TICK = 5;
export const ENERGY_TICK_MS = 10 * 60 * 1000;

export const NERVE_MAX = 25;
export const NERVE_PER_TICK = 1;
export const NERVE_TICK_MS = 5 * 60 * 1000;

export const LIFE_MAX = 100;
export const LIFE_FULL_MS = 30 * 60 * 1000;
export const LIFE_TICK_MS = Math.round(LIFE_FULL_MS / LIFE_MAX);
export const LIFE_PER_TICK = 1;

export interface RegenResult {
  value: number;
  updatedAt: string;
  msToNext: number | null;
}

export function regen(
  current: number,
  max: number,
  updatedAtIso: string,
  perTick: number,
  tickMs: number,
  now: number = Date.now(),
): RegenResult {
  const updatedAt = new Date(updatedAtIso).getTime();
  const safeUpdatedAt = Number.isFinite(updatedAt) ? updatedAt : now;

  if (current >= max) {
    return { value: max, updatedAt: new Date(now).toISOString(), msToNext: null };
  }

  const elapsed = Math.max(0, now - safeUpdatedAt);
  const ticks = Math.floor(elapsed / tickMs);
  const gained = ticks * perTick;
  const value = Math.min(max, current + gained);
  const newUpdatedAt = safeUpdatedAt + ticks * tickMs;
  const msToNext = value >= max ? null : tickMs - (now - newUpdatedAt);

  return {
    value,
    updatedAt: new Date(newUpdatedAt).toISOString(),
    msToNext: msToNext === null ? null : Math.max(0, msToNext),
  };
}

export function regenEnergy(current: number, updatedAt: string, now?: number) {
  return regen(current, ENERGY_MAX, updatedAt, ENERGY_PER_TICK, ENERGY_TICK_MS, now);
}

export function regenNerve(current: number, updatedAt: string, now?: number) {
  return regen(current, NERVE_MAX, updatedAt, NERVE_PER_TICK, NERVE_TICK_MS, now);
}

export function regenLife(current: number, updatedAt: string, now?: number) {
  return regen(current, LIFE_MAX, updatedAt, LIFE_PER_TICK, LIFE_TICK_MS, now);
}

export function xpForLevel(level: number): number {
  return Math.round(120 * Math.pow(level, 1.55));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (level < 60 && xp >= xpForLevel(level)) level += 1;
  return level;
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "ready";
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}
