import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "motion/react";
import { Shield, Swords } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import tavernBg from "@/assets/tavern-bg.jpg";
import { keywordLabel } from "@/components/game/GameCard";
import { Button } from "@/components/ui/button";
import { artFor } from "@/lib/game/art";
import { getBattle, playAction } from "@/lib/battle.functions";
import { hasTaunt } from "@/lib/game/engine";
import type {
  BattleState,
  CardDef,
  MinionState,
  SideState,
  TargetRef,
} from "@/lib/game/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/battle/$battleId")({
  head: () => ({
    meta: [
      { title: "Duel — Tavern Brawl" },
      {
        name: "description",
        content: "A turn-based card duel: mana crystals, minions, weapons and spells.",
      },
      { property: "og:title", content: "Duel — Tavern Brawl" },
      { property: "og:description", content: "Play it out card for card." },
    ],
  }),
  component: BattlePage,
});

function needsTarget(card: CardDef): boolean {
  const effect = card.effect;
  if (!effect) return false;
  if (effect.kind === "damage") return effect.target === "any";
  if (effect.kind === "multi") {
    return effect.effects.some((child) => child.kind === "damage" && child.target === "any");
  }
  return false;
}

function ManaTrack({ side }: { side: SideState }) {
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: Math.max(side.maxMana, 1) }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "size-3 rounded-full ring-1 ring-mana/60",
            index < side.mana ? "bg-mana" : "bg-transparent",
          )}
        />
      ))}
    </div>
  );
}

function HeroPanel({
  side,
  onClick,
  targetable,
  align,
}: {
  side: SideState;
  onClick?: () => void;
  targetable?: boolean;
  align: "top" | "bottom";
}) {
  return (
    <div
      className={cn(
        "panel flex items-center gap-4 p-3",
        targetable && "cursor-pointer ring-2 ring-ember animate-ember-pulse",
      )}
      onClick={onClick}
    >
      <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-full bg-secondary ring-2 ring-gold/60">
        <span className="font-display text-xl font-bold text-ember">{Math.max(0, side.life)}</span>
        <span className="text-[9px] uppercase text-muted-foreground">life</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base text-gold">{side.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {side.armor > 0 && (
            <span className="flex items-center gap-1 text-rare">
              <Shield className="size-3" />
              {side.armor}
            </span>
          )}
          {side.weapon && (
            <span className="flex items-center gap-1 text-ember">
              <Swords className="size-3" />
              {side.weapon.attack} ({side.weapon.durability})
            </span>
          )}
          <span>{side.hand.length} in hand</span>
          <span>{side.deck.length} in deck</span>
          {side.dodgeChance > 0 && <span>{Math.round(side.dodgeChance * 100)}% dodge</span>}
        </div>
        <div className={cn("mt-1", align === "top" && "opacity-80")}>
          <ManaTrack side={side} />
        </div>
      </div>
    </div>
  );
}

function MinionChip({
  minion,
  cards,
  customArt,
  onClick,
  selected,
  targetable,
  exhausted,
}: {
  minion: MinionState;
  cards: Map<string, CardDef>;
  customArt: Record<string, string>;
  onClick?: () => void;
  selected?: boolean;
  targetable?: boolean;
  exhausted?: boolean;
}) {
  const card = cards.get(minion.cardId);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.25 }}
      onClick={onClick}
      className={cn(
        "relative w-24 overflow-hidden rounded-lg bg-card ring-2 ring-border",
        onClick && "cursor-pointer",
        selected && "ring-4 ring-gold",
        targetable && "ring-2 ring-ember animate-ember-pulse",
        minion.keywords.includes("taunt") && "ring-rare/80",
        minion.divineShield && "ring-gold",
        exhausted && "opacity-60",
      )}
    >
      {card && (
        <img
          src={artFor(card, customArt[card.id])}
          alt={minion.name}
          loading="lazy"
          width={944}
          height={704}
          className="h-14 w-full object-cover"
        />
      )}
      <p className="truncate px-1 pt-0.5 text-[10px] font-semibold text-gold">{minion.name}</p>
      {minion.keywords.length > 0 && (
        <p className="truncate px-1 text-[8px] uppercase text-muted-foreground">
          {minion.keywords.map(keywordLabel).join(" ")}
        </p>
      )}
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-xs font-bold text-ember">{minion.attack}</span>
        <span className="text-xs font-bold text-emerald">{minion.health}</span>
      </div>
    </motion.div>
  );
}

