import { useMemo, useState } from "react";
import { fetchPredictions } from "../lib/api";
import { usePolling } from "../lib/usePolling";
import { PairCard } from "../components/PairCard";
import type { Direction } from "../lib/types";

const POLL_MS = 5000;

type FilterOption = "all" | Direction;

export function Dashboard() {
  const { data, error, loading } = usePolling(fetchPredictions, POLL_MS);
  const [filter, setFilter] = useState<FilterOption>("all");

  const predictions = data?.predictions ?? [];

  const filtered = useMemo(() => {
    if (filter === "all") return predictions;
    return predictions.filter((p) => p.direction === filter);
  }, [predictions, filter]);

  const longCount = predictions.filter((p) => p.direction === "long").length;
  const shortCount = predictions.length - longCount;

  return (
    <div className="flex flex-1 flex-col">
      <header className="px-4 pb-3 pt-[calc(env(safe-area-inset-top)+16px)]">
        <h1 className="text-lg font-bold text-slate-100">롱/숏 신호</h1>
        <p className="mt-0.5 text-xs text-slate-500">Binance · freqtrade FreqAI 확률 예측</p>
        <div className="mt-3 flex gap-2 text-sm">
          <div className="flex-1 rounded-xl border border-slate-800 bg-[var(--color-surface)] px-3 py-2">
            <div className="text-[11px] text-slate-500">Long 우위</div>
            <div className="font-semibold text-emerald-400">{longCount}개</div>
          </div>
          <div className="flex-1 rounded-xl border border-slate-800 bg-[var(--color-surface)] px-3 py-2">
            <div className="text-[11px] text-slate-500">Short 우위</div>
            <div className="font-semibold text-rose-400">{shortCount}개</div>
          </div>
        </div>
      </header>

      <div className="flex gap-2 px-4 pb-3">
        {(["all", "long", "short"] as FilterOption[]).map((option) => (
          <button
            key={option}
            onClick={() => setFilter(option)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === option
                ? "bg-slate-100 text-slate-900"
                : "bg-slate-800/60 text-slate-400"
            }`}
          >
            {option === "all" ? "전체" : option === "long" ? "Long" : "Short"}
          </button>
        ))}
      </div>

      {error && !data && (
        <div className="mx-4 rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-300">
          서버에 연결할 수 없습니다: {error}
          <div className="mt-1 text-xs text-rose-400/80">설정 탭에서 API 주소를 확인하세요.</div>
        </div>
      )}

      {loading && !data && <div className="px-4 text-sm text-slate-500">불러오는 중…</div>}

      <div className="flex flex-col gap-3 px-4 pb-6">
        {filtered.map((prediction) => (
          <PairCard key={prediction.pair} prediction={prediction} />
        ))}
      </div>
    </div>
  );
}
