import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/game/AppShell";
import { GameCard } from "@/components/game/GameCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buyCard, getCollection } from "@/lib/cards.functions";
import { cardTier, unmetRequirements } from "@/lib/game/requirements";
import type { CardDef } from "@/lib/game/types";

export const Route = createFileRoute("/_authenticated/shop")({
  head: () => ({
    meta: [
      { title: "Card Shop — Tavern Brawl" },
      {
        name: "description",
        content:
          "Buy cards with coin — but only the ones your strength, defence, speed, dexterity and level allow.",
      },
      { property: "og:title", content: "Card Shop — Tavern Brawl" },
      { property: "og:description", content: "Locked shelves for bodies that aren't ready." },
    ],
  }),
  component: ShopPage,
});

const FILTERS = ["all", "affordable", "unlocked", "locked"] as const;

function ShopPage() {
  const fetchCollection = useServerFn(getCollection);
  const doBuy = useServerFn(buyCard);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const collection = useQuery({
    queryKey: ["collection"],
    queryFn: () => fetchCollection(),
  });

  const mutation = useMutation({
    mutationFn: (cardId: string) => doBuy({ data: { cardId } }),
    onSuccess: (result) => {
      toast.success(`${result.cardName} is yours.`);
      void queryClient.invalidateQueries({ queryKey: ["collection"] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Purchase failed."),
  });

  const profile = collection.data?.profile;
  const owned = useMemo(
    () => new Map((collection.data?.owned ?? []).map((row) => [row.card_id, row])),
    [collection.data?.owned],
  );

  const cards = (collection.data?.cards ?? []) as CardDef[];
  const maxCopies = collection.data?.maxCopies ?? 2;

  const visible = cards.filter((card) => {
    if (!profile) return true;
    const missing = unmetRequirements(card.requirements ?? {}, profile);
    if (filter === "locked") return missing.length > 0;
    if (filter === "unlocked") return missing.length === 0;
    if (filter === "affordable") return missing.length === 0 && profile.cash >= card.price;
    return true;
  });

  const byTier = [1, 2, 3, 4, 5].map((tier) => ({
    tier,
    cards: visible.filter((card) => cardTier(card) === tier),
  }));

  return (
    <AppShell
      title="Card Shop"
      subtitle="The barkeep keeps the good stock behind the counter until you look like you can use it."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <button
            key={option}
            onClick={() => setFilter(option)}
            className={cn(
              "rounded-md border border-border px-3 py-1.5 text-sm capitalize transition-colors hover:bg-accent",
              filter === option && "border-gold bg-accent text-gold",
            )}
          >
            {option}
          </button>
        ))}
      </div>

      {collection.isLoading && <p className="text-muted-foreground">Unlocking the case…</p>}

      <div className="space-y-9">
        {byTier
          .filter((group) => group.cards.length > 0)
          .map((group) => (
            <section key={group.tier}>
              <h2 className="font-display text-xl text-gold">Shelf {group.tier}</h2>
              <div className="mt-4 flex flex-wrap gap-4">
                {group.cards.map((card) => {
                  const missing = profile ? unmetRequirements(card.requirements ?? {}, profile) : [];
                  const locked = missing.length > 0;
                  const record = owned.get(card.id);
                  const quantity = record?.quantity ?? 0;
                  const maxed = quantity >= maxCopies;
                  const tooPoor = !!profile && profile.cash < card.price;

                  return (
                    <GameCard
                      key={card.id}
                      card={card}
                      customArt={record?.custom_art_url}
                      locked={locked}
                      footer={
                        <div className="mt-2 space-y-1.5">
                          {locked ? (
                            <p className="flex items-center gap-1 text-[10px] text-destructive">
                              <Lock className="size-3" /> Needs {missing.join(", ")}
                            </p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground">
                              Owned {quantity}/{maxCopies}
                            </p>
                          )}
                          <Button
                            size="sm"
                            variant={locked || maxed ? "secondary" : "default"}
                            className="h-7 w-full text-xs"
                            disabled={locked || maxed || tooPoor || mutation.isPending}
                            onClick={() => mutation.mutate(card.id)}
                          >
                            {maxed
                              ? "Maxed"
                              : locked
                                ? "Locked"
                                : `${card.price.toLocaleString()} coin`}
                          </Button>
                        </div>
                      }
                    />
                  );
                })}
              </div>
            </section>
          ))}
      </div>
    </AppShell>
  );
}
