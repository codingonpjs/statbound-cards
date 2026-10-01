import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/game/AppShell";
import { GameCard } from "@/components/game/GameCard";
import { Button } from "@/components/ui/button";
import { getCollection, saveDeck } from "@/lib/cards.functions";
import { unmetRequirements } from "@/lib/game/requirements";
import type { CardDef } from "@/lib/game/types";

export const Route = createFileRoute("/_authenticated/deck")({
  head: () => ({
    meta: [
      { title: "Deck Builder — Tavern Brawl" },
      {
        name: "description",
        content: "Assemble a 20-card deck from cards you own, two copies of any card at most.",
      },
      { property: "og:title", content: "Deck Builder — Tavern Brawl" },
      { property: "og:description", content: "Twenty cards. Choose carefully." },
    ],
  }),
  component: DeckPage,
});

function DeckPage() {
  const fetchCollection = useServerFn(getCollection);
  const doSave = useServerFn(saveDeck);
  const queryClient = useQueryClient();
  const [deck, setDeck] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const collection = useQuery({ queryKey: ["collection"], queryFn: () => fetchCollection() });

  useEffect(() => {
    if (collection.data && !hydrated) {
      setDeck(collection.data.deck ?? []);
      setHydrated(true);
    }
  }, [collection.data, hydrated]);

  const mutation = useMutation({
    mutationFn: (cardIds: string[]) => doSave({ data: { cardIds } }),
    onSuccess: () => {
      toast.success("Deck saved. Take it to the arena.");
      void queryClient.invalidateQueries({ queryKey: ["collection"] });
      void queryClient.invalidateQueries({ queryKey: ["opponents"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save."),
  });

  const profile = collection.data?.profile;
  const deckSize = collection.data?.deckSize ?? 20;
  const maxCopies = collection.data?.maxCopies ?? 2;
  const cards = (collection.data?.cards ?? []) as CardDef[];
  const cardMap = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const artMap = useMemo(
    () =>
      new Map(
        (collection.data?.owned ?? []).map((row) => [row.card_id, row.custom_art_url as string | null]),
      ),
    [collection.data?.owned],
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const id of deck) map.set(id, (map.get(id) ?? 0) + 1);
    return map;
  }, [deck]);

  const ownedPlayable = (collection.data?.owned ?? [])
    .map((row) => ({ row, card: cardMap.get(row.card_id) }))
    .filter(
      (entry): entry is { row: typeof entry.row; card: CardDef } =>
        !!entry.card &&
        entry.row.quantity > 0 &&
        !!profile &&
        unmetRequirements(entry.card.requirements ?? {}, profile).length === 0,
    )
    .sort((a, b) => a.card.cost - b.card.cost);

  const manaCurve = useMemo(() => {
    const buckets = new Array(11).fill(0) as number[];
    for (const id of deck) {
      const card = cardMap.get(id);
      if (card) buckets[Math.min(10, card.cost)] = (buckets[Math.min(10, card.cost)] ?? 0) + 1;
    }
    return buckets;
  }, [deck, cardMap]);

  function add(cardId: string, ownedQuantity: number) {
    const current = counts.get(cardId) ?? 0;
    if (deck.length >= deckSize) {
      toast.error(`A deck holds exactly ${deckSize} cards.`);
      return;
    }
    if (current >= Math.min(maxCopies, ownedQuantity)) {
      toast.error("You have no more copies of that card.");
      return;
    }
    setDeck((prev) => [...prev, cardId]);
  }

  function remove(cardId: string) {
    setDeck((prev) => {
      const index = prev.lastIndexOf(cardId);
      if (index === -1) return prev;
      return [...prev.slice(0, index), ...prev.slice(index + 1)];
    });
  }

  const maxCurve = Math.max(1, ...manaCurve);

  return (
    <AppShell
      title="Deck Builder"
      subtitle={`Exactly ${deckSize} cards, at most ${maxCopies} copies of each, and nothing your stats can't field.`}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="panel p-5">
          <h2 className="font-display text-xl text-gold">Your collection</h2>
          {ownedPlayable.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Nothing playable yet — buy cards in the shop, and train to unlock the rest.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {ownedPlayable.map(({ row, card }) => {
              const inDeck = counts.get(card.id) ?? 0;
              return (
                <GameCard
                  key={card.id}
                  card={card}
                  size="sm"
                  customArt={row.custom_art_url}
                  showRequirements={false}
                  onClick={() => add(card.id, row.quantity)}
                  selected={inDeck > 0}
                  footer={
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      In deck {inDeck}/{Math.min(maxCopies, row.quantity)}
                    </p>
                  }
                />
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          <div className="panel p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl text-gold">Deck</h2>
              <span
                className={
                  deck.length === deckSize
                    ? "font-display text-lg text-emerald"
                    : "font-display text-lg text-muted-foreground"
                }
              >
                {deck.length}/{deckSize}
              </span>
            </div>

            <div className="mt-3 flex h-16 items-end gap-1">
              {manaCurve.map((count, cost) => (
                <div key={cost} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-mana/70"
                    style={{ height: `${(count / maxCurve) * 100}%` }}
                  />
                  <span className="text-[9px] text-muted-foreground">{cost}</span>
                </div>
              ))}
            </div>

            <ul className="mt-4 max-h-80 space-y-1 overflow-y-auto pr-1">
              {[...counts.entries()].map(([cardId, count]) => {
                const card = cardMap.get(cardId);
                if (!card) return null;
                return (
                  <li key={cardId}>
                    <button
                      onClick={() => remove(cardId)}
                      className="flex w-full items-center gap-2 rounded-md bg-secondary/60 px-2 py-1.5 text-left text-sm transition-colors hover:bg-destructive/25"
                    >
                      <span className="flex size-5 items-center justify-center rounded-full bg-mana text-[11px] font-bold text-background">
                        {card.cost}
                      </span>
                      <span className="flex-1 truncate text-foreground">{card.name}</span>
                      <span className="text-gold">×{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 grid gap-2">
              <Button
                disabled={deck.length !== deckSize || mutation.isPending}
                onClick={() => mutation.mutate(deck)}
              >
                Save deck
              </Button>
              <Button variant="outline" onClick={() => setDeck([])} disabled={deck.length === 0}>
                Clear
              </Button>
            </div>
          </div>

          <div className="parchment-panel p-4 text-sm">
            <p className="font-display text-base">House rules</p>
            <p className="mt-1">
              Click a card to add it, click a deck line to take one back out. Cards you own but
              can't field yet are hidden until your stats catch up.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
