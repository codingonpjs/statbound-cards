import { useEffect, useState } from "react";

import { formatDuration } from "@/lib/game/regen";

/** Live ticking countdown to an absolute moment. */
export function Countdown({
  target,
  onDone,
  prefix,
}: {
  target: number | null;
  onDone?: () => void;
  prefix?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (target !== null && now >= target && onDone) onDone();
  }, [now, target, onDone]);

  if (target === null) return <span>full</span>;
  const remaining = target - now;
  if (remaining <= 0) return <span>ready</span>;

  return (
    <span>
      {prefix}
      {formatDuration(remaining)}
    </span>
  );
}
