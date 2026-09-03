// Thin client for freqtrade's built-in REST API (api_server). Handles the
// JWT login flow and re-authenticates once on a 401 (access tokens expire
// after ~15 min in freqtrade; the caller doesn't need to know about that).
//
// Docs: https://www.freqtrade.io/en/stable/rest-api/

export class FreqtradeClient {
  constructor({ apiUrl, username, password }) {
    if (!apiUrl) throw new Error("FREQTRADE_API_URL is required");
    if (!username || !password) {
      throw new Error("FREQTRADE_API_USERNAME and FREQTRADE_API_PASSWORD are required");
    }
    this.apiUrl = apiUrl.replace(/\/+$/, "");
    this.username = username;
    this.password = password;
    this.accessToken = null;
  }

  async login() {
    const basic = Buffer.from(`${this.username}:${this.password}`).toString("base64");
    const res = await fetch(`${this.apiUrl}/api/v1/token/login`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}` },
    });
    if (!res.ok) {
      throw new Error(`freqtrade login failed: HTTP ${res.status}`);
    }
    const data = await res.json();
    this.accessToken = data.access_token;
  }

  async request(path) {
    if (!this.accessToken) await this.login();

    const doFetch = () =>
      fetch(`${this.apiUrl}${path}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

    let res = await doFetch();
    if (res.status === 401) {
      await this.login();
      res = await doFetch();
    }
    if (!res.ok) {
      throw new Error(`freqtrade API error ${res.status} for ${path}`);
    }
    return res.json();
  }

  async getWhitelist() {
    const data = await this.request("/api/v1/whitelist");
    return data.whitelist ?? [];
  }

  async getPairCandles(pair, timeframe, limit) {
    const params = new URLSearchParams({ pair, timeframe, limit: String(limit) });
    return this.request(`/api/v1/pair_candles?${params}`);
  }

  async getShowConfig() {
    return this.request("/api/v1/show_config");
  }

  async ping() {
    const res = await fetch(`${this.apiUrl}/api/v1/ping`);
    if (!res.ok) throw new Error(`freqtrade ping failed: HTTP ${res.status}`);
    return res.json();
  }
}
