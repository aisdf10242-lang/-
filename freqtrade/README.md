# freqtrade + FreqAI (실 서비스 연동용)

`/app`(모바일 PWA)와 `/server`(목업 API)는 지금 시뮬레이션 데이터로 동작합니다.
이 디렉터리는 실제 Binance 계정에 연결해 진짜 롱/숏 확률을 만들어내는 부분입니다.

## 구성 요소

- `strategies/LongShortProbabilityStrategy.py` — FreqAI 분류 모델(LightGBM)로
  "다음 N개 캔들 뒤 가격이 오를지/내릴지"를 학습하고, 그 클래스 확률을
  `up_or_down_up` / `up_or_down_down` 컬럼으로 노출하는 전략.
- `config.json.example` — Binance 선물(USDT-M) 기준 설정 템플릿. `dry_run: true`
  (모의매매)가 기본값입니다.
- `docker-compose.yml` — freqtrade(FreqAI 포함 이미지)를 REST API 활성화 상태로 구동.
- `.env.example` — Binance API 키 등 민감정보 템플릿 (`user_data/.env`로 복사해서 사용).

## 실행 순서

1. Binance에서 **출금 권한이 꺼진** API 키를 발급합니다 (선물 거래 권한만 활성화).
2. `cp config.json.example config.json`, `cp .env.example user_data/.env` 후 값 채우기.
3. `docker compose up -d` — dry-run(모의매매)으로 시작해 충분히 검증하세요.
4. freqtrade REST API가 `http://<host>:8080`에서 뜹니다 (`api_server.enabled: true`).
5. 이 REST API를 앱이 기대하는 스키마(`/api/v1/predictions`, `/api/v1/predictions/:pair`)로
   변환하는 얇은 프록시가 필요합니다 — freqtrade의 기본 REST API는 이 형태를 그대로
   제공하지 않으므로, `/server`의 엔드포인트 형태를 유지한 채 내부에서
   freqtrade의 `/api/v1/status`, `/api/v1/pair_candles`(FreqAI 예측 컬럼 포함)를
   호출해 매핑하는 코드로 `server/src/simulation.js`를 대체하면 됩니다.
6. 앱의 설정 탭에서 API 주소를 프록시 URL로 변경하면 끝입니다 — 프론트엔드 코드는
   변경할 필요가 없습니다 (`PredictionSummary`/`PredictionDetail` 타입만 맞추면 됨).

## 주의사항

- **실거래 전에 반드시 장기간 dry-run과 백테스트로 전략을 검증하세요.**
  이 전략은 구조를 보여주기 위한 스켈레톤이며 수익성이 검증되지 않았습니다.
- Binance 스팟(spot) 시장은 공매도(숏)를 지원하지 않습니다. 실제로 숏 포지션을
  실행하려면 Binance USDT-M 선물(`trading_mode: futures`)을 사용해야 하며,
  스팟만 사용할 경우 "숏 신호"는 정보성(롱 회피)으로만 활용해야 합니다.
- API 키에는 출금 권한을 절대 부여하지 마세요.
