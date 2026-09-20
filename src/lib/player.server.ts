import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import {
  ENERGY_MAX,
  LIFE_MAX,
  NERVE_MAX,
  levelFromXp,
  regenEnergy,
  regenLife,
  regenNerve,
} from "./game/regen";

export type Supa = SupabaseClient<Database>;
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/** Loads the player, creating the row on first visit, and settles all regen timers. */
export async function loadPlayer(
  supabase: Supa,
  userId: string,
  fallbackName: string,
): Promise<ProfileRow> {
  const existing = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing.error) throw new Error(existing.error.message);

  let profile = existing.data;

  if (!profile) {
    const created = await supabase
      .from("profiles")
      .insert({ user_id: userId, name: fallbackName })
      .select("*")
      .single();
    if (created.error) throw new Error(created.error.message);
    profile = created.data;
  }

  const now = Date.now();
  const energy = regenEnergy(profile.energy, profile.energy_updated_at, now);
  const nerve = regenNerve(profile.nerve, profile.nerve_updated_at, now);
  const life = regenLife(profile.life, profile.life_updated_at, now);
  const level = levelFromXp(profile.xp);

  const patch: Partial<ProfileRow> = {};
  if (energy.value !== profile.energy) {
    patch.energy = energy.value;
    patch.energy_updated_at = energy.updatedAt;
  }
  if (nerve.value !== profile.nerve) {
    patch.nerve = nerve.value;
    patch.nerve_updated_at = nerve.updatedAt;
  }
  if (life.value !== profile.life) {
    patch.life = life.value;
    patch.life_updated_at = life.updatedAt;
  }
  if (level !== profile.level) patch.level = level;

  if (Object.keys(patch).length > 0) {
    const updated = await supabase
      .from("profiles")
      .update(patch)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (updated.error) throw new Error(updated.error.message);
    profile = updated.data;
  }

  return profile;
}

export function spendEnergy(profile: ProfileRow, amount: number) {
  if (profile.energy < amount) {
    throw new Error(`Not enough energy — you need ${amount}.`);
  }
  return {
    energy: profile.energy - amount,
    energy_updated_at:
      profile.energy >= ENERGY_MAX ? new Date().toISOString() : profile.energy_updated_at,
  };
}

export function spendNerve(profile: ProfileRow, amount: number) {
  if (profile.nerve < amount) {
    throw new Error(`Not enough nerve — you need ${amount}.`);
  }
  return {
    nerve: profile.nerve - amount,
    nerve_updated_at:
      profile.nerve >= NERVE_MAX ? new Date().toISOString() : profile.nerve_updated_at,
  };
}

export function loseLife(profile: ProfileRow, amount: number) {
  return {
    life: Math.max(0, profile.life - amount),
    life_updated_at:
      profile.life >= LIFE_MAX ? new Date().toISOString() : profile.life_updated_at,
  };
}

export function isHospitalised(profile: ProfileRow, now = Date.now()): boolean {
  return !!profile.hospital_until && new Date(profile.hospital_until).getTime() > now;
}

export function combatStats(profile: {
  strength: number;
  defense: number;
  speed: number;
  dexterity: number;
}) {
  return {
    strength: profile.strength,
    defense: profile.defense,
    speed: profile.speed,
    dexterity: profile.dexterity,
  };
}
