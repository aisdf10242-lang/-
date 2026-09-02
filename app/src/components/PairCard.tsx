import { Link } from "react-router-dom";
import type { PredictionSummary } from "../lib/types";
import { DirectionBadge } from "./DirectionBadge";
import { ProbabilityBar } from "./ProbabilityBar";

function formatPrice(price: number) {
  const digits = price >= 100 ? 2 : price >= 1 ? 4 : 6;
  return price.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

const confidenceLabel: Record<PredictionSummary["confidence"], string> = {
  weak: "낮음",
  moderate: "보통",
  strong: "높음",
};

export function PairCard({ prediction }: { prediction: PredictionSummary }) {
  const changeColor = prediction.change_pct_24h >= 0 ? "text-emerald-400" : "text-rose-400";
  return (
    <Link
      to={`/pair/${encodeURIComponent(prediction.pair)}`}
      className="block rounded-2xl border border-slate-800 bg-[var(--color-surface)] p-4 transition active:scale-[0.98] active:bg-[var(--color-surface-2)]"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-slate-100">{prediction.pair}</div>
          <div className="mt-0.5 text-sm text-slate-400">
            ${formatPrice(prediction.price)}{" "}
            <span className={changeColor}>
              {prediction.change_pct_24h >= 0 ? "+" : ""}
              {prediction.change_pct_24h.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="text-right">
          <DirectionBadge direction={prediction.direction} />
          <div className="mt-1 text-[11px] text-slate-500">신뢰도 {confidenceLabel[prediction.confidence]}</div>
        </div>
      </div>
      <div className="mt-3">
        <ProbabilityBar upProbability={prediction.up_probability} />
      </div>
    </Link>
  );
}
