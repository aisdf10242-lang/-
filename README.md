# LongShort — Binance × freqtrade 롱/숏 확률 모바일 앱

Binance 시세에 freqtrade(FreqAI)를 붙여, 각 코인의 롱/숏 우위와 확률을
모바일 화면에서 바로 확인할 수 있는 PWA입니다.

<p>
  <img src="https://img.shields.io/badge/status-MVP%20(mock%20data)-orange" alt="status" />
</p>

## 구성

```
app/         React + TypeScript + Tailwind PWA (모바일 대시보드)
server/      목업 API 서버 — freqtrade/FreqAI REST API와 동일한 응답 형태를 시뮬레이션
freqtrade/   실제 Binance 연동을 위한 FreqAI 전략 스켈레톤 + 설정 템플릿
```

현재 앱은 `server/`의 목업 데이터로 동작합니다. 가격과 확률은 실제 시세가 아니라
현실적인 랜덤워크 시뮬레이션이며, `freqtrade/`에는 이를 실제 Binance 데이터와
FreqAI 예측으로 교체하기 위한 전략/설정 템플릿과 절차가 들어있습니다.

## 화면

- **대시보드**: 등록된 페어 카드 목록. 각 카드에 롱/숏 배지, 확률 바(Long % / Short %),
  신뢰도(낮음/보통/높음), 24시간 변동률 표시. 전체/Long/Short 필터 제공.
- **상세**: 선택한 페어의 현재가, 확률 추이 차트(최근 5분), FreqAI 모델 정보
  (전략명, 모델, 타깃, 재학습 주기).
- **설정**: 앱이 바라보는 API 서버 주소를 변경/테스트. 목업 서버 대신 실제
  freqtrade 백엔드로 교체할 때 이 화면에서만 값을 바꾸면 됩니다.

## 로컬 실행

### 1. 백엔드 (목업 API)

```bash
cd server
npm install
npm run dev   # http://localhost:8787
```

### 2. 프론트엔드 (PWA)

```bash
cd app
npm install
npm run dev   # http://localhost:5173
```

`app/.env.development`의 `VITE_API_BASE_URL`이 기본 API 주소를 지정합니다.
앱 내 설정 화면에서 런타임에도 변경할 수 있습니다(로컬 저장소에 저장).

## 확률 계산 방식

`server/src/simulation.js`는 실제 FreqAI 이진 분류기가 낼 법한 출력 형태
(`up_probability` / `down_probability`, 합 = 1)를 흉내 낸 시뮬레이션입니다.
가격은 랜덤워크로, 확률은 완만하게 변하는 내부 추세(regime)에 평균회귀하도록
설계해 실제 모델 출력과 유사한 패턴(추세 지속, 점진적 확신도 변화)을 보이도록
했습니다.

실 서비스에서는 `freqtrade/strategies/LongShortProbabilityStrategy.py`가
RSI, MACD, EMA 크로스, 볼린저 %B, 거래량 z-score 등을 특징으로 사용해
"N개 캔들 뒤 상승/하락" 이진 분류를 학습하고, 그 클래스 확률을 동일한
`up_probability`/`down_probability` 형태로 노출합니다. 자세한 내용과 실행
방법은 [`freqtrade/README.md`](freqtrade/README.md)를 참고하세요.

## 실 서비스 연동 로드맵

1. `freqtrade/`의 안내에 따라 Binance API 키(출금 권한 비활성화)로 freqtrade +
   FreqAI 인스턴스를 dry-run으로 기동합니다.
2. freqtrade REST API 응답을 이 앱이 기대하는 스키마
   (`GET /api/v1/predictions`, `GET /api/v1/predictions/:pair`)로 변환하는
   프록시를 작성해 `server/`의 목업 엔진을 대체합니다.
3. 앱 설정 화면에서 API 주소를 배포된 프록시 URL로 변경합니다.
4. 실거래 전환 전 충분한 기간 동안 dry-run 결과와 확률의 실효성을 검증합니다.

## PWA 설치

`app`을 빌드/배포한 뒤 모바일 브라우저에서 열면 "홈 화면에 추가"로 설치할 수
있습니다 (매니페스트/서비스워커는 `vite-plugin-pwa`로 구성됨).

```bash
cd app
npm run build
npm run preview
```
