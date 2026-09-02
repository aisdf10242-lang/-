import express from "express";
import cors from "cors";
import { SimulationEngine } from "./simulation.js";

const PORT = process.env.PORT || 8787;

const engine = new SimulationEngine();
engine.start();

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
    mode: "mock",
    ...engine.modelInfo(),
    note: "Serving simulated predictions. Point the app at a live freqtrade instance to replace this feed.",
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

app.listen(PORT, () => {
  console.log(`freqtrade-mobile mock server listening on http://localhost:${PORT}`);
});
