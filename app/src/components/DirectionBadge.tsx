import type { Direction } from "../lib/types";

export function DirectionBadge({ direction }: { direction: Direction }) {
  const isLong = direction === "long";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        isLong ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
      }`}
    >
      {isLong ? "▲ LONG" : "▼ SHORT"}
    </span>
  );
}
