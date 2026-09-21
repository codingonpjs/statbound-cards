import { Link, useNavigate } from "@tanstack/react-router";
import { Coins, Flame, HeartPulse, LogOut, Zap } from "lucide-react";
import type { ReactNode } from "react";

import tavernBg from "@/assets/tavern-bg.jpg";
import { Countdown } from "@/components/game/Countdown";
import { useProfile } from "@/components/game/useGame";
import { supabase } from "@/integrations/supabase/client";
import {
  ENERGY_MAX,
  ENERGY_TICK_MS,
  LIFE_MAX,
  LIFE_TICK_MS,
  NERVE_MAX,
  NERVE_TICK_MS,
  xpForLevel,
} from "@/lib/game/regen";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/tavern", label: "Tavern" },
  { to: "/gym", label: "Gym" },
  { to: "/crimes", label: "Jobs" },
  { to: "/shop", label: "Card Shop" },
  { to: "/deck", label: "Deck" },
  { to: "/arena", label: "Arena" },
  { to: "/card-art", label: "Card Art" },
] as const;

function nextTick(updatedAt: string, tickMs: number, atMax: boolean): number | null {
  if (atMax) return null;
  return new Date(updatedAt).getTime() + tickMs;
}

function Meter({
  icon,
  label,
  value,
  max,
  tone,
  refillAt,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  max: number;
  tone: string;
  refillAt: number | null;
}) {
  return (
    <div className="min-w-[8.5rem] flex-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {icon}
          {label}
        </span>
        <span className="font-semibold text-foreground">
          {value}/{max}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        <Countdown target={refillAt} prefix="+1 in " />
      </p>
    </div>
  );
}

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { data } = useProfile();
  const profile = data?.profile;

  async function signOut() {
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  }

  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${tavernBg})` }}
      />
      <div className="pointer-events-none fixed inset-0 bg-background/75" />

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-5">
        <header className="panel px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to="/tavern" className="font-display text-2xl font-bold text-gradient-gold">
              Tavern Brawl
            </Link>

            {profile && (
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="font-display text-gold">{profile.name}</span>
                <span className="text-muted-foreground">
                  Level {profile.level} · {profile.xp}/{xpForLevel(profile.level)} xp
                </span>
                <span className="flex items-center gap-1 font-semibold text-gold">
                  <Coins className="size-4" />
                  {profile.cash.toLocaleString()}
                </span>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="size-3.5" /> Leave
                </button>
              </div>
            )}
          </div>

          {profile && (
            <div className="mt-3 flex flex-wrap gap-4">
              <Meter
                icon={<Zap className="size-3.5 text-gold" />}
                label="Energy"
                value={profile.energy}
                max={ENERGY_MAX}
                tone="bg-gold"
                refillAt={nextTick(
                  profile.energy_updated_at,
                  ENERGY_TICK_MS,
                  profile.energy >= ENERGY_MAX,
                )}
              />
              <Meter
                icon={<Flame className="size-3.5 text-ember" />}
                label="Nerve"
                value={profile.nerve}
                max={NERVE_MAX}
                tone="bg-ember"
                refillAt={nextTick(
                  profile.nerve_updated_at,
                  NERVE_TICK_MS,
                  profile.nerve >= NERVE_MAX,
                )}
              />
              <Meter
                icon={<HeartPulse className="size-3.5 text-emerald" />}
                label="Life"
                value={profile.life}
                max={LIFE_MAX}
                tone="bg-emerald"
                refillAt={nextTick(
                  profile.life_updated_at,
                  LIFE_TICK_MS,
                  profile.life >= LIFE_MAX,
                )}
              />
            </div>
          )}

          <nav className="mt-3 flex flex-wrap gap-1 border-t border-border pt-3">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                activeProps={{ className: "bg-accent text-gold font-semibold" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <div className="mt-6">
          <h1 className="font-display text-3xl font-bold text-gradient-gold">{title}</h1>
          {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
          <div className="gold-rule mt-3 h-px w-full opacity-40" />
        </div>

        <main className="mt-6">{children}</main>
      </div>
    </div>
  );
}
