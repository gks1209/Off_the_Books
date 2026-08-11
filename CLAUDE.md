@AGENTS.md

# Off the Books — 프로젝트 개요

빈티지숍 운영자를 위한 매입/재고/판매 장부 앱. React Native(Expo) 모바일 앱 + Node/Express REST 백엔드 + PostgreSQL. 상세 기능·설치 가이드는 README.md 참고, 여기서는 코드 작업 시 바로 필요한 구조/동작만 정리.

## 구조
- `App.js` (~1,300줄, 단일 파일) — 대시보드, 상품 등록, 재고 목록, 판매완료 화면과 상태관리·API 연동·로컬 캐시 로직이 전부 여기 들어 있음. 화면별 컴포넌트 분리가 안 되어 있으므로, 수정 범위가 크면 분리 여부를 먼저 사용자에게 확인할 것.
- `server/index.js` — Express REST API. `items` 테이블에 대한 단순 CRUD만 수행 (`GET/POST/PUT/DELETE /api/items`, `GET /api/health`). 비즈니스 로직(총원가·순이익 계산 등)은 서버가 아니라 App.js 클라이언트에서 처리됨 — 서버는 그대로 저장/조회만 함.
- `server/db.js` — PostgreSQL pool. IPv6 미지원 네트워크 대응을 위해 `dns.setDefaultResultOrder('ipv4first')` 강제 설정.
- `server/schema.sql` — `items` 단일 테이블 스키마. 서버 기동 시 자동 실행되어 테이블 없으면 생성.

## 핵심 동작 (수정 시 주의)
- API 서버 주소는 `App.js:35`의 `API_URL`에 하드코딩 (`https://off-the-books-api.onrender.com`). 로컬 서버 테스트 시 이 값을 직접 바꿔야 함 (에뮬레이터 `10.0.2.2`, 실기기는 PC의 LAN IP).
- 환율은 실시간 조회가 아니라 `1 USD = 1,500 KRW` 고정값 하드코딩.
- 네트워크/서버 실패 시 AsyncStorage 캐시로 폴백하는 하이브리드 동기화 구조 (오프라인 지원). 캐시 관련 로직 수정 시 온라인/오프라인 두 경로 모두 고려.
- 상품 상태는 `selling` / `sold` 두 가지뿐. 판매 완료 시 배송지 입력, 되돌리면 판매/배송 필드 초기화됨.
- EAS Update로 OTA JS 업데이트를 감지해 사용자에게 리로드를 제안 (`Updates.useUpdates()`).

## 스택 & 실행
- Frontend: React Native 0.85 + Expo SDK 56, React 19. **코드 작성 전 반드시 [AGENTS.md](AGENTS.md) 지시대로 Expo v56 공식 문서를 확인할 것.**
- Backend: Node/Express + node-postgres, Render.com 배포. DB는 로컬 또는 Neon/Supabase 등 클라우드 Postgres.
- 프론트/백엔드는 각각 별도 `package.json` — 루트와 `server/`에서 따로 `npm install` 필요.
- 실행: 프론트 `npm run start|android|ios|web` (루트), 백엔드 `cd server && npm run dev|start`.
- `server/.env`에 실제 DB 접속정보 존재 (git에는 `server/.env.example`만 커밋됨, 절대 커밋 금지).
