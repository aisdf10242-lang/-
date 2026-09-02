export type Direction = "long" | "short";
export type Confidence = "weak" | "moderate" | "strong";

export interface PredictionSummary {
  pair: string;
  price: number;
  change_pct_24h: number;
  direction: Direction;
  up_probability: number;
  down_probability: number;
  confidence: Confidence;
  updated_at: string;
}

export interface HistoryPoint {
  timestamp: number;
  price: number;
  up_probability: number;
}

export interface FreqAIModelInfo {
  model: string;
  strategy: string;
  target: string;
  classes: string[];
  train_features: string[];
  last_trained: string;
  retrain_interval: string;
}

export interface PredictionDetail extends PredictionSummary {
  history: HistoryPoint[];
  model: FreqAIModelInfo;
}
