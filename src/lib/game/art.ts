import bard from "@/assets/art-bard.jpg";
import beast from "@/assets/art-beast.jpg";
import bouncer from "@/assets/art-bouncer.jpg";
import brawler from "@/assets/art-brawler.jpg";
import champion from "@/assets/art-champion.jpg";
import mage from "@/assets/art-mage.jpg";
import rogue from "@/assets/art-rogue.jpg";
import spell from "@/assets/art-spell.jpg";
import weapon from "@/assets/art-weapon.jpg";

export const ART_KEYS = [
  "brawler",
  "bouncer",
  "rogue",
  "mage",
  "beast",
  "bard",
  "weapon",
  "spell",
  "champion",
] as const;

export const defaultArt: Record<string, string> = {
  brawler,
  bouncer,
  rogue,
  mage,
  beast,
  bard,
  weapon,
  spell,
  champion,
};

/** Resolve the artwork shown for a card: player upload > global override > archetype default. */
export function artFor(
  card: { art_key: string; art_url?: string | null },
  customArtUrl?: string | null,
): string {
  return customArtUrl || card.art_url || defaultArt[card.art_key] || brawler;
}
