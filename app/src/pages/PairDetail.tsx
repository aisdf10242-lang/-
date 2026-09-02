import { useParams, Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchPredictionDetail } from "../lib/api";
import { usePolling } from "../lib/usePolling";
import { DirectionBadge } from "../components/DirectionBadge";
import { ProbabilityBar } from "../components/ProbabilityBar";

const POLL_MS = 5000;

const confidenceLabel = { weak: "낮음", moderate: "보통", strong: "높음" } as const;

export function PairDetail() {
  const { pair = "" } = useParams();
  const { data, error, loading } = usePolling(() => fetchPredictionDetail(pair), POLL_MS, [pair]);

  if (loading && !data) {
    return <div className="p-4 text-sm text-slate-500">불러오는 중…</div>;
  }

  if (error && !data) {
    return (
      <div className="p-4">
        <Link to="/" className="text-sm text-slate-400">← 대시보드로</Link>
        <div className="mt-3 rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-300">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const chartData = data.history.map((h) => ({
    time: new Date(h.timestamp).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    up_probability: Math.round(h.up_probability * 1000) / 10,
    price: h.price,
  }));

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-[calc(env(safe-area-inset-top)+16px)]">
      <Link to="/" className="text-sm text-slate-400">← 대시보드</Link>

      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-100">{data.pair}</h1>
          <DirectionBadge direction={data.direction} />
        </div>
        <div className="mt-1 text-sm text-slate-400">
          ${data.price.toLocaleString("en-US", { maximumFractionDigits: 6 })}{" "}
          <span className={data.change_pct_24h >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {data.change_pct_24h >= 0 ? "+" : ""}
            {data.change_pct_24h.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[var(--color-surface)] p-4">
        <div className="mb-2 text-sm font-medium text-slate-300">확률 (FreqAI 예측)</div>
        <ProbabilityBar upProbability={data.up_probability} />
        <div className="mt-2 text-xs text-slate-500">신뢰도: {confidenceLabel[data.confidence]}</div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[var(--color-surface)] p-4">
        <div className="mb-2 text-sm font-medium text-slate-300">Long 확률 추이</div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="upGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#64748b" }} interval="preserveStartEnd" />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fontSize: 10, fill: "#64748b" }}
                width={30}
              />
              <Tooltip
                contentStyle={{ background: "#111a2e", border: "1px solid #223252", fontSize: 12 }}
                formatter={(value) => [`${value}%`, "Long 확률"]}
              />
              <Area type="monotone" dataKey="up_probability" stroke="#22c55e" fill="url(#upGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[var(--color-surface)] p-4 text-xs text-slate-400">
        <div className="mb-2 text-sm font-medium text-slate-300">모델 정보</div>
        <dl className="grid grid-cols-2 gap-y-1.5">
          <dt className="text-slate-500">전략</dt>
          <dd>{data.model.strategy}</dd>
          <dt className="text-slate-500">모델</dt>
          <dd>{data.model.model}</dd>
          <dt className="text-slate-500">타깃</dt>
          <dd className="font-mono">{data.model.target}</dd>
          <dt className="text-slate-500">재학습 주기</dt>
          <dd>{data.model.retrain_interval}</dd>
          <dt className="text-slate-500">최근 학습</dt>
          <dd>{new Date(data.model.last_trained).toLocaleString("ko-KR")}</dd>
        </dl>
      </div>
    </div>
  );
}
