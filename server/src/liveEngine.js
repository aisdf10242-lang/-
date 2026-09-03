// Adapts a real freqtrade + FreqAI instance's REST API into the same shape
// SimulationEngine produces, so index.js's routes don't need to know which
// one is in use. This is the piece described in freqtrade/README.md step 5.
//
// How it maps FreqAI output:
// LongShortProbabilityStrategy sets the classification target
// `&-up_or_down` with classes ["down", "up"]. FreqAI strips the leading
// "&-" and appends the class name to build probability columns, so the
// live dataframe (from /api/v1/pair_candles) carries `up_or_down_up` /
// `up_or_down_down` (the predicted class probabilities, sum to 1) and
// `do_predict` (1 once the model has warmed up and is producing real
// predictions). If you rename the target or classes in the strategy,
// update TARGET_UP_COLUMN / TARGET_DOWN_COLUMN below to match.
//
// If your freqtrade/FreqAI version names these columns differently, the
// refresh loop logs a clear error per-pair instead of crashing the server.

import { FreqtradeClient } from "./freqtradeClient.js";

const TARGET_UP_COLUMN = "up_or_down_up";
const TARGET_DOWN_COLUMN = "up_or_down_down";
const HISTORY_LIMIT = 60;
const REFRESH_MS = 15000;

function timeframeToMinutes(timeframe) {
  const match = /^(\d+)([mhd])$/.exec(timeframe);
  if (!match) return 15;
  const [, amount, unit] = match;
  const multiplier = { m: 1, h: 60, d: 1440 }[unit];
  return Number(amount) * multiplier;
}

export class LiveEngine {
  constructor({ apiUrl, username, password, timeframe, pairs }) {
    this.client = new FreqtradeClient({ apiUrl, username, password });
    this.timeframe = timeframe || "15m";
    this.explicitPairs = pairs?.length ? pairs : null;
    this.pairs = [];
    this.details = new Map(); // pair -> PredictionDetail
    this.model = { mode: "live" };
    this.timer = null;
  }

  async start() {
    await this.client.ping();
    try {
      this.model = { ...this.model, ...(await this.buildModelInfo()) };
    } catch (err) {
      console.error("Could not read freqtrade config, continuing without it:", err.message);
    }
    await this.refresh();
    this.timer = setInterval(() => {
      this.refresh().catch((err) => console.error("Live refresh failed:", err.message));
    }, REFRESH_MS);
    this.timer.unref?.();
  }

  async buildModelInfo() {
    const config = await this.client.getShowConfig();
    return {
      strategy: config.strategy ?? "unknown",
      dry_run: config.dry_run,
      state: config.state,
      target: "&-up_or_down",
      classes: ["down", "up"],
    };
  }

  async refresh() {
    this.pairs = this.explicitPairs ?? (await this.client.getWhitelist());
    await Promise.all(
      this.pairs.map(async (pair) => {
        try {
          this.details.set(pair, await this.fetchPairDetail(pair));
        } catch (err) {
          console.error(`Failed to refresh ${pair} from freqtrade:`, err.message);
        }
      })
    );
  }

  async fetchPairDetail(pair) {
    const candles = await this.client.getPairCandles(pair, this.timeframe, HISTORY_LIMIT);
    const columns = candles.columns ?? [];
    const dateIdx = columns.indexOf("date");
    const closeIdx = columns.indexOf("close");
    const upIdx = columns.indexOf(TARGET_UP_COLUMN);
    const downIdx = columns.indexOf(TARGET_DOWN_COLUMN);

    if (dateIdx === -1 || closeIdx === -1) {
      throw new Error(`pair_candles response for ${pair} is missing date/close columns`);
    }
    if (upIdx === -1 || downIdx === -1) {
      throw new Error(
        `FreqAI prediction columns "${TARGET_UP_COLUMN}"/"${TARGET_DOWN_COLUMN}" not found for ${pair} ` +
          `(got: ${columns.join(", ")}). Is FreqAI enabled and past its warm-up period?`
      );
    }

    const history = (candles.data ?? [])
      .map((row) => ({
        timestamp: new Date(row[dateIdx]).getTime(),
        price: row[closeIdx],
        up_probability: row[upIdx],
      }))
      .filter((point) => Number.isFinite(point.price) && Number.isFinite(point.up_probability));

    if (history.length === 0) {
      throw new Error(`No usable candles yet for ${pair}`);
    }

    const last = history[history.length - 1];
    const candlesPerDay = Math.max(1, Math.round((24 * 60) / timeframeToMinutes(this.timeframe)));
    const dayAgo = history[Math.max(0, history.length - 1 - candlesPerDay)] ?? history[0];

    const upProbability = last.up_probability;
    const direction = upProbability >= 0.5 ? "long" : "short";
    const distance = Math.abs(upProbability - 0.5) * 2;
    const confidence = distance >= 0.5 ? "strong" : distance >= 0.2 ? "moderate" : "weak";

    return {
      pair,
      price: last.price,
      change_pct_24h: ((last.price - dayAgo.price) / dayAgo.price) * 100,
      direction,
      up_probability: upProbability,
      down_probability: 1 - upProbability,
      confidence,
      updated_at: new Date().toISOString(),
      history: history.slice(-HISTORY_LIMIT),
      model: this.model,
    };
  }

  listPairs() {
    return this.pairs;
  }

  listPredictions() {
    return [...this.details.values()].map(({ history, model, ...summary }) => summary);
  }

  getDetail(pair) {
    return this.details.get(pair) ?? null;
  }

  modelInfo() {
    return this.model;
  }
}
