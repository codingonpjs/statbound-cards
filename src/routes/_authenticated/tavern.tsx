import { Link, createFileRoute } from "@tanstack/react-router";
import { Swords, Dumbbell, ScrollText, Store } from "lucide-react";

import { AppShell } from "@/components/game/AppShell";
import { Countdown } from "@/components/game/Countdown";
import { useProfile } from "@/components/game/useGame";
import { Button } from "@/components/ui/button";
import {
  armorFromDefense,
  dodgeChanceFromDexterity,
  weaponBonusFromStrength,
} from "@/lib/game/engine";
import { xpForLevel } from "@/lib/game/regen";

export const Route = createFileRoute("/_authenticated/tavern")({
  head: () => ({
    meta: [
      { title: "Your Table — Tavern Brawl" },
      {
        name: "description",
        content: "Your brawler's stats, coin, energy and nerve at a glance.",
      },
      { property: "og:title", content: "Your Table — Tavern Brawl" },
      { property: "og:description", content: "Check your stats and pick your next move." },
    ],
  }),
  component: TavernPage,
});

const STATS = [
  { key: "strength", label: "Strength", effect: "Weapon damage bonus" },
  { key: "defense", label: "Defence", effect: "Starting armour" },
  { key: "speed", label: "Speed", effect: "Who swings first" },
  { key: "dexterity", label: "Dexterity", effect: "Chance to dodge" },
] as const;

const LINKS = [
  { to: "/gym", label: "Hit the gym", icon: Dumbbell },
  { to: "/crimes", label: "Take a job", icon: ScrollText },
  { to: "/shop", label: "Browse cards", icon: Store },
  { to: "/arena", label: "Find a fight", icon: Swords },
] as const;

function TavernPage() {
  const { data, isLoading } = useProfile();
  const profile = data?.profile;

  return (
    <AppShell
      title="Your Table"
      subtitle="Everything starts here: a stool, a tankard, and whatever you've made of yourself."
    >
      {isLoading && <p className="text-muted-foreground">Pouring something…</p>}

      {profile && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="panel p-5 lg:col-span-2">
            <h2 className="font-display text-xl text-gold">Character sheet</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {STATS.map((stat) => (
                <div key={stat.key} className="rounded-lg bg-secondary/60 p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-sm text-muted-foreground">
                      {stat.label}
                    </span>
                    <span className="font-display text-2xl font-bold text-gold">
                      {profile[stat.key].toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.effect}</p>
                </div>
              ))}
            </div>

            <div className="gold-rule mt-5 h-px opacity-30" />

            <h3 className="mt-4 font-display text-lg text-gold">What that buys you in a duel</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>
                Starting armour:{" "}
                <span className="text-foreground">{armorFromDefense(profile.defense)}</span>
              </li>
              <li>
                Weapon damage bonus:{" "}
                <span className="text-foreground">+{weaponBonusFromStrength(profile.strength)}</span>
              </li>
              <li>
                Dodge chance (first hit each turn):{" "}
                <span className="text-foreground">
                  {Math.round(dodgeChanceFromDexterity(profile.dexterity) * 100)}%
                </span>
              </li>
            </ul>
          </div>

          <div className="space-y-5">
            <div className="parchment-panel p-5">
              <h2 className="font-display text-xl">Record</h2>
              <p className="mt-2 text-sm">
                {profile.wins} wins · {profile.losses} losses
              </p>
              <p className="mt-1 text-sm">
                {profile.xp}/{xpForLevel(profile.level)} xp toward level {profile.level + 1}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {profile.cash.toLocaleString()} coin in pocket
              </p>
            </div>

            {data?.hospitalised && profile.hospital_until && (
              <div className="panel border-destructive/60 p-5">
                <h2 className="font-display text-lg text-destructive">In hospital</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Out in{" "}
                  <Countdown target={new Date(profile.hospital_until).getTime()} />
                </p>
                <Button asChild variant="outline" className="mt-3 w-full">
                  <Link to="/hospital">Visit the sickroom</Link>
                </Button>
              </div>
            )}

            <div className="panel p-5">
              <h2 className="font-display text-lg text-gold">Next move</h2>
              <div className="mt-3 grid gap-2">
                {LINKS.map((link) => (
                  <Button key={link.to} asChild variant="secondary" className="justify-start">
                    <Link to={link.to}>
                      <link.icon className="mr-2 size-4" />
                      {link.label}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
