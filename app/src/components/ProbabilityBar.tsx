export function ProbabilityBar({ upProbability }: { upProbability: number }) {
  const upPct = Math.round(upProbability * 100);
  const downPct = 100 - upPct;
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full bg-emerald-500" style={{ width: `${upPct}%` }} />
        <div className="h-full bg-rose-500" style={{ width: `${downPct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span className="text-emerald-400">Long {upPct}%</span>
        <span className="text-rose-400">Short {downPct}%</span>
      </div>
    </div>
  );
}
