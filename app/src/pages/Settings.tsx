import { useState } from "react";
import { fetchPing, getApiBaseUrl, getDefaultApiBaseUrl, resetApiBaseUrl, setApiBaseUrl } from "../lib/api";

export function Settings() {
  const [url, setUrl] = useState(getApiBaseUrl());
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");
  const [checking, setChecking] = useState(false);

  async function handleSave() {
    setApiBaseUrl(url);
    await handleTest();
  }

  async function handleTest() {
    setChecking(true);
    setStatus("idle");
    try {
      await fetchPing();
      setStatus("ok");
    } catch {
      setStatus("fail");
    } finally {
      setChecking(false);
    }
  }

  function handleReset() {
    resetApiBaseUrl();
    setUrl(getDefaultApiBaseUrl());
    setStatus("idle");
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-[calc(env(safe-area-inset-top)+16px)]">
      <h1 className="text-lg font-bold text-slate-100">설정</h1>

      <div className="rounded-2xl border border-slate-800 bg-[var(--color-surface)] p-4">
        <div className="text-sm font-medium text-slate-300">API 서버 주소</div>
        <p className="mt-1 text-xs text-slate-500">
          현재는 목업 데이터 서버를 사용 중입니다. 실제 freqtrade 인스턴스(REST API 활성화)를 붙이려면
          이 주소를 해당 백엔드 프록시 URL로 변경하세요.
        </p>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://localhost:8787"
          className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleSave}
            disabled={checking}
            className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
          >
            저장 및 연결 테스트
          </button>
          <button
            onClick={handleReset}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300"
          >
            초기화
          </button>
        </div>
        {status === "ok" && <div className="mt-2 text-xs text-emerald-400">✓ 연결 성공</div>}
        {status === "fail" && <div className="mt-2 text-xs text-rose-400">✗ 연결 실패 — 주소를 확인하세요</div>}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[var(--color-surface)] p-4 text-xs leading-relaxed text-slate-400">
        <div className="mb-2 text-sm font-medium text-slate-300">실 서비스 연동 로드맵</div>
        <ol className="list-decimal space-y-1.5 pl-4">
          <li>freqtrade에 Binance API 키(거래 권한 최소화, 출금 권한 비활성화)를 등록합니다.</li>
          <li>
            <code className="rounded bg-slate-800 px-1 py-0.5">freqtrade/strategies/LongShortProbabilityStrategy.py</code>
            의 FreqAI 전략으로 확률 예측 모델을 학습·서빙합니다.
          </li>
          <li>freqtrade REST API(<code className="rounded bg-slate-800 px-1 py-0.5">--api-server</code>)를 활성화합니다.</li>
          <li>이 앱의 백엔드(현재 목업 서버)를 freqtrade REST API를 호출하는 프록시로 교체합니다.</li>
          <li>위 주소 입력란에 배포된 프록시 URL을 입력합니다.</li>
        </ol>
      </div>
    </div>
  );
}
