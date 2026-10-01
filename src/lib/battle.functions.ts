import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runEnemyTurn } from "./game/ai";
import { applyPlayerAction, cardsIndex, createBattle } from "./game/engine";
import type { BattleAction, BattleState, CardDef } from "./game/types";
import { levelFromXp } from "./game/regen";
import {
  combatStats,
  isHospitalised,
  loadPlayer,
  loseLife,
  spendEnergy,
  type Supa,
} from "./player.server";

const NPC_ENERGY_COST = 10;
const PVP_ENERGY_COST = 15;

function displayName(claims: Record<string, unknown>): string {
  const email = typeof claims["email"] === "string" ? (claims["email"] as string) : "";
  return email.split("@")[0] || "Newcomer";
}

const targetSchema = z.union([
  z.object({ kind: z.literal("hero"), side: z.enum(["player", "enemy"]) }),
  z.object({
    kind: z.literal("minion"),
    side: z.enum(["player", "enemy"]),
    uid: z.string(),
  }),
]);

const actionSchema = z.union([
  z.object({
    type: z.literal("play_card"),
    handIndex: z.number().int().min(0).max(9),
    target: targetSchema.optional(),
  }),
  z.object({ type: z.literal("attack"), attacker: z.string(), target: targetSchema }),
  z.object({ type: z.literal("end_turn") }),
]);

async function loadCards(supabase: Supa): Promise<CardDef[]> {
  const { data, error } = await supabase.from("cards").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CardDef[];
}

export const listOpponents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const profile = await loadPlayer(supabase, userId, displayName(context.claims));

    const [npcQuery, deckQuery] = await Promise.all([
      supabase.from("npcs").select("*").order("tier", { ascending: true }),
      supabase.from("decks").select("user_id").neq("user_id", userId).limit(40),
    ]);
    if (npcQuery.error) throw new Error(npcQuery.error.message);
    if (deckQuery.error) throw new Error(deckQuery.error.message);

    const rivalIds = (deckQuery.data ?? []).map((row) => row.user_id);
    let rivals: {
      user_id: string;
      name: string;
      level: number;
      wins: number;
      losses: number;
    }[] = [];

    if (rivalIds.length > 0) {
      const rivalQuery = await supabase
        .from("profiles")
        .select("user_id,name,level,wins,losses")
        .in("user_id", rivalIds)
        .order("level", { ascending: true });
      if (rivalQuery.error) throw new Error(rivalQuery.error.message);
      rivals = rivalQuery.data ?? [];
    }

    const myDeck = await supabase
      .from("decks")
      .select("card_ids")
      .eq("user_id", userId)
      .maybeSingle();
    if (myDeck.error) throw new Error(myDeck.error.message);

    return {
      profile,
      npcs: npcQuery.data ?? [],
      rivals,
      hasDeck: (myDeck.data?.card_ids?.length ?? 0) === 20,
      npcEnergyCost: NPC_ENERGY_COST,
      pvpEnergyCost: PVP_ENERGY_COST,
      hospitalised: isHospitalised(profile),
    };
  });

export const startBattle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ npcId: z.string().optional(), defenderId: z.string().uuid().optional() })
      .refine((value) => !!value.npcId !== !!value.defenderId, {
        message: "Pick exactly one opponent.",
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profile = await loadPlayer(supabase, userId, displayName(context.claims));
    if (isHospitalised(profile)) throw new Error("You are in hospital and cannot fight.");

    const deckQuery = await supabase
      .from("decks")
      .select("card_ids")
      .eq("user_id", userId)
      .maybeSingle();
    if (deckQuery.error) throw new Error(deckQuery.error.message);
    const playerDeck = deckQuery.data?.card_ids ?? [];
    if (playerDeck.length !== 20) throw new Error("Build a 20-card deck before you fight.");

    const openQuery = await supabase
      .from("battles")
      .select("id")
      .eq("attacker_id", userId)
      .eq("status", "active")
      .limit(1);
    if (openQuery.error) throw new Error(openQuery.error.message);
    if (openQuery.data && openQuery.data.length > 0) {
      return { battleId: openQuery.data[0]!.id, resumed: true };
    }

    let enemyName: string;
    let enemyDeck: string[];
    let enemyStats: { strength: number; defense: number; speed: number; dexterity: number };
    let energyCost: number;

    if (data.npcId) {
      const npc = await supabase.from("npcs").select("*").eq("id", data.npcId).maybeSingle();
      if (npc.error) throw new Error(npc.error.message);
      if (!npc.data) throw new Error("Unknown opponent.");
      enemyName = npc.data.name;
      enemyDeck = npc.data.deck;
      enemyStats = combatStats(npc.data);
      energyCost = NPC_ENERGY_COST;
    } else {
      const rival = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", data.defenderId!)
        .maybeSingle();
      if (rival.error) throw new Error(rival.error.message);
      if (!rival.data) throw new Error("That brawler has left the tavern.");
      const rivalDeck = await supabase
        .from("decks")
        .select("card_ids")
        .eq("user_id", data.defenderId!)
        .maybeSingle();
      if (rivalDeck.error) throw new Error(rivalDeck.error.message);
      if ((rivalDeck.data?.card_ids?.length ?? 0) !== 20) {
        throw new Error("That brawler has no deck saved.");
      }
      enemyName = rival.data.name;
      enemyDeck = rivalDeck.data!.card_ids;
      enemyStats = combatStats(rival.data);
      energyCost = PVP_ENERGY_COST;
    }

    const energyPatch = spendEnergy(profile, energyCost);
    const updated = await supabase
      .from("profiles")
      .update(energyPatch)
      .eq("user_id", userId)
      .select("user_id")
      .single();
    if (updated.error) throw new Error(updated.error.message);

    let state = createBattle({
      playerName: profile.name,
      enemyName,
      playerDeck,
      enemyDeck,
      playerStats: combatStats(profile),
      enemyStats,
    });

    // If the opponent is faster they take the opening turn immediately.
    if (state.turn === "enemy") {
      state = runEnemyTurn(state, cardsIndex(await loadCards(supabase)));
    }

    const created = await supabase
      .from("battles")
      .insert({
        attacker_id: userId,
        npc_id: data.npcId ?? null,
        defender_id: data.defenderId ?? null,
        state: state as unknown as never,
        status: "active",
      })
      .select("id")
      .single();
    if (created.error) throw new Error(created.error.message);

    return { battleId: created.data.id, resumed: false };
  });

