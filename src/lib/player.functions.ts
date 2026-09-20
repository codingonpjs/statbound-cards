import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { levelFromXp, xpForLevel } from "./game/regen";
import {
  isHospitalised,
  loadPlayer,
  spendEnergy,
  spendNerve,
} from "./player.server";

function displayName(claims: Record<string, unknown>): string {
  const email = typeof claims["email"] === "string" ? (claims["email"] as string) : "";
  return email.split("@")[0] || "Newcomer";
}

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await loadPlayer(context.supabase, context.userId, displayName(context.claims));
    return {
      profile,
      nextLevelXp: xpForLevel(profile.level),
      hospitalised: isHospitalised(profile),
    };
  });

const trainSchema = z.object({
  stat: z.enum(["strength", "defense", "speed", "dexterity"]),
  energy: z.union([z.literal(5), z.literal(15), z.literal(30)]),
});

export const train = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => trainSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profile = await loadPlayer(supabase, userId, displayName(context.claims));

    if (isHospitalised(profile)) throw new Error("You are in hospital and cannot train.");

    const energyPatch = spendEnergy(profile, data.energy);
    const gain = Math.max(1, Math.round(data.energy * (0.9 + profile.level * 0.03)));
    const current = profile[data.stat];

    const updated = await supabase
      .from("profiles")
      .update({ ...energyPatch, [data.stat]: current + gain })
      .eq("user_id", userId)
      .select("*")
      .single();
    if (updated.error) throw new Error(updated.error.message);

    return { profile: updated.data, gain, stat: data.stat };
  });

export const listCrimes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("crimes")
      .select("*")
      .order("nerve_cost", { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  });

export const commitCrime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ crimeId: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profile = await loadPlayer(supabase, userId, displayName(context.claims));
    if (isHospitalised(profile)) throw new Error("You are in hospital and cannot work.");

    const crimeQuery = await supabase
      .from("crimes")
      .select("*")
      .eq("id", data.crimeId)
      .maybeSingle();
    if (crimeQuery.error) throw new Error(crimeQuery.error.message);
    const crime = crimeQuery.data;
    if (!crime) throw new Error("Unknown job.");

    const nervePatch = spendNerve(profile, crime.nerve_cost);

    const statValue = profile[crime.stat as "strength" | "defense" | "speed" | "dexterity"] ?? 0;
    const chance = Math.min(
      0.95,
      crime.base_success + statValue / crime.stat_divisor / 100 + profile.level * 0.004,
    );
    const success = Math.random() < chance;

    const patch: Record<string, unknown> = { ...nervePatch };
    let cash = 0;
    let xp = 0;
    let hospitalMinutes = 0;

    if (success) {
      cash = Math.round(crime.cash_min + Math.random() * (crime.cash_max - crime.cash_min));
      xp = crime.xp;
      patch["cash"] = profile.cash + cash;
      patch["xp"] = profile.xp + xp;
      patch["level"] = levelFromXp(profile.xp + xp);
    } else if (crime.fail_hospital_minutes > 0) {
      hospitalMinutes = crime.fail_hospital_minutes;
      patch["hospital_until"] = new Date(Date.now() + hospitalMinutes * 60_000).toISOString();
      patch["life"] = Math.max(5, Math.round(profile.life * 0.4));
      patch["life_updated_at"] = new Date().toISOString();
    }

    const updated = await supabase
      .from("profiles")
      .update(patch)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (updated.error) throw new Error(updated.error.message);

    await supabase.from("crime_log").insert({
      user_id: userId,
      crime_id: crime.id,
      success,
      cash,
      xp,
    });

    return {
      profile: updated.data,
      success,
      cash,
      xp,
      hospitalMinutes,
      chance: Math.round(chance * 100),
      crimeName: crime.name,
    };
  });
