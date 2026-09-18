# Tavern Brawl: a Torn-style RPG with Hearthstone-style card battles

A persistent browser MMO-lite. Players train stats in the gym, commit crimes for cash, buy cards whose availability is gated by their stats, build a deck, and fight NPCs or other players in a turn-based card battle.

## The core loop

```text
Energy --> Gym --> Stats rise --> Better cards unlock in the Shop
Nerve  --> Crimes --> Cash + XP --> Buy cards, build deck
Deck   --> Battle (NPC or player) --> Win: cash + XP / Lose: Hospital timer
```

## Pages

1. **Sign in / Sign up** — email + password, creates a character with starting stats, cash, and a starter deck.
2. **Home (tavern)** — character sheet: level, cash, Strength / Defense / Speed / Dexterity, energy / nerve / life bars with live regen countdowns, hospital status.
3. **Gym** — spend energy to train one of the 4 stats. Gains scale with current stat and energy spent.
4. **Crimes** — list of crimes (pickpocket, smuggling, heist...). Each costs nerve, has a success chance driven by stats + level; success pays cash and XP, failure can send you to hospital.
5. **Card Shop** — full card catalog. Every card shows its stat requirement (e.g. "Strength 150" or "Speed 80 + Dexterity 60"). Locked cards are greyed with the missing requirement shown. Buying spends cash; owned copies tracked (max 2 per deck).
6. **Deck Builder** — 20-card deck from owned cards. Cards you no longer meet requirements for cannot be added.
7. **Arena** — pick an opponent: a ladder of NPC bosses (tavern drunk to guild champion) or a searchable list of other players (their saved deck is piloted by the AI). Attacking requires energy and full life.
8. **Battle screen** — the Hearthstone-style board.
9. **Hospital** — countdown after a loss; can't attack or be attacked until it ends.

## Battle rules (Hearthstone-style)

- Both heroes start at 30 life. Each turn you gain one mana crystal (max 10) and draw a card; hand max 8, deck-out fatigue damage.
- Card types: **Minions** (attack / health, may have Taunt, Charge, Divine Shield), **Spells** (damage, heal, buff, draw), **Weapons** (hero attacks with durability).
- Board holds up to 7 minions per side; minions summoned this turn cannot attack (unless Charge); Taunt must be attacked first.
- Your stats matter in battle too: Strength adds a small bonus to weapon damage, Defense adds starting armor, Speed decides who goes first, Dexterity gives a chance to dodge the first hit each turn.
- Opponent AI: plays the highest-value affordable cards, trades into Taunts, goes face when lethal is in reach.
- Win: cash + XP based on opponent difficulty. Lose: hospital timer scaled by opponent strength.

## Card gating by stats

Each card has a rarity and a requirements object. Examples:
- *Bar Brawler* (2 mana 3/2) — no requirement (starter)
- *Ironhide Bouncer* (4 mana 3/6 Taunt) — Defense 100
- *Quickblade Rogue* (3 mana 4/2 Charge) — Speed 120 + Dexterity 80
- *Warlord's Greataxe* (5 mana weapon 5/2) — Strength 300 + Level 10

Gating is enforced when buying, when building a deck, and re-checked when a battle starts, so stats always determine the usable card pool. Around 45 cards across 5 tiers ship in the first version.

## Timers (Torn-style)

- Energy: max 100, +5 every 10 minutes. Nerve: max 25, +1 every 5 minutes. Life: regenerates to full over 30 minutes.
- Computed from last-updated timestamps, so nothing runs in the background; the UI shows live countdowns.

## Look and feel: Fantasy tavern

Dark oak background, parchment panels, gold-leaf accents, ember-red for damage and emerald for healing. Headings in Cinzel (carved-stone feel), body in Crimson Pro. Cards have an ornate gold frame with a gem showing mana cost; rarity gem colors (common grey, rare blue, epic purple, legendary orange). Playing a card slides it onto the board; attacks lunge toward the target with a hit flash; damage numbers pop. Gym/crime results appear as parchment scrolls.

## Card artwork is swappable

Each card's art is a separate image, not baked into the card design, so it can be changed any time:

- Every card ships with generated default art that fills the frame's art window.
- A **Card Art** manager page lets you pick any card and upload your own image; it is cropped to the art window and appears everywhere that card shows (shop, deck builder, battle board).
- Uploads go to cloud file storage; the card row keeps the image address, and a "Reset to default" button restores the original art.
- Optional per-player art: a custom image you upload applies only to your own copy of the card, unless you set it as the global default for the whole game (admin-only).


## Technical details

**Backend: Lovable Cloud** (enabled as the first implementation step). Email/password auth.

Tables (all with row-level security and grants):
- `profiles` — user_id, name, level, xp, cash, strength, defense, speed, dexterity, energy, nerve, life, energy_updated_at, nerve_updated_at, life_updated_at, hospital_until, wins, losses
- `cards` — static catalog seeded by migration (name, type, cost, attack, health, keywords, effect JSON, rarity, price, requirements JSON, `art_url`, `default_art_url`)
- `player_cards` — user_id, card_id, quantity, `custom_art_url` (null = use the card's art)
- `decks` — user_id, card_ids[] (active deck)
- `battles` — id, attacker_id, defender_id / npc_id, state JSON, turn, status, created_at
- `crimes` (static seed) and `crime_log`, `npcs` (static seed)
- Storage bucket `card-art` (public read, authenticated write scoped to the uploader's folder)


Server functions (`createServerFn` under `src/lib/*.functions.ts`), all authenticated:
- `getProfile` (applies regen math and hospital release), `train`, `commitCrime`, `buyCard`, `saveDeck`
- `startBattle`, `playBattleAction` (play card / attack / end turn), which validates the move, mutates battle state, runs the AI turn, checks win/lose, and pays rewards. The battle engine is a pure TypeScript module shared for client-side previews and server-side authority, so the client can never cheat.
- `listOpponents` — NPC ladder plus other players not in hospital.
- `setCardArt` / `resetCardArt` — validates the upload (image type, size cap), stores it, and updates the art address.


Frontend: TanStack Start routes under `_authenticated/` for all game pages; TanStack Query for data; battle board built with Motion for React animations; design tokens in `src/styles.css` (oklch), fonts loaded via `<link>` in the root route. Each route gets its own head metadata.

## Build order

1. Enable Lovable Cloud, auth pages, profile creation, tavern home with timers.
2. Gym and Crimes.
3. Card catalog seed with default art, Shop with stat gating, Deck Builder, Card Art upload manager.
4. Battle engine (pure module) + NPC AI + unit tests for rules.
5. Battle screen UI and Arena (NPC ladder, then player attacks).
6. Hospital, rewards, polish and animations.
