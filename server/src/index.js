import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { SimulationEngine } from "./simulation.js";
import { LiveEngine } from "./liveEngine.js";

const PORT = process.env.PORT || 8787;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Set FREQTRADE_API_URL (+ FREQTRADE_API_USERNAME/PASSWORD) to switch from
// simulated predictions to a real freqtrade + FreqAI instance. See
// freqtrade/README.md for how to stand one up and expose its REST API.
const useLive = Boolean(process.env.FREQTRADE_API_URL);

const engine = useLive
  ? new LiveEngine({
      apiUrl: process.env.FREQTRADE_API_URL,
      username: process.env.FREQTRADE_API_USERNAME,
      password: process.env.FREQTRADE_API_PASSWORD,
      timeframe: process.env.FREQTRADE_TIMEFRAME,
      pairs: process.env.FREQTRADE_PAIRS?.split(",").map((p) => p.trim()).filter(Boolean),
    })
  : new SimulationEngine();

if (useLive) {
  try {
    await engine.start();
    console.log(`Connected to live freqtrade instance at ${process.env.FREQTRADE_API_URL}`);
  } catch (err) {
    // Keep the process up (the app + /api/v1/ping stay reachable for
    // debugging) but predictions will be empty until this is fixed —
    // check FREQTRADE_API_URL/USERNAME/PASSWORD and that freqtrade's
    // api_server is reachable from this host.
    console.error("Failed to connect to freqtrade:", err.message);
  }
} else {
  engine.start();
}

const app = express();
app.use(cors());
app.use(express.json());

// Mirrors freqtrade's own /api/v1/ping health check.
app.get("/api/v1/ping", (_req, res) => {
  res.json({ status: "pong" });
});

app.get("/api/v1/freqai/status", (_req, res) => {
  res.json({
    enabled: true,
    mode: useLive ? "live" : "mock",
    ...engine.modelInfo(),
    note: useLive
      ? "Serving predictions from a live freqtrade instance."
      : "Serving simulated predictions. Set FREQTRADE_API_URL to switch to a live freqtrade instance.",
  });
});

app.get("/api/v1/pairs", (_req, res) => {
  res.json({ pairs: engine.listPairs() });
});

app.get("/api/v1/predictions", (_req, res) => {
  res.json({ predictions: engine.listPredictions() });
});

app.get("/api/v1/predictions/:pair", (req, res) => {
  const pair = decodeURIComponent(req.params.pair);
  const detail = engine.getDetail(pair);
  if (!detail) {
    res.status(404).json({ error: `Unknown pair: ${pair}` });
    return;
  }
  res.json(detail);
});

// When app/dist exists (production build), serve the PWA from this same
// process/origin so a single deployed service covers both the API and the
// mobile app — no CORS, no second service to stand up.
const distPath = path.resolve(__dirname, "../../app/dist");
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
  console.log(`Serving built app from ${distPath}`);
}

app.listen(PORT, () => {
  console.log(`freqtrade-mobile server listening on http://localhost:${PORT}`);
});
