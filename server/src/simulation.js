// Simulates what a freqtrade instance running a FreqAI classifier strategy
// would report over its REST API. Every pair gets a random-walk price series
// and a mean-reverting "up probability" series (0..1) standing in for the
// FreqAI model's predicted class probability (&-up_or_down target).
//
// This engine is the ONLY thing that needs to be replaced to go live: swap
// it for a thin client that polls the real freqtrade REST API
// (/api/v1/status, /api/v1/pair_candles, custom FreqAI prediction columns)
// and the rest of the server/app is unchanged. See /freqtrade/README.md.

const PAIRS = [
  { pair: "BTC/USDT", basePrice: 63500, volatility: 0.004 },
  { pair: "ETH/USDT", basePrice: 3450, volatility: 0.005 },
  { pair: "BNB/USDT", basePrice: 585, volatility: 0.006 },
  { pair: "SOL/USDT", basePrice: 142, volatility: 0.009 },
  { pair: "XRP/USDT", basePrice: 0.58, volatility: 0.008 },
  { pair: "ADA/USDT", basePrice: 0.39, volatility: 0.008 },
  { pair: "DOGE/USDT", basePrice: 0.11, volatility: 0.012 },
  { pair: "AVAX/USDT", basePrice: 27.4, volatility: 0.01 },
];

const HISTORY_LENGTH = 60; // ~5 min of history at 5s ticks
const TICK_MS = 5000;

const MODEL_INFO = {
  model: "LightGBMClassifier",
  strategy: "LongShortProbabilityStrategy",
  target: "&-up_or_down",
  classes: ["down", "up"],
  train_features: ["rsi", "macd_hist", "ema_fast_slow_delta", "bb_percent", "volume_z"],
  last_trained: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
  retrain_interval: "4h",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function gaussianRandom() {
  // Box-Muller
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

class PairState {
  constructor(pair, basePrice, volatility) {
    this.pair = pair;
    this.price = basePrice;
    this.openPrice = basePrice;
    this.volatility = volatility;
    // Start near neutral with a small random bias per pair.
    this.upProbability = clamp(0.5 + gaussianRandom() * 0.08, 0.15, 0.85);
    this.trend = gaussianRandom() * 0.02; // slow-moving underlying bias
    this.history = [];
    this.seedHistory();
  }

  seedHistory() {
    const now = Date.now();
    for (let i = HISTORY_LENGTH - 1; i >= 0; i--) {
      this.step(false);
      this.history.push({
        timestamp: now - i * TICK_MS,
        price: this.price,
        up_probability: this.upProbability,
      });
    }
  }

  step(record = true) {
    // Slowly wander the underlying trend bias (regime drift).
    this.trend = clamp(this.trend + gaussianRandom() * 0.004, -0.05, 0.05);

    // Price random walk with drift from trend.
    const drift = this.trend * this.volatility;
    const shock = gaussianRandom() * this.volatility;
    this.price = Math.max(0.0000001, this.price * (1 + drift + shock));

    // Probability mean-reverts toward a level implied by the trend, with noise.
    // This mimics a classifier whose confidence tracks the underlying regime
    // but still fluctuates tick to tick.
    const target = clamp(0.5 + this.trend * 6, 0.05, 0.95);
    const meanReversion = (target - this.upProbability) * 0.15;
    const noise = gaussianRandom() * 0.03;
    this.upProbability = clamp(this.upProbability + meanReversion + noise, 0.02, 0.98);

    if (record) {
      this.history.push({
        timestamp: Date.now(),
        price: this.price,
        up_probability: this.upProbability,
      });
      if (this.history.length > HISTORY_LENGTH) this.history.shift();
    }
  }

  changePct() {
    return ((this.price - this.openPrice) / this.openPrice) * 100;
  }

  direction() {
    return this.upProbability >= 0.5 ? "long" : "short";
  }

  confidence() {
    const distance = Math.abs(this.upProbability - 0.5) * 2; // 0..1
    if (distance >= 0.5) return "strong";
    if (distance >= 0.2) return "moderate";
    return "weak";
  }

  toSummary() {
    return {
      pair: this.pair,
      price: this.price,
      change_pct_24h: this.changePct(),
      direction: this.direction(),
      up_probability: this.upProbability,
      down_probability: 1 - this.upProbability,
      confidence: this.confidence(),
      updated_at: new Date().toISOString(),
    };
  }

  toDetail() {
    return {
      ...this.toSummary(),
      history: this.history,
      model: MODEL_INFO,
    };
  }
}

export class SimulationEngine {
  constructor() {
    this.states = new Map(PAIRS.map((p) => [p.pair, new PairState(p.pair, p.basePrice, p.volatility)]));
    this.timer = null;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      for (const state of this.states.values()) state.step(true);
    }, TICK_MS);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  listPairs() {
    return [...this.states.keys()];
  }

  listPredictions() {
    return [...this.states.values()].map((s) => s.toSummary());
  }

  getDetail(pair) {
    const state = this.states.get(pair);
    return state ? state.toDetail() : null;
  }

  modelInfo() {
    return MODEL_INFO;
  }
}
