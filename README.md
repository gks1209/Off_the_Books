# 📖 Off the Books (빈티지숍 장부 및 재고 관리 시스템)

**Off the Books**는 빈티지숍 운영자들을 위한 모바일 장부 및 재고 관리 애플리케이션입니다. 매입 정보(원가, 세탁비, 수선비, 관세 등)와 판매 정보(판매가, 판매처, 배송지 등)를 체계적으로 기록하고 월별 매출, 순이익 및 현재 보유 재고의 가치를 한눈에 파악할 수 있도록 돕습니다.

이 프로젝트는 **React Native (Expo)** 기반의 모바일 프론트엔드와 **Node.js (Express) + PostgreSQL** 기반의 백엔드 서버로 구성되어 있습니다. 또한 백엔드 연결 실패 시 로컬 캐시(**AsyncStorage**)를 활용하여 오프라인 환경에서도 안전하게 데이터를 관리할 수 있도록 설계되었습니다.

---

## 🚀 주요 기능

### 1. 📊 실시간 대시보드 (Dashboard)
- **이번 달 요약 리포트**: 이번 달 총 매출, 총 순이익, 현재 보유 중인 재고의 총 가치(원가 기준)를 실시간으로 계산하여 시각화합니다.
- **상태별 상품 수 요약**: 현재 판매 중인 상품 수와 이번 달 판매 완료된 상품 수를 직관적인 배지 형태로 보여줍니다.
- **최근 판매 내역**: 최근 판매 완료 처리된 상품 5개를 빠르게 확인할 수 있습니다.

### 2. ➕ 체계적인 상품 등록 (Add Item)
- **기본 정보 입력**: 상품명, 구매 날짜, 구매처 선택(번개장터, 후르츠패밀리, ebay, 메루카리, Grailed 등), 매입 카테고리 분류가 가능합니다.
- **다중 통화(KRW/USD) 및 실시간 환율 적용**: 매입가를 원화(₩) 및 달러($)로 입력할 수 있으며, 달러 입력 시 고정 환율(1 USD = 1,500 KRW)을 적용하여 원화 가치로 자동 환산합니다.
- **원가 세분화**: 매입가 외에 추가 비용(세탁비, 수선비, 택배비, 해외 직구 시 관세)을 개별 입력할 수 있으며, 자동으로 **총 원가(Total Cost)**를 계산해 줍니다.
- **공급망 관리**: 판매자 이름, 연락처, 매입 운송장 번호와 수령 상태(`수령 대기` / `수령 완료`)를 기록합니다.

### 3. 📦 재고 목록 관리 (Inventory)
- **판매 중 재고 확인**: 현재 판매 중인 재고 수량과 목록을 제공합니다.
- **상세 아코디언 뷰**: 카드를 터치하면 판매자 정보, 수령 상태, 관세 내역 등 상세 정보를 조회할 수 있습니다.
- **원클릭 액션**:
  - `수령 상태 토글` (수령 대기 ↔ 수령 완료)
  - `판매 완료 처리` (판매 정보 및 배송지 정보 입력 모달 오픈)
  - `정보 수정` 및 `재고 삭제`

### 4. 🏷️ 판매 완료 및 순이익 분석 (Sold Items)
- **배송지 관리**: 판매 완료 처리 시 구매자의 이름, 주소, 연락처, 운송장 번호를 기록합니다.
- **정밀한 수익 분석**: 각 상품별 총 원가 대비 실제 판매가를 분석하여 개별 상품의 **순수익(Profit)**을 계산하고 기록합니다.
- **상태 되돌리기**: 판매 완료된 상품을 다시 `판매 중` 상태로 되돌릴 수 있으며, 이 경우 기존 판매/배송 정보는 안전하게 초기화됩니다.

### 5. 🔄 오프라인 지원 및 동기화 (Data Sync)
- **REST API 백엔드 연동**: 기본적으로 원격 API 서버(`https://off-the-books-api.onrender.com`)와 통신하여 데이터를 영구 보존합니다.
- **AsyncStorage 로컬 캐시**: 네트워크 연결이 원활하지 않거나 서버 장애가 발생한 경우, 모바일 기기 내 로컬 저장소에 우선 데이터를 백업하고 조회할 수 있는 하이브리드 동기화 시스템을 탑재하였습니다.
- **EAS Update 지원**: 앱 실행 시 백그라운드에서 실시간 JavaScript 코드 업데이트를 감지하고 사용자에게 즉시 적용 제안을 띄웁니다.

---

## 🛠 기술 스택

