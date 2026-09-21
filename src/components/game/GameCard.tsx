import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { artFor } from "@/lib/game/art";
import { describeRequirements } from "@/lib/game/requirements";
import type { CardDef } from "@/lib/game/types";

const rarityRing: Record<string, string> = {
  common: "ring-common/60",
  rare: "ring-rare/70",
  epic: "ring-epic/70",
  legendary: "ring-legendary/80",
};

const rarityGem: Record<string, string> = {
  common: "bg-common",
  rare: "bg-rare",
  epic: "bg-epic",
  legendary: "bg-legendary",
};

export function keywordLabel(keyword: string) {
  return keyword
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function GameCard({
  card,
  customArt,
  locked,
  size = "md",
  footer,
  onClick,
  selected,
  className,
  showRequirements = true,
}: {
  card: CardDef;
  customArt?: string | null;
  locked?: boolean;
  size?: "sm" | "md";
  footer?: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
  showRequirements?: boolean;
}) {
  const isMinion = card.type === "minion";
  const isWeapon = card.type === "weapon";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      whileHover={onClick ? { y: -6 } : undefined}
      onClick={onClick}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl bg-card ring-2 shadow-[var(--shadow-card)]",
        rarityRing[card.rarity] ?? rarityRing["common"],
        onClick && "cursor-pointer",
        selected && "ring-4 ring-gold",
        locked && "opacity-55 saturate-50",
        size === "sm" ? "w-32" : "w-44",
        className,
      )}
    >
      <div className="relative">
        <img
          src={artFor(card, customArt)}
          alt={card.name}
          loading="lazy"
          width={944}
          height={704}
          className={cn("w-full object-cover", size === "sm" ? "h-20" : "h-28")}
        />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" />
        <div className="absolute left-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-mana text-sm font-bold text-background shadow-[var(--shadow-card)]">
          {card.cost}
        </div>
        <div
          className={cn(
            "absolute right-1.5 top-1.5 size-3 rounded-full ring-1 ring-background",
            rarityGem[card.rarity] ?? rarityGem["common"],
          )}
          title={card.rarity}
        />
      </div>

      <div className="flex flex-1 flex-col gap-1 px-2 pb-2">
        <p
          className={cn(
            "font-display font-semibold leading-tight text-gold",
            size === "sm" ? "text-[11px]" : "text-sm",
          )}
        >
          {card.name}
        </p>

        {card.keywords.length > 0 && (
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {card.keywords.map(keywordLabel).join(" · ")}
          </p>
        )}

        {card.flavor && size === "md" && (
          <p className="text-xs italic leading-snug text-muted-foreground line-clamp-2">
            {card.flavor}
          </p>
        )}

        {showRequirements && (
          <p className="mt-auto text-[10px] leading-tight text-muted-foreground">
            {describeRequirements(card.requirements ?? {})}
          </p>
        )}

        <div className="mt-1 flex items-end justify-between">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {card.type}
          </span>
          <div className="flex items-center gap-1.5">
            {isMinion && (
              <>
                <span className="rounded bg-ember/20 px-1.5 text-sm font-bold text-ember">
                  {card.attack}
                </span>
                <span className="rounded bg-emerald/20 px-1.5 text-sm font-bold text-emerald">
                  {card.health}
                </span>
              </>
            )}
            {isWeapon && (
              <>
                <span className="rounded bg-ember/20 px-1.5 text-sm font-bold text-ember">
                  {card.attack}
                </span>
                <span className="rounded bg-gold/20 px-1.5 text-sm font-bold text-gold">
                  {card.durability}
                </span>
              </>
            )}
          </div>
        </div>

        {footer}
      </div>
    </motion.div>
  );
}
