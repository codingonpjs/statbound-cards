import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/game/AppShell";
import { GameCard } from "@/components/game/GameCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getCollection, resetCardArt, setCardArt } from "@/lib/cards.functions";
import type { CardDef } from "@/lib/game/types";

export const Route = createFileRoute("/_authenticated/card-art")({
  head: () => ({
    meta: [
      { title: "Card Art — Tavern Brawl" },
      {
        name: "description",
        content: "Replace the artwork on any card you own with your own image, or restore the original.",
      },
      { property: "og:title", content: "Card Art — Tavern Brawl" },
      { property: "og:description", content: "Your cards, your pictures." },
    ],
  }),
  component: CardArtPage,
});

function CardArtPage() {
  const fetchCollection = useServerFn(getCollection);
  const doSetArt = useServerFn(setCardArt);
  const doResetArt = useServerFn(resetCardArt);
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const collection = useQuery({ queryKey: ["collection"], queryFn: () => fetchCollection() });

  const cards = (collection.data?.cards ?? []) as CardDef[];
  const cardMap = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const owned = collection.data?.owned ?? [];
  const ownedCards = owned
    .map((row) => ({ row, card: cardMap.get(row.card_id) }))
    .filter((entry): entry is { row: (typeof owned)[number]; card: CardDef } => !!entry.card);

  const reset = useMutation({
    mutationFn: (cardId: string) => doResetArt({ data: { cardId } }),
    onSuccess: () => {
      toast.success("Original artwork restored.");
      void queryClient.invalidateQueries({ queryKey: ["collection"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not reset."),
  });

  async function upload(file: File) {
    if (!selected) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("That image is over 4 MB — pick a smaller one.");
      return;
    }
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("You are signed out.");

      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${selected}-${Date.now()}.${extension}`;
      const uploadResult = await supabase.storage.from("card-art").upload(path, file, {
        upsert: true,
        contentType: file.type || "image/jpeg",
      });
      if (uploadResult.error) throw uploadResult.error;

      await doSetArt({ data: { cardId: selected, storagePath: path } });
      toast.success("New artwork applied.");
      void queryClient.invalidateQueries({ queryKey: ["collection"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const selectedEntry = ownedCards.find((entry) => entry.card.id === selected);

  return (
    <AppShell
      title="Card Art"
      subtitle="Every card ships with house artwork. Swap in your own and it shows up everywhere that card appears — shop, deck and duel."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="panel p-5">
          <h2 className="font-display text-xl text-gold">Cards you own</h2>
          {ownedCards.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Buy a card first — you can only re-skin cards in your collection.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {ownedCards.map(({ row, card }) => (
              <GameCard
                key={card.id}
                card={card}
                size="sm"
                showRequirements={false}
                customArt={row.custom_art_url}
                selected={selected === card.id}
                onClick={() => setSelected(card.id)}
                footer={
                  row.custom_art_url ? (
                    <p className="mt-1 text-[10px] text-emerald">Custom art</p>
                  ) : undefined
                }
              />
            ))}
          </div>
        </div>

        <div className="panel h-fit p-5">
          <h2 className="font-display text-xl text-gold">
            {selectedEntry ? selectedEntry.card.name : "Pick a card"}
          </h2>

          {selectedEntry ? (
            <>
              <div className="mt-4 flex justify-center">
                <GameCard
                  card={selectedEntry.card}
                  customArt={selectedEntry.row.custom_art_url}
                />
              </div>

              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                }}
              />

              <Button
                className="mt-5 w-full"
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
              >
                <Upload className="mr-2 size-4" />
                {uploading ? "Uploading…" : "Upload artwork"}
              </Button>

              <Button
                variant="outline"
                className="mt-2 w-full"
                disabled={!selectedEntry.row.custom_art_url || reset.isPending}
                onClick={() => reset.mutate(selectedEntry.card.id)}
              >
                Reset to default
              </Button>

              <p className="mt-3 text-xs text-muted-foreground">
                JPEG, PNG or WebP up to 4 MB. Wide images crop best — the art window is landscape.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Choose one of your cards on the left to change its picture.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