export const getBattle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ battleId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const battle = await supabase
      .from("battles")
      .select("*")
      .eq("id", data.battleId)
      .maybeSingle();
    if (battle.error) throw new Error(battle.error.message);
    if (!battle.data) throw new Error("That battle no longer exists.");

    const [cards, art] = await Promise.all([
      loadCards(supabase),
      supabase
        .from("player_cards")
        .select("card_id,custom_art_url")
        .eq("user_id", context.userId),
    ]);
    if (art.error) throw new Error(art.error.message);

    return {
      battle: battle.data,
      state: battle.data.state as unknown as BattleState,
      cards,
      customArt: Object.fromEntries(
        (art.data ?? [])
          .filter((row) => row.custom_art_url)
          .map((row) => [row.card_id, row.custom_art_url as string]),
      ),
      reward: null as null | { cash: number; xp: number; hospitalMinutes: number },
    };
  });

export const playAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ battleId: z.string().uuid(), action: actionSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const battleQuery = await supabase
      .from("battles")
      .select("*")
      .eq("id", data.battleId)
      .eq("attacker_id", userId)
      .maybeSingle();
    if (battleQuery.error) throw new Error(battleQuery.error.message);
    const battle = battleQuery.data;
    if (!battle) throw new Error("That battle no longer exists.");
    if (battle.status !== "active") throw new Error("This battle is already finished.");

    const cards = await loadCards(supabase);
    const index = cardsIndex(cards);
    let state = battle.state as unknown as BattleState;

    state = applyPlayerAction(state, index, data.action as BattleAction);

    if (state.status === "active" && state.turn === "enemy") {
      state = runEnemyTurn(state, index);
    }

    let reward: { cash: number; xp: number; hospitalMinutes: number } | null = null;

    if (state.status !== "active") {
      const profile = await loadPlayer(supabase, userId, "Newcomer");
      const patch: Record<string, unknown> = {};

      if (state.status === "won") {
        let cash = 0;
        let xp = 0;
        if (battle.npc_id) {
          const npc = await supabase
            .from("npcs")
            .select("reward_cash,reward_xp")
            .eq("id", battle.npc_id)
            .maybeSingle();
          cash = npc.data?.reward_cash ?? 200;
          xp = npc.data?.reward_xp ?? 20;
        } else {
          cash = 250 + profile.level * 60;
          xp = 35 + profile.level * 3;
        }
        patch["cash"] = profile.cash + cash;
        patch["xp"] = profile.xp + xp;
        patch["level"] = levelFromXp(profile.xp + xp);
        patch["wins"] = profile.wins + 1;
        Object.assign(patch, loseLife(profile, Math.round(profile.life * 0.25)));
        reward = { cash, xp, hospitalMinutes: 0 };
      } else {
        let hospitalMinutes = 10;
        if (battle.npc_id) {
          const npc = await supabase
            .from("npcs")
            .select("hospital_minutes")
            .eq("id", battle.npc_id)
            .maybeSingle();
          hospitalMinutes = npc.data?.hospital_minutes ?? 10;
        } else {
          hospitalMinutes = 12;
        }
        patch["losses"] = profile.losses + 1;
        patch["hospital_until"] = new Date(Date.now() + hospitalMinutes * 60_000).toISOString();
        patch["life"] = 0;
        patch["life_updated_at"] = new Date().toISOString();
        reward = { cash: 0, xp: 0, hospitalMinutes };
      }

      const updated = await supabase
        .from("profiles")
        .update(patch as never)
        .eq("user_id", userId);
      if (updated.error) throw new Error(updated.error.message);
    }

    const saved = await supabase
      .from("battles")
      .update({
        state: state as unknown as never,
        status: state.status === "active" ? "active" : state.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", battle.id)
      .select("*")
      .single();
    if (saved.error) throw new Error(saved.error.message);

    return { state, status: state.status, reward, battle: saved.data };
  });

export const abandonBattle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ battleId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const updated = await supabase
      .from("battles")
      .update({ status: "abandoned", updated_at: new Date().toISOString() })
      .eq("id", data.battleId)
      .eq("attacker_id", userId);
    if (updated.error) throw new Error(updated.error.message);
    return { ok: true };
  });
