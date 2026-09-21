import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { AppShell } from "@/components/game/AppShell";
import { useProfile } from "@/components/game/useGame";
import { Button } from "@/components/ui/button";
import { STAT_LABELS } from "@/lib/game/requirements";
import { commitCrime, listCrimes } from "@/lib/player.functions";

export const Route = createFileRoute("/_authenticated/crimes")({
  head: () => ({
    meta: [
      { title: "Jobs — Tavern Brawl" },
      {
        name: "description",
        content: "Spend nerve on jobs for coin and experience. Fail and you wake up in hospital.",
      },
      { property: "og:title", content: "Jobs — Tavern Brawl" },
      { property: "og:description", content: "Coin, experience, and the odd broken rib." },
    ],
  }),
  component: CrimesPage,
});

function CrimesPage() {
  const { data: profileData } = useProfile();
  const profile = profileData?.profile;
  const queryClient = useQueryClient();
  const fetchCrimes = useServerFn(listCrimes);
  const doCrime = useServerFn(commitCrime);

  const crimes = useQuery({ queryKey: ["crimes"], queryFn: () => fetchCrimes() });

  const mutation = useMutation({
    mutationFn: (crimeId: string) => doCrime({ data: { crimeId } }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`${result.crimeName}: +${result.cash} coin, +${result.xp} xp`);
      } else if (result.hospitalMinutes > 0) {
        toast.error(`It went badly. Hospital for ${result.hospitalMinutes} minutes.`);
      } else {
        toast.error("Nothing doing. You slipped away empty-handed.");
      }
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "That job fell apart."),
  });

  function chanceFor(crime: {
    base_success: number;
    stat: string;
    stat_divisor: number;
  }): number {
    if (!profile) return Math.round(crime.base_success * 100);
    const statValue = profile[crime.stat as "strength" | "defense" | "speed" | "dexterity"] ?? 0;
    const chance = Math.min(
      0.95,
      crime.base_success + statValue / crime.stat_divisor / 100 + profile.level * 0.004,
    );
    return Math.round(chance * 100);
  }

  return (
    <AppShell
      title="Jobs"
      subtitle="Nerve buys opportunity. Your stats decide whether it pays or hurts."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {crimes.data?.map((crime) => {
          const chance = chanceFor(crime);
          const canDo = !!profile && profile.nerve >= crime.nerve_cost && !profileData?.hospitalised;
          return (
            <div key={crime.id} className="panel flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl text-gold">{crime.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{crime.description}</p>
                </div>
                <span className="shrink-0 rounded-md bg-ember/15 px-2 py-1 text-sm font-semibold text-ember">
                  {crime.nerve_cost} nerve
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Success</dt>
                  <dd className="font-display text-lg text-gold">{chance}%</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Pays</dt>
                  <dd className="font-display text-lg">
                    {crime.cash_min}–{crime.cash_max}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Keyed to</dt>
                  <dd className="font-display text-lg">{STAT_LABELS[crime.stat] ?? crime.stat}</dd>
                </div>
              </dl>

              {crime.fail_hospital_minutes > 0 && (
                <p className="mt-3 text-xs text-destructive">
                  Botch it and it's {crime.fail_hospital_minutes} minutes in hospital.
                </p>
              )}

              <Button
                className="mt-4"
                disabled={!canDo || mutation.isPending}
                onClick={() => mutation.mutate(crime.id)}
              >
                {profile && profile.nerve < crime.nerve_cost ? "Not enough nerve" : "Do it"}
              </Button>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
