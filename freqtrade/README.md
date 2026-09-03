# freqtrade + FreqAI (실 서비스 연동용)

`/app`(모바일 PWA)와 `/server`(목업 API)는 지금 시뮬레이션 데이터로 동작합니다.
이 디렉터리는 실제 Binance 계정에 연결해 진짜 롱/숏 확률을 만들어내는 부분입니다.

## 구성 요소

- `strategies/LongShortProbabilityStrategy.py` — FreqAI 분류 모델(LightGBM)로
  "다음 N개 캔들 뒤 가격이 오를지/내릴지"를 학습하고, 그 클래스 확률을
  `up_or_down_up` / `up_or_down_down` 컬럼으로 노출하는 전략.
- `config.json.example` — Binance 선물(USDT-M) 기준 설정 템플릿. `dry_run: true`
  (모의매매)가 기본값입니다. API 키/비밀번호 필드는 일부러 빈 문자열로 두었습니다 —
  freqtrade의 환경변수 오버라이드 기능(`FREQTRADE__SECTION__KEY`)으로 `.env`에서
  주입되므로 `config.json` 파일 자체에는 민감정보가 들어가지 않습니다.
- `docker-compose.yml` — freqtrade(FreqAI 포함 이미지)를 REST API 활성화 상태로 구동.
- `.env.example` — Binance API 키 등 민감정보 템플릿 (`user_data/.env`로 복사해서 사용).

## 실행 순서

1. **서버 준비**: freqtrade는 항상 켜져 있는 프로세스가 필요합니다. Render 같은 무료
   웹서비스는 슬립되므로 부적합 — 상시 구동되는 VM이 필요합니다 (Oracle Cloud Free
   Tier처럼 영구 무료 티어도 가능, 폰 브라우저로 가입/생성 가능).
2. Binance에서 **출금 권한이 꺼진** API 키를 발급합니다 (선물 거래 권한만 활성화).
3. 그 VM에 Docker를 설치하고 이 저장소의 `freqtrade/`를 올린 뒤,
   `cp config.json.example config.json`, `cp .env.example user_data/.env` 후 값 채우기.
4. `docker compose up -d` — **dry-run(모의매매)으로 시작해 충분히 검증**하세요.
5. freqtrade REST API가 VM의 `:8080`에서 뜹니다 (`api_server.enabled: true`). 이걸
   인터넷에 노출해야 Render에 있는 서버가 호출할 수 있는데, 방화벽 포트를 직접 여는
   대신 **Cloudflare Tunnel**(`cloudflared`)을 추천합니다 — 포트를 열지 않고도
   `https://freqtrade-api.<your-domain-or-trycloudflare>.com` 같은 HTTPS 주소를 얻고,
   TLS 인증서 관리도 필요 없습니다.
6. `server/src/liveEngine.js` + `server/src/freqtradeClient.js`가 이미 freqtrade REST API
   (`/api/v1/pair_candles`의 FreqAI 예측 컬럼 `up_or_down_up`/`up_or_down_down`)를
   앱이 기대하는 스키마로 변환하는 어댑터입니다 — Render 서비스에 아래 환경변수만
   추가하면 목업(`server/src/simulation.js`) 대신 이 어댑터가 자동으로 쓰입니다:

   | 환경변수 | 값 |
   |---|---|
   | `FREQTRADE_API_URL` | 5번의 Cloudflare Tunnel HTTPS 주소 |
   | `FREQTRADE_API_USERNAME` | `.env`의 `FREQTRADE__API_SERVER__USERNAME`과 동일한 값 |
   | `FREQTRADE_API_PASSWORD` | `.env`의 `FREQTRADE__API_SERVER__PASSWORD`와 동일한 값 |
   | `FREQTRADE_TIMEFRAME` | (선택) 전략 타임프레임, 기본 `15m` |
   | `FREQTRADE_PAIRS` | (선택) 콤마로 구분한 페어 목록. 비우면 freqtrade의 whitelist를 그대로 사용 |

   Render 대시보드(Environment 탭)에서 넣으면 재배포되며 자동 적용됩니다. 프론트엔드는
   전혀 손댈 필요 없습니다 — `/api/v1/freqai/status`의 `mode`가 `"mock"`→`"live"`로
   바뀌는지로 확인할 수 있습니다.

## 주의사항

- **실거래 전에 반드시 장기간 dry-run과 백테스트로 전략을 검증하세요.**
  이 전략은 구조를 보여주기 위한 스켈레톤이며 수익성이 검증되지 않았습니다.
- Binance 스팟(spot) 시장은 공매도(숏)를 지원하지 않습니다. 실제로 숏 포지션을
  실행하려면 Binance USDT-M 선물(`trading_mode: futures`)을 사용해야 하며,
  스팟만 사용할 경우 "숏 신호"는 정보성(롱 회피)으로만 활용해야 합니다.
- API 키에는 출금 권한을 절대 부여하지 마세요.
