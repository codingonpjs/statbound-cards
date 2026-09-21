import { Link, createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { AppShell } from "@/components/game/AppShell";
import { Countdown } from "@/components/game/Countdown";
import { useProfile } from "@/components/game/useGame";
import { Button } from "@/components/ui/button";
import { LIFE_MAX } from "@/lib/game/regen";

export const Route = createFileRoute("/_authenticated/hospital")({
  head: () => ({
    meta: [
      { title: "The Sickroom — Tavern Brawl" },
      {
        name: "description",
        content: "Wait out your injuries. Life refills on its own while you sit here.",
      },
      { property: "og:title", content: "The Sickroom — Tavern Brawl" },
      { property: "og:description", content: "Bandages, bad broth, and a clock on the wall." },
    ],
  }),
  component: HospitalPage,
});

function HospitalPage() {
  const { data } = useProfile();
  const profile = data?.profile;
  const queryClient = useQueryClient();
  const until = profile?.hospital_until ? new Date(profile.hospital_until).getTime() : null;
  const stillIn = !!data?.hospitalised;

  return (
    <AppShell title="The Sickroom" subtitle="Above the stable. Smells of vinegar and regret.">
      <div className="panel mx-auto max-w-lg p-7 text-center">
        {stillIn ? (
          <>
            <p className="font-display text-2xl text-destructive">You're laid up</p>
            <p className="mt-3 text-5xl font-display font-bold text-gradient-gold">
              <Countdown
                target={until}
                onDone={() => void queryClient.invalidateQueries({ queryKey: ["profile"] })}
              />
            </p>
            <p className="mt-3 text-muted-foreground">
              No training, no jobs, no fights until you're discharged.
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-2xl text-emerald">You're discharged</p>
            <p className="mt-3 text-muted-foreground">
              Life is at {profile?.life ?? 0}/{LIFE_MAX} and climbing on its own.
            </p>
            <Button asChild className="mt-5">
              <Link to="/tavern">Back to your table</Link>
            </Button>
          </>
        )}
      </div>
    </AppShell>
  );
}