function BattlePage() {
  const { battleId } = Route.useParams();
  const fetchBattle = useServerFn(getBattle);
  const doAction = useServerFn(playAction);
  const queryClient = useQueryClient();

  const [pendingCard, setPendingCard] = useState<number | null>(null);
  const [pendingAttacker, setPendingAttacker] = useState<string | null>(null);

  const battle = useQuery({
    queryKey: ["battle", battleId],
    queryFn: () => fetchBattle({ data: { battleId } }),
  });

  const [liveState, setLiveState] = useState<BattleState | null>(null);
  const [result, setResult] = useState<{
    status: "won" | "lost";
    cash: number;
    xp: number;
    hospitalMinutes: number;
  } | null>(null);

  const state = liveState ?? battle.data?.state ?? null;
  const cards = useMemo(
    () => new Map(((battle.data?.cards ?? []) as CardDef[]).map((card) => [card.id, card])),
    [battle.data?.cards],
  );
  const customArt = battle.data?.customArt ?? {};

  const mutation = useMutation({
    mutationFn: (action: BattleAction) => doAction({ data: { battleId, action } }),
    onSuccess: (response) => {
      setLiveState(response.state);
      setPendingCard(null);
      setPendingAttacker(null);
      if (response.status !== "active" && response.reward) {
        setResult({
          status: response.status as "won" | "lost",
          cash: response.reward.cash,
          xp: response.reward.xp,
          hospitalMinutes: response.reward.hospitalMinutes,
        });
        void queryClient.invalidateQueries({ queryKey: ["profile"] });
        void queryClient.invalidateQueries({ queryKey: ["opponents"] });
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "That move isn't allowed.");
      setPendingCard(null);
      setPendingAttacker(null);
    },
  });

  function send(action: BattleAction) {
    mutation.mutate(action);
  }

  if (battle.isLoading || !state) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-display text-gold">Shuffling…</p>
      </div>
    );
  }

  const player = state.player;
  const enemy = state.enemy;
  const myTurn = state.turn === "player" && state.status === "active";
  const enemyTaunted = hasTaunt(enemy);

  const selectingTarget = pendingCard !== null || pendingAttacker !== null;

  function enemyMinionTargetable(minion: MinionState): boolean {
    if (!myTurn || !selectingTarget) return false;
    if (pendingCard !== null) return true;
    return !enemyTaunted || minion.keywords.includes("taunt");
  }

  const enemyHeroTargetable = myTurn && selectingTarget && (pendingCard !== null || !enemyTaunted);

  function handleTarget(ref: TargetRef) {
    if (pendingCard !== null) {
      send({ type: "play_card", handIndex: pendingCard, target: ref });
    } else if (pendingAttacker) {
      send({ type: "attack", attacker: pendingAttacker, target: ref });
    }
  }

  function handleHandClick(handIndex: number, card: CardDef) {
    if (!myTurn) return;
    if (card.cost > player.mana) {
      toast.error("Not enough mana for that yet.");
      return;
    }
    if (needsTarget(card)) {
      setPendingAttacker(null);
      setPendingCard(handIndex);
      toast.info("Pick a target.");
      return;
    }
    send({ type: "play_card", handIndex });
  }

  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: `url(${tavernBg})` }}
      />
      <div className="pointer-events-none fixed inset-0 bg-background/80" />

      <div className="relative mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-4">
          <HeroPanel
            side={enemy}
            align="top"
            targetable={!!enemyHeroTargetable}
            onClick={
              enemyHeroTargetable ? () => handleTarget({ kind: "hero", side: "enemy" }) : undefined
            }
          />

          <div className="panel flex min-h-24 flex-wrap items-center justify-center gap-2 p-3">
            <AnimatePresence mode="popLayout">
              {enemy.board.map((minion) => (
                <MinionChip
                  key={minion.uid}
                  minion={minion}
                  cards={cards}
                  customArt={customArt}
                  targetable={enemyMinionTargetable(minion)}
                  onClick={
                    enemyMinionTargetable(minion)
                      ? () => handleTarget({ kind: "minion", side: "enemy", uid: minion.uid })
                      : undefined
                  }
                />
              ))}
            </AnimatePresence>
            {enemy.board.length === 0 && (
              <p className="text-xs text-muted-foreground">Their side of the table is empty.</p>
            )}
          </div>

          <div className="panel flex min-h-24 flex-wrap items-center justify-center gap-2 p-3">
            <AnimatePresence mode="popLayout">
              {player.board.map((minion) => (
                <MinionChip
                  key={minion.uid}
                  minion={minion}
                  cards={cards}
                  customArt={customArt}
                  selected={pendingAttacker === minion.uid}
                  exhausted={!minion.canAttack}
                  onClick={
                    myTurn && minion.canAttack
                      ? () => {
                          setPendingCard(null);
                          setPendingAttacker(
                            pendingAttacker === minion.uid ? null : minion.uid,
                          );
                        }
                      : undefined
                  }
                />
              ))}
            </AnimatePresence>
            {player.board.length === 0 && (
              <p className="text-xs text-muted-foreground">Play a minion to hold the table.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <HeroPanel side={player} align="bottom" />
            </div>
            <div className="flex flex-col gap-2">
              {player.weapon && (
                <Button
                  variant="secondary"
                  disabled={!myTurn || player.heroAttacked}
                  onClick={() => {
                    setPendingCard(null);
                    setPendingAttacker(pendingAttacker === "hero" ? null : "hero");
                  }}
                  className={cn(pendingAttacker === "hero" && "ring-2 ring-gold")}
                >
                  <Swords className="mr-2 size-4" />
                  Swing {player.weapon.name}
                </Button>
              )}
              <Button
                disabled={!myTurn || mutation.isPending}
                onClick={() => send({ type: "end_turn" })}
              >
                {myTurn ? "End turn" : "Opponent thinking…"}
              </Button>
            </div>
          </div>

          <div className="panel p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Your hand</p>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence mode="popLayout">
                {player.hand.map((cardId, index) => {
                  const card = cards.get(cardId);
                  if (!card) return null;
                  const affordable = card.cost <= player.mana;
                  return (
                    <motion.div
                      key={`${cardId}-${index}`}
                      layout
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 24 }}
                      whileHover={myTurn ? { y: -8 } : undefined}
                      onClick={() => handleHandClick(index, card)}
                      className={cn(
                        "w-28 cursor-pointer overflow-hidden rounded-lg bg-card ring-2 ring-border",
                        !affordable && "opacity-50",
                        pendingCard === index && "ring-4 ring-gold",
                      )}
                    >
                      <div className="relative">
                        <img
                          src={artFor(card, customArt[card.id])}
                          alt={card.name}
                          loading="lazy"
                          width={944}
                          height={704}
                          className="h-16 w-full object-cover"
                        />
                        <span className="absolute left-1 top-1 flex size-5 items-center justify-center rounded-full bg-mana text-[11px] font-bold text-background">
                          {card.cost}
                        </span>
                      </div>
                      <p className="truncate px-1 pt-0.5 text-[10px] font-semibold text-gold">
                        {card.name}
                      </p>
                      <div className="flex items-center justify-between px-1 pb-1 text-[10px]">
                        <span className="uppercase text-muted-foreground">{card.type}</span>
                        {card.type !== "spell" && (
                          <span className="flex gap-1">
                            <span className="font-bold text-ember">{card.attack}</span>
                            <span className="font-bold text-emerald">
                              {card.type === "weapon" ? card.durability : card.health}
                            </span>
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <aside className="panel h-fit max-h-[80vh] overflow-y-auto p-4">
          <p className="font-display text-sm uppercase tracking-wide text-gold">Called shots</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {[...state.log].reverse().map((entry, index) => (
              <li key={index} className={entry.startsWith("—") ? "mt-2 text-gold" : undefined}>
                {entry}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 px-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="parchment-panel w-full max-w-md p-7 text-center"
            >
              <h2 className="font-display text-3xl font-bold">
                {result.status === "won" ? "You took the pot" : "You went down"}
              </h2>
              {result.status === "won" ? (
                <p className="mt-3 text-lg">
                  +{result.cash.toLocaleString()} coin · +{result.xp} xp
                </p>
              ) : (
                <p className="mt-3 text-lg">
                  Hospital for {result.hospitalMinutes} minutes.
                </p>
              )}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/arena">Back to the arena</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={result.status === "won" ? "/shop" : "/hospital"}>
                    {result.status === "won" ? "Spend the winnings" : "Go to the sickroom"}
                  </Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
