import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Swords } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/game/AppShell";
import { Button } from "@/components/ui/button";
import { listOpponents, startBattle } from "@/lib/battle.functions";

export const Route = createFileRoute("/_authenticated/arena")({
  head: () => ({
    meta: [
      { title: "The Arena — Tavern Brawl" },
      {
        name: "description",
        content:
          "Challenge house regulars or another brawler's saved deck. Energy in, coin and experience out.",
      },
      { property: "og:title", content: "The Arena — Tavern Brawl" },
      { property: "og:description", content: "Pick a fight you can win. Or don't." },
    ],
  }),
  component: ArenaPage,
});

function ArenaPage() {
  const fetchOpponents = useServerFn(listOpponents);
  const doStart = useServerFn(startBattle);
  const navigate = useNavigate();

  const opponents = useQuery({ queryKey: ["opponents"], queryFn: () => fetchOpponents() });

  const mutation = useMutation({
    mutationFn: (input: { npcId?: string; defenderId?: string }) => doStart({ data: input }),
    onSuccess: (result) => {
      void navigate({ to: "/battle/$battleId", params: { battleId: result.battleId } });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "That fight didn't happen."),
  });

  const data = opponents.data;
  const blocked = !data?.hasDeck || data?.hospitalised;

  return (
    <AppShell
      title="The Arena"
      subtitle="Cleared tables, a chalk circle, and a deck each. Winner takes the pot."
    >
      {data && !data.hasDeck && (
        <div className="panel mb-5 border-destructive/60 p-4">
          <p className="text-sm text-destructive">
            You need a saved 20-card deck before anyone will sit down with you.
          </p>
          <Button asChild variant="outline" className="mt-3">
            <Link to="/deck">Build a deck</Link>
          </Button>
        </div>
      )}

      {data?.hospitalised && (
        <div className="panel mb-5 border-destructive/60 p-4">
          <p className="text-sm text-destructive">You're in hospital. No fights until discharged.</p>
        </div>
      )}

      <section>
        <h2 className="font-display text-xl text-gold">House regulars</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.npcs.map((npc) => (
            <div key={npc.id} className="panel flex flex-col p-5">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-lg text-gold">{npc.name}</h3>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Tier {npc.tier}
                </span>
              </div>
              <p className="mt-1 text-sm italic text-muted-foreground">{npc.blurb}</p>

              <dl className="mt-3 grid grid-cols-4 gap-1 text-center text-xs">
                <div>
                  <dt className="text-muted-foreground">Str</dt>
                  <dd className="font-semibold">{npc.strength}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Def</dt>
                  <dd className="font-semibold">{npc.defense}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Spd</dt>
                  <dd className="font-semibold">{npc.speed}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Dex</dt>
                  <dd className="font-semibold">{npc.dexterity}</dd>
                </div>
              </dl>

              <p className="mt-3 text-sm text-gold">
                Wins {npc.reward_cash.toLocaleString()} coin · {npc.reward_xp} xp
              </p>
              <p className="text-xs text-destructive">
                Lose: {npc.hospital_minutes} minutes in hospital
              </p>

              <Button
                className="mt-4"
                disabled={blocked || mutation.isPending}
                onClick={() => mutation.mutate({ npcId: npc.id })}
              >
                <Swords className="mr-2 size-4" />
                Fight ({data?.npcEnergyCost} energy)
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl text-gold">Other brawlers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Their saved decks are played by the house while they're away.
        </p>

        {data?.rivals.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            Nobody else has a deck saved yet. You're the only one holding cards.
          </p>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data?.rivals.map((rival) => (
            <div key={rival.user_id} className="panel flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-display text-base text-gold">{rival.name}</p>
                <p className="text-xs text-muted-foreground">
                  Level {rival.level} · {rival.wins}W/{rival.losses}L
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={blocked || mutation.isPending}
                onClick={() => mutation.mutate({ defenderId: rival.user_id })}
              >
                Challenge ({data?.pvpEnergyCost})
              </Button>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
