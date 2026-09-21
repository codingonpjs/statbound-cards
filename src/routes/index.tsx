import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";

import championArt from "@/assets/art-champion.jpg";
import tavernBg from "@/assets/tavern-bg.jpg";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tavern Brawl — stat-gated card duels" },
      {
        name: "description",
        content:
          "Train strength, defence, speed and dexterity to unlock stronger cards, run jobs for coin, then settle it in a turn-based card duel.",
      },
      { property: "og:title", content: "Tavern Brawl — stat-gated card duels" },
      {
        property: "og:description",
        content:
          "A persistent brawler RPG where your stats decide which cards you can buy and play.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    title: "Train, then unlock",
    body: "Energy goes into the gym. Strength, defence, speed and dexterity are the keys to the card shop's better shelves.",
  },
  {
    title: "Work the streets",
    body: "Spend nerve on jobs for coin and experience. Fail badly and you wake up in hospital.",
  },
  {
    title: "Duel with cards",
    body: "Twenty-card decks, mana crystals, taunt, charge and divine shield — your stats add armour, weapon bite and first strike.",
  },
];

function Landing() {
  const { session } = useAuth();

  return (
    <div className="relative min-h-screen">
      <img
        src={tavernBg}
        alt="A dark candlelit tavern"
        width={1536}
        height={1024}
        className="pointer-events-none absolute inset-0 size-full object-cover opacity-45"
      />
      <div className="pointer-events-none absolute inset-0 bg-background/70" />

      <div className="relative mx-auto max-w-6xl px-5 py-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <p className="font-display text-sm uppercase tracking-[0.3em] text-gold">
            The Wandering Stag
          </p>
          <h1 className="mt-4 font-display text-5xl font-bold leading-tight text-gradient-gold sm:text-6xl">
            Tavern Brawl
          </h1>
          <p className="mt-5 text-lg text-foreground/90">
            A brawler's life in one long night: lift in the gym, take the jobs nobody admits to,
            and settle every argument across a card table. The cards you may buy — and play —
            depend entirely on the body you've built.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to={session ? "/tavern" : "/auth"}>
                {session ? "Back to the tavern" : "Create your brawler"}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </motion.div>

        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * index }}
              className="panel p-5"
            >
              <h2 className="font-display text-xl text-gold">{feature.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
            </motion.div>
          ))}
        </div>

        <div className="panel mt-14 flex flex-col items-center gap-6 p-6 md:flex-row">
          <img
            src={championArt}
            alt="A crowned champion on a tavern table"
            loading="lazy"
            width={944}
            height={704}
            className="w-full max-w-sm rounded-lg object-cover ring-2 ring-legendary/70"
          />
          <div>
            <h2 className="font-display text-2xl text-gold">Legendaries are earned, not bought</h2>
            <p className="mt-2 text-muted-foreground">
              Champion of the Tavern asks for 700 in every stat and level 20. Every card in the
              shop is greyed out until your body catches up — and any card's artwork can be
              swapped for your own.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