### Frontend
- **Framework**: [React Native](https://reactnative.dev/) (SDK 56)
- **Tooling**: [Expo](https://expo.dev/) (EAS Build / Update 지원)
- **Local Storage**: [@react-native-async-storage/async-storage](https://react-native-directory.netlify.app/?search=async-storage)
- **UI Components**: React Native Standard Components (Sleek Dark Theme 적용)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database Driver**: [node-postgres (pg)](https://node-postgres.com/)
- **Utility**: Cors, Dotenv, Nodemon

### Database
- **DBMS**: [PostgreSQL](https://www.postgresql.org/)
- **Deployment Support**: Local DB 또는 Cloud DB (Neon, Supabase 등) 대응 (SSL 연결 지원 및 IPv6 미지원 환경을 위한 IPv4 강제 설정 포함)

---

## 📁 프로젝트 구조

```text
Off_the_Books/
├── App.js                   # Expo 모바일 애플리케이션 엔트리포인트 & 모든 UI 화면/로직
├── app.json                 # Expo 프로젝트 설정 파일
├── eas.json                 # EAS 빌드 및 배포 프로필 설정
├── package.json             # 프론트엔드 종속성 및 스크립트
├── assets/                  # 이미지, 아이콘 등 정적 에셋 폴더
└── server/                  # Node.js 백엔드 서버 폴더
    ├── index.js             # Express 서버 라우트 및 비즈니스 로직
    ├── db.js                # PostgreSQL Connection Pool 설정
    ├── schema.sql           # 데이터베이스 테이블 스키마 정의
    ├── package.json         # 백엔드 종속성 및 스크립트
    └── .env.example         # 로컬 환경 변수 템플릿
```

---

## ⚙️ 시작하기 (Installation & Setup)

### 1. Database 설정
PostgreSQL 데이터베이스가 준비되어 있어야 합니다.
데이터베이스에 접속한 후 `server/schema.sql` 파일의 쿼리를 실행하여 `items` 테이블을 생성합니다.
*(서버 실행 시 테이블이 없을 경우 자동으로 자동 생성 스크립트가 실행됩니다.)*

```sql
-- items 테이블 스키마 요약
CREATE TABLE IF NOT EXISTS items (
  "id" VARCHAR(255) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "buyDate" VARCHAR(50),
  "buyFrom" VARCHAR(100),
  "buyPrice" NUMERIC,
  "buyCurrency" VARCHAR(10),
  "category" VARCHAR(100),
  "costWash" NUMERIC DEFAULT 0,
  "costRepair" NUMERIC DEFAULT 0,
  "costShip" NUMERIC DEFAULT 0,
  "costDuty" NUMERIC DEFAULT 0,
  "totalCost" NUMERIC DEFAULT 0,
  "sellerName" VARCHAR(255),
  "sellerPhone" VARCHAR(100),
  "sellerTrackingNum" VARCHAR(100),
  "isReceived" BOOLEAN DEFAULT FALSE,
  "status" VARCHAR(50) DEFAULT 'selling',
  "soldDate" VARCHAR(50),
  "soldVia" VARCHAR(100),
  "soldPrice" NUMERIC,
  "soldCurrency" VARCHAR(10),
  "deliveryName" VARCHAR(255),
  "deliveryAddr" TEXT,
  "deliveryPhone" VARCHAR(100),
  "trackingNum" VARCHAR(100),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Backend Server 설정 및 실행
1. `server` 디렉토리로 이동합니다.
2. `.env.example` 파일을 복사하여 `.env` 파일을 생성하고 본인의 DB 접속 정보에 맞게 설정합니다.
   ```env
   PORT=5000
   
   # 로컬 또는 클라우드(Neon, Supabase 등) PostgreSQL 설정
   # DATABASE_URL을 사용할 경우 우선 적용됩니다.
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=off_the_books
   ```
3. 필요한 패키지를 설치하고 서버를 실행합니다.
   ```bash
   cd server
   npm install
   
   # 개발 모드로 실행 (nodemon)
   npm run dev
   
   # 프로덕션 모드로 실행
   npm start
   ```

### 3. Frontend App (Expo) 설정 및 실행
1. 루트 디렉토리에서 필요한 패키지를 설치합니다.
   ```bash
   npm install
   ```
2. `App.js` 상단의 `API_URL`을 본인의 서버 주소로 설정합니다.
   - **실기기 테스트 시**: 본인 컴퓨터의 로컬 IP주소를 사용해야 합니다. (예: `http://192.168.0.X:5000`)
   - **에뮬레이터/시뮬레이터 사용 시**: `localhost` 또는 `10.0.2.2`를 지정합니다.
3. 앱을 구동합니다.
   ```bash
   # Expo 개발 서버 실행
   npm run start
   
   # 또는 특정 플랫폼으로 바로 실행
   npm run android
   npm run ios
   npm run web
   ```

---

## 📡 API Endpoints

서버의 기본 포트는 `5000`이며, 다음 엔드포인트를 제공합니다.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/health` | 데이터베이스 연결 확인 및 서버 상태 헬스체크 |
| **GET** | `/api/items` | 모든 등록된 상품 목록 조회 (최신 구매순) |
| **POST** | `/api/items` | 새로운 상품 등록 |
| **PUT** | `/api/items/:id` | 특정 상품 정보 수정 (수령 상태 변경, 판매 완료 처리 등) |
| **DELETE** | `/api/items/:id` | 특정 상품 영구 삭제 |
