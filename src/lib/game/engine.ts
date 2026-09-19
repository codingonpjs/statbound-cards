import {
  BOARD_LIMIT,
  HAND_LIMIT,
  HERO_LIFE,
  MANA_LIMIT,
  type BattleAction,
  type BattleState,
  type CardDef,
  type CardIndex,
  type CardEffect,
  type CombatStats,
  type MinionState,
  type SideKey,
  type SideState,
  type TargetRef,
} from "./types";

/* ---------------------------------------------------------------- rng */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nextRandom(state: BattleState): number {
  const rand = mulberry32(state.seed);
  const value = rand();
  state.seed = Math.floor(value * 2147483647) || 1;
  return value;
}

function shuffle<T>(items: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const a = out[i]!;
    const b = out[j]!;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/* -------------------------------------------------- stat derivations */

export function armorFromDefense(defense: number): number {
  return Math.min(12, Math.floor(defense / 90));
}

export function weaponBonusFromStrength(strength: number): number {
  return Math.min(5, Math.floor(strength / 180));
}

export function dodgeChanceFromDexterity(dexterity: number): number {
  return Math.min(0.3, dexterity / 2400);
}

/* ------------------------------------------------------------ helpers */

export function statSummary(stats: CombatStats) {
  return {
    armor: armorFromDefense(stats.defense),
    weaponBonus: weaponBonusFromStrength(stats.strength),
    dodgeChance: dodgeChanceFromDexterity(stats.dexterity),
  };
}

function makeSide(
  key: SideKey,
  name: string,
  deck: string[],
  stats: CombatStats,
  seed: number,
): SideState {
  const derived = statSummary(stats);
  return {
    key,
    name,
    life: HERO_LIFE,
    maxLife: HERO_LIFE,
    armor: derived.armor,
    mana: 0,
    maxMana: 0,
    deck: shuffle(deck, seed),
    hand: [],
    board: [],
    weapon: null,
    weaponBonus: derived.weaponBonus,
    dodgeChance: derived.dodgeChance,
    dodgeUsed: false,
    heroAttacked: false,
    fatigue: 0,
    stats,
  };
}

function other(side: SideKey): SideKey {
  return side === "player" ? "enemy" : "player";
}

function sideOf(state: BattleState, key: SideKey): SideState {
  return key === "player" ? state.player : state.enemy;
}

function log(state: BattleState, message: string) {
  state.log.push(message);
  if (state.log.length > 80) state.log.splice(0, state.log.length - 80);
}

function draw(state: BattleState, key: SideKey, count = 1) {
  const side = sideOf(state, key);
  for (let i = 0; i < count; i += 1) {
    const cardId = side.deck.shift();
    if (!cardId) {
      side.fatigue += 1;
      dealHeroDamage(state, key, side.fatigue, { ignoreArmor: true, ignoreDodge: true });
      log(state, `${side.name} is out of cards and takes ${side.fatigue} fatigue damage.`);
      continue;
    }
    if (side.hand.length >= HAND_LIMIT) {
      log(state, `${side.name}'s hand is full — a card is burned.`);
      continue;
    }
    side.hand.push(cardId);
  }
}

function dealHeroDamage(
  state: BattleState,
  key: SideKey,
  amount: number,
  opts: { ignoreArmor?: boolean; ignoreDodge?: boolean } = {},
) {
  const side = sideOf(state, key);
  let remaining = amount;
  if (remaining <= 0) return;

  if (!opts.ignoreDodge && !side.dodgeUsed && side.dodgeChance > 0) {
    side.dodgeUsed = true;
    if (nextRandom(state) < side.dodgeChance) {
      log(state, `${side.name} dodges the blow!`);
      return;
    }
  }

  if (!opts.ignoreArmor && side.armor > 0) {
    const absorbed = Math.min(side.armor, remaining);
    side.armor -= absorbed;
    remaining -= absorbed;
    if (absorbed > 0) log(state, `${side.name}'s armour absorbs ${absorbed}.`);
  }

  if (remaining > 0) {
    side.life -= remaining;
    log(state, `${side.name} takes ${remaining} damage (${Math.max(0, side.life)} life left).`);
  }
}

function damageMinion(state: BattleState, side: SideState, minion: MinionState, amount: number) {
  if (amount <= 0) return;
  if (minion.divineShield) {
    minion.divineShield = false;
    log(state, `${minion.name}'s divine shield breaks.`);
    return;
  }
  minion.health -= amount;
  if (minion.health <= 0) {
    side.board = side.board.filter((m) => m.uid !== minion.uid);
    log(state, `${minion.name} is destroyed.`);
  }
}

function healHero(state: BattleState, key: SideKey, amount: number) {
  const side = sideOf(state, key);
  const before = side.life;
  side.life = Math.min(side.maxLife, side.life + amount);
  log(state, `${side.name} restores ${side.life - before} health.`);
}

function findTarget(state: BattleState, ref: TargetRef) {
  const side = sideOf(state, ref.side);
  if (ref.kind === "hero") return { side, minion: null as MinionState | null };
  const minion = side.board.find((m) => m.uid === ref.uid) ?? null;
  return { side, minion };
}

function hasTaunt(side: SideState): boolean {
  return side.board.some((m) => m.keywords.includes("taunt"));
}

export function legalAttackTargets(state: BattleState, actor: SideKey): TargetRef[] {
  const foe = sideOf(state, other(actor));
  const taunts = foe.board.filter((m) => m.keywords.includes("taunt"));
  if (taunts.length > 0) {
    return taunts.map((m) => ({ kind: "minion", side: foe.key, uid: m.uid }) as TargetRef);
  }
  return [
    ...foe.board.map((m) => ({ kind: "minion", side: foe.key, uid: m.uid }) as TargetRef),
    { kind: "hero", side: foe.key } as TargetRef,
  ];
}

/* ------------------------------------------------------------ effects */

function applyEffect(
  state: BattleState,
  actor: SideKey,
  effect: CardEffect,
  target: TargetRef | undefined,
) {
  const foeKey = other(actor);
  switch (effect.kind) {
    case "damage": {
      const ref: TargetRef = target ?? { kind: "hero", side: foeKey };
      const found = findTarget(state, ref);
      if (found.minion) damageMinion(state, found.side, found.minion, effect.amount);
      else dealHeroDamage(state, found.side.key, effect.amount, { ignoreDodge: true });
      break;
    }
    case "heal": {
      const key = effect.target === "enemy_hero" ? foeKey : actor;
      healHero(state, key, effect.amount);
      break;
    }
    case "buff": {
      const side = sideOf(state, effect.target === "enemy_minions" ? foeKey : actor);
      for (const minion of side.board) {
        minion.attack += effect.attack;
        minion.health += effect.health;
        minion.maxHealth += effect.health;
      }
      log(state, `${side.name}'s minions gain +${effect.attack}/+${effect.health}.`);
      break;
    }
    case "draw": {
      draw(state, actor, effect.amount);
      break;
    }
    case "aoe": {
      const side = sideOf(state, effect.target === "friendly_minions" ? actor : foeKey);
      for (const minion of [...side.board]) {
        damageMinion(state, side, minion, effect.amount);
      }
      log(state, `${effect.amount} damage sweeps ${side.name}'s minions.`);
      break;
    }
    case "multi": {
      for (const child of effect.effects) applyEffect(state, actor, child, target);
      break;
    }
  }
}

/* ------------------------------------------------------------- turns */

function startTurn(state: BattleState, key: SideKey) {
  const side = sideOf(state, key);
  side.maxMana = Math.min(MANA_LIMIT, side.maxMana + 1);
  side.mana = side.maxMana;
  side.dodgeUsed = false;
  side.heroAttacked = false;
  for (const minion of side.board) minion.canAttack = true;
  draw(state, key, 1);
  log(state, `— ${side.name}'s turn —`);
}

function checkStatus(state: BattleState) {
  if (state.player.life <= 0 && state.enemy.life <= 0) state.status = "lost";
  else if (state.enemy.life <= 0) state.status = "won";
  else if (state.player.life <= 0) state.status = "lost";
}

/* -------------------------------------------------------------- setup */

export function createBattle(opts: {
  playerName: string;
  enemyName: string;
  playerDeck: string[];
  enemyDeck: string[];
  playerStats: CombatStats;
  enemyStats: CombatStats;
  seed?: number;
}): BattleState {
  const seed = opts.seed ?? Math.floor(Math.random() * 2147483647) || 1;
  const state: BattleState = {
    player: makeSide("player", opts.playerName, opts.playerDeck, opts.playerStats, seed),
    enemy: makeSide("enemy", opts.enemyName, opts.enemyDeck, opts.enemyStats, seed + 7),
    turn: "player",
    turnNumber: 1,
    log: [],
    status: "active",
    seed,
    version: 1,
  };

  const playerFirst =
    opts.playerStats.speed >= opts.enemyStats.speed;
  state.turn = playerFirst ? "player" : "enemy";
  log(
    state,
    playerFirst
      ? `${opts.playerName} is faster and moves first.`
      : `${opts.enemyName} is faster and moves first.`,
  );

  draw(state, "player", playerFirst ? 3 : 4);
  draw(state, "enemy", playerFirst ? 4 : 3);

  startTurn(state, state.turn);
  return state;
}

/* ------------------------------------------------------------ actions */

export class IllegalMoveError extends Error {}

export function playCard(
  state: BattleState,
  cards: CardIndex,
  actor: SideKey,
  handIndex: number,
  target?: TargetRef,
): BattleState {
  const side = sideOf(state, actor);
  const cardId = side.hand[handIndex];
  if (!cardId) throw new IllegalMoveError("That card is not in hand.");
  const card = cards[cardId];
  if (!card) throw new IllegalMoveError("Unknown card.");
  if (card.cost > side.mana) throw new IllegalMoveError("Not enough mana.");

  if (card.type === "minion" && side.board.length >= BOARD_LIMIT) {
    throw new IllegalMoveError("The board is full.");
  }

  side.mana -= card.cost;
  side.hand.splice(handIndex, 1);
  log(state, `${side.name} plays ${card.name}.`);

  if (card.type === "minion") {
    const minion: MinionState = {
      uid: `${actor}-${cardId}-${state.turnNumber}-${side.board.length}-${Math.floor(
        nextRandom(state) * 100000,
      )}`,
      cardId,
      name: card.name,
      attack: card.attack,
      health: card.health,
      maxHealth: card.health,
      keywords: [...card.keywords],
      canAttack: card.keywords.includes("charge"),
      divineShield: card.keywords.includes("divine_shield"),
    };
    side.board.push(minion);
    if (card.effect) applyEffect(state, actor, card.effect, target);
  } else if (card.type === "weapon") {
    side.weapon = {
      cardId,
      name: card.name,
      attack: card.attack + side.weaponBonus,
      durability: card.durability,
    };
    if (side.weaponBonus > 0) {
      log(state, `Strength adds +${side.weaponBonus} to ${card.name}.`);
    }
  } else if (card.effect) {
    applyEffect(state, actor, card.effect, target);
  }

  checkStatus(state);
  return state;
}

export function attack(
  state: BattleState,
  actor: SideKey,
  attackerId: string,
  target: TargetRef,
): BattleState {
  const side = sideOf(state, actor);
  const foeKey = other(actor);
  const foe = sideOf(state, foeKey);

  if (target.side !== foeKey) throw new IllegalMoveError("You can only attack the enemy.");
  if (target.kind === "hero" && hasTaunt(foe)) {
    throw new IllegalMoveError("A taunt minion must be dealt with first.");
  }

  const defender = target.kind === "minion" ? foe.board.find((m) => m.uid === target.uid) : null;
  if (target.kind === "minion") {
    if (!defender) throw new IllegalMoveError("That minion is gone.");
    if (hasTaunt(foe) && !defender.keywords.includes("taunt")) {
      throw new IllegalMoveError("A taunt minion must be dealt with first.");
    }
  }

  if (attackerId === "hero") {
    if (!side.weapon) throw new IllegalMoveError("You have no weapon equipped.");
    if (side.heroAttacked) throw new IllegalMoveError("Your hero already attacked this turn.");
    const power = side.weapon.attack;
    side.heroAttacked = true;
    log(state, `${side.name} swings ${side.weapon.name} for ${power}.`);
    if (defender) {
      damageMinion(state, foe, defender, power);
      dealHeroDamage(state, actor, defender.attack, { ignoreDodge: true });
    } else {
      dealHeroDamage(state, foeKey, power);
    }
    side.weapon.durability -= 1;
    if (side.weapon.durability <= 0) {
      log(state, `${side.weapon.name} breaks.`);
      side.weapon = null;
    }
  } else {
    const attacker = side.board.find((m) => m.uid === attackerId);
    if (!attacker) throw new IllegalMoveError("That minion is not on your board.");
    if (!attacker.canAttack) throw new IllegalMoveError(`${attacker.name} cannot attack yet.`);
    attacker.canAttack = false;
    log(state, `${attacker.name} attacks.`);
    if (defender) {
      const incoming = defender.attack;
      damageMinion(state, foe, defender, attacker.attack);
      damageMinion(state, side, attacker, incoming);
    } else {
      dealHeroDamage(state, foeKey, attacker.attack);
    }
  }

  checkStatus(state);
  return state;
}

export function endTurn(state: BattleState): BattleState {
  const next = other(state.turn);
  state.turn = next;
  state.turnNumber += 1;
  startTurn(state, next);
  checkStatus(state);
  return state;
}

export function applyPlayerAction(
  state: BattleState,
  cards: CardIndex,
  action: BattleAction,
): BattleState {
  if (state.status !== "active") throw new IllegalMoveError("This battle is over.");
  if (state.turn !== "player") throw new IllegalMoveError("It is not your turn.");

  switch (action.type) {
    case "play_card":
      return playCard(state, cards, "player", action.handIndex, action.target);
    case "attack":
      return attack(state, "player", action.attacker, action.target);
    case "end_turn":
      return endTurn(state);
  }
}

export function cloneState(state: BattleState): BattleState {
  return JSON.parse(JSON.stringify(state)) as BattleState;
}

export function cardsIndex(defs: CardDef[]): CardIndex {
  return Object.fromEntries(defs.map((card) => [card.id, card]));
}

export { other as opposingSide, sideOf, hasTaunt, log as pushLog, nextRandom };
