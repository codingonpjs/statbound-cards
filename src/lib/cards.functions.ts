import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CardDef } from "./game/types";
import { meetsRequirements } from "./game/requirements";
import { loadPlayer } from "./player.server";

const DECK_SIZE = 20;
const MAX_COPIES = 2;

function displayName(claims: Record<string, unknown>): string {
  const email = typeof claims["email"] === "string" ? (claims["email"] as string) : "";
  return email.split("@")[0] || "Newcomer";
}

export const getCollection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const profile = await loadPlayer(supabase, userId, displayName(context.claims));

    const [cardsQuery, ownedQuery, deckQuery] = await Promise.all([
      supabase.from("cards").select("*").order("cost", { ascending: true }),
      supabase.from("player_cards").select("*").eq("user_id", userId),
      supabase.from("decks").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    if (cardsQuery.error) throw new Error(cardsQuery.error.message);
    if (ownedQuery.error) throw new Error(ownedQuery.error.message);
    if (deckQuery.error) throw new Error(deckQuery.error.message);

    return {
      profile,
      cards: (cardsQuery.data ?? []) as unknown as CardDef[],
      owned: ownedQuery.data ?? [],
      deck: deckQuery.data?.card_ids ?? [],
      deckSize: DECK_SIZE,
      maxCopies: MAX_COPIES,
    };
  });

export const buyCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ cardId: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profile = await loadPlayer(supabase, userId, displayName(context.claims));

    const cardQuery = await supabase
      .from("cards")
      .select("*")
      .eq("id", data.cardId)
      .maybeSingle();
    if (cardQuery.error) throw new Error(cardQuery.error.message);
    const card = cardQuery.data as unknown as CardDef | null;
    if (!card) throw new Error("Unknown card.");

    if (!meetsRequirements(card.requirements ?? {}, profile)) {
      throw new Error(`Your stats are not good enough for ${card.name} yet.`);
    }
    if (profile.cash < card.price) throw new Error("You cannot afford that card.");

    const ownedQuery = await supabase
      .from("player_cards")
      .select("*")
      .eq("user_id", userId)
      .eq("card_id", card.id)
      .maybeSingle();
    if (ownedQuery.error) throw new Error(ownedQuery.error.message);

    const quantity = ownedQuery.data?.quantity ?? 0;
    if (quantity >= MAX_COPIES) throw new Error(`You already own ${MAX_COPIES} copies.`);

    const upsert = await supabase
      .from("player_cards")
      .upsert(
        { user_id: userId, card_id: card.id, quantity: quantity + 1 },
        { onConflict: "user_id,card_id" },
      )
      .select("*")
      .single();
    if (upsert.error) throw new Error(upsert.error.message);

    const updated = await supabase
      .from("profiles")
      .update({ cash: profile.cash - card.price })
      .eq("user_id", userId)
      .select("*")
      .single();
    if (updated.error) throw new Error(updated.error.message);

    return { profile: updated.data, owned: upsert.data, cardName: card.name };
  });

export const saveDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ cardIds: z.array(z.string()).max(40) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profile = await loadPlayer(supabase, userId, displayName(context.claims));

    if (data.cardIds.length !== DECK_SIZE) {
      throw new Error(`A deck must hold exactly ${DECK_SIZE} cards.`);
    }

    const counts = new Map<string, number>();
    for (const id of data.cardIds) counts.set(id, (counts.get(id) ?? 0) + 1);

    const [ownedQuery, cardsQuery] = await Promise.all([
      supabase.from("player_cards").select("*").eq("user_id", userId),
      supabase.from("cards").select("*").in("id", [...counts.keys()]),
    ]);
    if (ownedQuery.error) throw new Error(ownedQuery.error.message);
    if (cardsQuery.error) throw new Error(cardsQuery.error.message);

    const ownedMap = new Map((ownedQuery.data ?? []).map((row) => [row.card_id, row.quantity]));
    const cards = (cardsQuery.data ?? []) as unknown as CardDef[];
    const cardMap = new Map(cards.map((card) => [card.id, card]));

    for (const [cardId, count] of counts) {
      const card = cardMap.get(cardId);
      if (!card) throw new Error("Your deck contains an unknown card.");
      if (count > MAX_COPIES) throw new Error(`Only ${MAX_COPIES} copies of ${card.name} allowed.`);
      if ((ownedMap.get(cardId) ?? 0) < count) throw new Error(`You don't own enough ${card.name}.`);
      if (!meetsRequirements(card.requirements ?? {}, profile)) {
        throw new Error(`${card.name} needs better stats before you can field it.`);
      }
    }

    const saved = await supabase
      .from("decks")
      .upsert({ user_id: userId, card_ids: data.cardIds }, { onConflict: "user_id" })
      .select("*")
      .single();
    if (saved.error) throw new Error(saved.error.message);

    return { deck: saved.data.card_ids };
  });

export const setCardArt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ cardId: z.string(), storagePath: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (!data.storagePath.startsWith(`${userId}/`)) {
      throw new Error("That upload does not belong to you.");
    }

    const signed = await supabase.storage
      .from("card-art")
      .createSignedUrl(data.storagePath, 60 * 60 * 24 * 365);
    if (signed.error || !signed.data?.signedUrl) {
      throw new Error(signed.error?.message ?? "Could not read the uploaded artwork.");
    }

    const existing = await supabase
      .from("player_cards")
      .select("quantity")
      .eq("user_id", userId)
      .eq("card_id", data.cardId)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);

    const saved = await supabase
      .from("player_cards")
      .upsert(
        {
          user_id: userId,
          card_id: data.cardId,
          quantity: existing.data?.quantity ?? 0,
          custom_art_url: signed.data.signedUrl,
        },
        { onConflict: "user_id,card_id" },
      )
      .select("*")
      .single();
    if (saved.error) throw new Error(saved.error.message);

    return { owned: saved.data };
  });

export const resetCardArt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ cardId: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const updated = await supabase
      .from("player_cards")
      .update({ custom_art_url: null })
      .eq("user_id", userId)
      .eq("card_id", data.cardId)
      .select("*")
      .maybeSingle();
    if (updated.error) throw new Error(updated.error.message);
    return { owned: updated.data };
  });

export const setGlobalCardArt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ cardId: z.string(), artUrl: z.string().url().nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const role = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (role.error) throw new Error(role.error.message);
    if (!role.data) throw new Error("Only the house admin can change the default artwork.");

    const updated = await supabase
      .from("cards")
      .update({ art_url: data.artUrl })
      .eq("id", data.cardId)
      .select("*")
      .single();
    if (updated.error) throw new Error(updated.error.message);
    return { card: updated.data };
  });
