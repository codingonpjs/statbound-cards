import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/game/AppShell";
import { useProfile } from "@/components/game/useGame";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { train } from "@/lib/player.functions";

export const Route = createFileRoute("/_authenticated/gym")({
  head: () => ({
    meta: [
      { title: "The Gym — Tavern Brawl" },
      {
        name: "description",
        content: "Spend energy on strength, defence, speed or dexterity to unlock stronger cards.",
      },
      { property: "og:title", content: "The Gym — Tavern Brawl" },
      {
        property: "og:description",
        content: "Every rep here is a card you couldn't play yesterday.",
      },
    ],
  }),
  component: GymPage,
});

const STATS = [
  {
    key: "strength" as const,
    label: "Strength",
    blurb: "Adds damage to every weapon you swing, and gates the heavy hitters.",
  },
  {
    key: "defense" as const,
    label: "Defence",
    blurb: "Gives you starting armour and unlocks taunt walls.",
  },
  {
    key: "speed" as const,
    label: "Speed",
    blurb: "Decides who takes the first turn, and unlocks charge minions.",
  },
  {
    key: "dexterity" as const,
    label: "Dexterity",
    blurb: "Lets you dodge the first hit each turn, and unlocks tricks and spells.",
  },
];

const SESSIONS = [
  { energy: 5 as const, label: "Light set", note: "5 energy" },
  { energy: 15 as const, label: "Proper session", note: "15 energy" },
  { energy: 30 as const, label: "Everything you've got", note: "30 energy" },
];

function GymPage() {
  const { data } = useProfile();
  const profile = data?.profile;
  const queryClient = useQueryClient();
  const doTrain = useServerFn(train);
  const [stat, setStat] = useState<(typeof STATS)[number]["key"]>("strength");

  const mutation = useMutation({
    mutationFn: (energy: 5 | 15 | 30) => doTrain({ data: { stat, energy } }),
    onSuccess: (result) => {
      toast.success(`+${result.gain} ${result.stat}`);
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["collection"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Training failed."),
  });

  return (
    <AppShell
      title="The Gym"
      subtitle="Sandbags in the cellar. Energy in, numbers up, better cards on the shelf."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="font-display text-xl text-gold">Pick what you're working</h2>
          <div className="mt-4 grid gap-2">
            {STATS.map((item) => (
              <button
                key={item.key}
                onClick={() => setStat(item.key)}
                className={cn(
                  "rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent",
                  stat === item.key && "border-gold bg-accent",
                )}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-base text-gold">{item.label}</span>
                  <span className="font-display text-xl font-bold">
                    {profile ? profile[item.key].toLocaleString() : "—"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.blurb}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="font-display text-xl text-gold">How hard?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Bigger sessions give more, and your level multiplies every gain.
          </p>
          <div className="mt-4 grid gap-3">
            {SESSIONS.map((session) => (
              <Button
                key={session.energy}
                size="lg"
                variant={session.energy === 30 ? "default" : "secondary"}
                disabled={
                  mutation.isPending || !profile || profile.energy < session.energy || !!data?.hospitalised
                }
                onClick={() => mutation.mutate(session.energy)}
                className="justify-between"
              >
                <span>{session.label}</span>
                <span className="text-xs opacity-80">{session.note}</span>
              </Button>
            ))}
          </div>

          {data?.hospitalised && (
            <p className="mt-4 text-sm text-destructive">
              You're in hospital — no training until you're discharged.
            </p>
          )}

          {mutation.data && (
            <div className="parchment-panel mt-5 p-4">
              <p className="font-display text-lg">
                +{mutation.data.gain} {mutation.data.stat}
              </p>
              <p className="text-sm">The bags swing back. Something's working.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
