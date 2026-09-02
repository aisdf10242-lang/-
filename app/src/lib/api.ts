import type { PredictionDetail, PredictionSummary } from "./types";

const STORAGE_KEY = "longshort.apiBaseUrl";
const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export function getApiBaseUrl(): string {
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_BASE_URL;
}

export function setApiBaseUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY, url.replace(/\/+$/, ""));
}

export function resetApiBaseUrl(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getDefaultApiBaseUrl(): string {
  return DEFAULT_BASE_URL;
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

export function fetchPredictions(): Promise<{ predictions: PredictionSummary[] }> {
  return request("/api/v1/predictions");
}

export function fetchPredictionDetail(pair: string): Promise<PredictionDetail> {
  return request(`/api/v1/predictions/${encodeURIComponent(pair)}`);
}

export function fetchPing(): Promise<{ status: string }> {
  return request("/api/v1/ping");
}
