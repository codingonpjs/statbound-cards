import {
  attack,
  endTurn,
  hasTaunt,
  IllegalMoveError,
  playCard,
  sideOf,
} from "./engine";
import type { BattleState, CardIndex, TargetRef } from "./types";

/**
 * Opponent brain. Plays the most expensive affordable cards, clears taunts,
 * trades favourably, and goes face when lethal is within reach.
 */
export function runEnemyTurn(state: BattleState, cards: CardIndex): BattleState {
  if (state.status !== "active" || state.turn !== "enemy") return state;

  let guard = 0;
  // 1) Spend mana, biggest first.
  while (guard < 40) {
    guard += 1;
    const me = sideOf(state, "enemy");
    const playable = me.hand
      .map((cardId, handIndex) => ({ card: cards[cardId], handIndex }))
      .filter((entry) => entry.card && entry.card.cost <= me.mana)
      .sort((a, b) => b.card!.cost - a.card!.cost);

    const choice = playable[0];
    if (!choice || !choice.card) break;
    if (choice.card.type === "minion" && me.board.length >= 7) {
      const alt = playable.find((entry) => entry.card!.type !== "minion");
      if (!alt) break;
      try {
        playCard(state, cards, "enemy", alt.handIndex, pickEffectTarget(state));
      } catch (error) {
        if (error instanceof IllegalMoveError) break;
        throw error;
      }
      continue;
    }
    try {
      playCard(state, cards, "enemy", choice.handIndex, pickEffectTarget(state));
    } catch (error) {
      if (error instanceof IllegalMoveError) break;
      throw error;
    }
    if (state.status !== "active") return state;
  }

  // 2) Attack.
  guard = 0;
  while (guard < 30 && state.status === "active") {
    guard += 1;
    const me = sideOf(state, "enemy");
    const foe = sideOf(state, "player");
    const attackers = me.board.filter((m) => m.canAttack && m.attack > 0);
    const heroCanSwing = !!me.weapon && !me.heroAttacked;
    if (attackers.length === 0 && !heroCanSwing) break;

    const totalPower =
      attackers.reduce((sum, m) => sum + m.attack, 0) + (heroCanSwing ? me.weapon!.attack : 0);
    const lethal = !hasTaunt(foe) && totalPower >= foe.life + foe.armor;

    const taunts = foe.board.filter((m) => m.keywords.includes("taunt"));
    const attacker = attackers[0];

    let target: TargetRef;
    if (taunts.length > 0) {
      const weakest = [...taunts].sort((a, b) => a.health - b.health)[0]!;
      target = { kind: "minion", side: "player", uid: weakest.uid };
    } else if (lethal) {
      target = { kind: "hero", side: "player" };
    } else {
      const power = attacker?.attack ?? me.weapon?.attack ?? 0;
      const trade = [...foe.board]
        .filter((m) => m.health <= power)
        .sort((a, b) => b.attack - a.attack)[0];
      target = trade
        ? { kind: "minion", side: "player", uid: trade.uid }
        : { kind: "hero", side: "player" };
    }

    try {
      attack(state, "enemy", attacker ? attacker.uid : "hero", target);
    } catch (error) {
      if (error instanceof IllegalMoveError) break;
      throw error;
    }
  }

  if (state.status !== "active") return state;
  return endTurn(state);
}

function pickEffectTarget(state: BattleState): TargetRef {
  const foe = sideOf(state, "player");
  const finishable = [...foe.board].sort((a, b) => b.attack - a.attack)[0];
  if (finishable) return { kind: "minion", side: "player", uid: finishable.uid };
  return { kind: "hero", side: "player" };
}
