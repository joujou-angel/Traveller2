# 架構書 1212 (Comprehensive Edition)

**專案名稱：** 旅遊筆記本 (Travel Notebook)
**版本：** 1212 (Pre-Alpha / Dev)
**目標：** 提供一個高顏值、手機優先的 React PWA，解決團體旅遊中的「資訊分散」、「行程變動」與「分帳困難」三大痛點。

---

## 1. 技術架構 (Technology Stack)

本專案採用現代化 React 生態系，強調開發者體驗 (DX) 與使用者體驗 (UX)。

### 1.1 目錄結構與版本控制 (Directory Structure & Version Control)
> [!IMPORTANT]
> **專案根目錄 (Project Root)**：Git 儲存庫的根目錄即為 `Traveller2` 資料夾。
> **限制 (Constraint)**：請勿更動頂層資料夾結構或將檔案移出 `Traveller2`。所有專案設定檔 (package.json, vite.config.ts 等) 必須保留在此根目錄下。

#### 建議目錄結構 (Proposed Directory Structure)

```text
src/
│
├─ components/             # 可重複使用 UI（Navbar, Button, Card, Icon…）
│
├─ features/               # 「每個功能」的邏輯 (Feature-First)
│   ├─ itinerary/
│   ├─ expenses/
│   ├─ weather/
│   ├─ assistant/
│   ├─ auth/
│   ├─ settings/           # User Settings & i18n
│   │
│   ├─ subscription/       # [Future] Payment, Pricing, Lemon Squeezy integration
│   ├─ portability/        # [Future] Import (Excel/AI) & Export (Notion/PDF)
│   └─ maps/               # [Future] Shared Map Logic
│
├─ pages/                  # 5 個頁面 (React Router)
│
├─ layout/                 # 不同頁面共用的 Layout（含 Navbar）
│
├─ lib/
│   ├─ supabase.ts        # Supabase client 初始化
│   └─ utils.ts           # 工具函式
```

### 1.2 技術選型 (Tech Stick)

| 類別 | 選型 | 詳細說明 |
| :--- | :--- | :--- |
| **Runtime** | **Vite** | 極速開發體驗，秒級 HMR。 |
| **Framework** | **React 18** | 使用 Functional Components 與 Hooks。 |
| **Language** | **TypeScript** | 強型別。 |
| **Styling** | **Tailwind CSS** | Utility-first CSS。專案定義了 `macaron` (馬卡龍) 色票系統。 |
| **Backend** | **Supabase** | Backend-as-a-Service。提供 PostgreSQL 資料庫與 API。 |
| **Data Fetching** | **TanStack Query (v5)** | `useQuery` / `useMutation` 管理 Server State。 |
| **Persistence** | **PWA + LocalStorage** | `vite-plugin-pwa` (App Shell) + `persistQueryClient` (Data Cache)。 |

---

## 2. 資料庫設計 (Database Schema)

資料庫託管於 Supabase (PostgreSQL)。

### 2.1 `trip_config` (旅程設定)
單行記錄 (`singleton`)，存儲整趟旅程的全域設定。

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `bigint` | PK |
| `companions` | `jsonb` | 旅伴陣列，例：`["Alice", "Bob"]` |
| `flight_info` | `jsonb` | 航班資訊物件。 |
| `hotel_info` | `jsonb` | 住宿資訊。 |
> **Hardening**: `trip_id` 設有 **UNIQUE Constraint**，確保每個行程只能有一份設定檔，防止重複資料導致的 UI 崩潰。

### 2.2 `itineraries` (行程表)
存儲每日的具體活動。

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `bigint` | PK |
| `date` | `date` | 活動日期。 |
| `start_time` | `time` | 開始時間。 |
| `duration` | `integer` | [12/12 New] 持續時間 (分鐘)。 |
| `location` | `text` | 地點名稱。 |
| `lat` | `float` | [12/12 New] 緯度。 |
| `lng` | `float` | [12/12 New] 經度。 |
| `category` | `text` | `transport`, `activity`, `food`, `stay`。 |
| `notes` | `text` | 備註。 |

### 2.3 `expenses` (共用錢包)
支援多幣別與拆帳細節。

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `bigint` | PK |
| `amount` | `numeric` | 金額。 |
| `currency` | `text` | 幣別 (TWD, JPY...)。 |
| `payer` | `text` | 付款人。 |
| `split_details` | `jsonb` | 分帳細節 `{ "Alice": 333 }`。 |

### 2.4 `trip_memories` (微日記) [Implemented]
用於儲存 使用者的私有回憶。設定 `ON DELETE CASCADE`。

| 欄位名稱 (Column) | 資料型別 (Type) | 說明 (Description) |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key |
| `trip_item_id` | `bigint` | FK (Itineraries) - 掛載於特定行程點 |
| `user_id` | `uuid` | FK (Users) - 撰寫者 |
| `content` | `text` | 日記內容 (限制 500字) |
| `mood_emoji` | `text` | Mood ID (e.g. 'awe', 'discovery') |
| `external_link` | `text` | 外部相簿連結 (No Photo Policy) |
| `is_private` | `boolean` | Default: `true` |
| `created_at` | `timestamptz` | 建立時間 |
| `updated_at` | `timestamptz` | 更新時間 |

---

## 3. UI/UX 設計規範 (Design System)

### 3.1 色彩系統 (Milk Tea / Earth Tone)
專案採用自定義的 **奶茶色 / 大地色系**，營造溫暖、質感與放鬆的氛圍。
*   **Primary**: `#d4c4b8` (按鈕)
*   **Background**: `#faf8f5` (米白)
*   **Text**: `#342b14` (深棕標題), `#667280` (說明灰)

### 3.2 Logo
**"IJou Organic Rough Handwriting"**：手寫風格 SVG，強調溫度感。

### 3.3 情感圖標系統 (Mood Icon System)
專屬設計的 SVG 圖標，用於微日記功能，取代通用 Emoji 以增強旅遊情境的代入感。

| Mood | 中文 | 視覺隱喻 (Visual Metaphor) | 設計意涵 |
| :--- | :--- | :--- | :--- |
| **Awe** | 震撼 | 瞳孔放大 + O型嘴 + 放射線 | 看到壯闊風景時的 Mind-blown |
| **Discovery** | 驚喜 | 星星眼 + 魔法棒軌跡 | 發現 Hidden Gem 的喜悅 |
| **Delicious** | 滿足 | 臉頰紅潤 + 舌頭舔嘴 | 吃到美食的生理極致滿足 |
| **Exhausted** | 累癱 | 融化的臉 (Melting Face) + 汗滴 | 鐵腿、體力透支的真實寫照 |
| **Crowded** | 阿雜 | 臉被兩側板塊擠壓 | 人擠人、窒息與焦慮感 |
| **Rip-off** | 盤子 | 臉部糾結 + 看著長帳單 | 價格與品質不符的痛心 (荷包失血) |

---

## 4. 已實作功能 (Implemented Features)

### 4.1 核心規劃 (Core Planning)
*   **Hub & Spoke 架構**：首頁列表 -> 單一行程詳情。
*   **權限控管 (RBAC)**：
    *   **Owner**：完全控制 (Edit/Delete)。
    *   **Shared Member**：協作記帳，唯讀行程，可主動退出 (Leave Trip)。
*   **旅程共享**：透過連結邀請加入，自動同步 `companions` 名單。
*   **Robust Data Sync**: `trip_config.companions` 作為顯示層的 Source of Truth，讀寫時自動與 `trip_members` 及 Owner 資料同步，確保名單不遺失。

### 4.2 行程管理 (Itinerary)
*   **Smart Link Parsing**：
    *   自動解析 Google Maps 連結 (包含短網址 `goo.gl`)。
    *   自動提取 `@lat,lng` 座標與地點名稱填入表單。
*   **Duration Logic**：
    *   輸入開始/結束時間，自動計算持續分鐘數。
    *   支援跨日行程判定。
*   **Map Visualization**：
    *   使用 Leaflet 顯示行程地圖 (唯讀展示)。
    *   自動 Fit Bounds 顯示所有景點。

### 4.3 記帳與分帳 (Expenses)
*   **多幣別支援**：
    *   即時匯率換算器 (Header)。
    *   多幣別總額統計 (Total Spent)。
*   **智慧分帳**：
    *   支援「全體均分」或「指定人均分」。
    *   視覺化債務關係 (Net Balances)。

### 4.4 天氣預報 (Weather)
*   **Hybrid Strategy**：
    *   < 14 天：顯示即時預報。
    *   > 14 天：顯示「歷史推估」數據 (去年同期)。
*   **在地化**：支援台灣縣市與國際熱門城市中英對照。

### 4.5 離線體驗 (Offline-First)
*   **App Shell**：PWA Service Worker 快取靜態資源，斷網可開啟 App。
*   **Read-Only Cache**：
    *   `persistQueryClient` 自動將行程、天氣、記帳資料快取至 localStorage。
    *   斷網時可瀏覽所有已讀資料。
*   **Offline Indicator**：斷網時頂部顯示「離線模式」提示橫幅。

### 4.6 UI 韌性 (UI Resilience) [12/13 New]
*   **Image Validation**: 
    *   自動偵測並警告無效的 Google Drive 預覽連結 (Viewer Link)。
    *   **Auto-Fallback**: 圖片讀取失敗 (403/404) 時自動顯示質感預設圖，避免破圖影響體驗。
*   **Database Hardening**:
    *   全域資料庫約束 (Unique Constraint) 防止並發寫入導致的資料重複。

---

## 5. 未來開發路線圖 (Roadmap)

### 5.1 微日記 (Micro-Journaling) [High Priority]
*   **目標**：增加參與者黏著度與付費動機。
*   **功能**：在行程卡片上掛載「心情筆記」。
*   **功能**：在行程卡片上掛載「心情筆記」。
*   **限制**：純文字 + 專屬心情 SVG (No Photo Storage)。

### 5.2 地圖深度整合 (Interactive Map)
*   **目標**：在行程卡片中直接嵌入可互動地圖。
*   **技術**：整合 Google Maps JS API，顯示路徑規劃。

### 5.3 匯出與歸檔 (Export & Archive) [Temporarily Hidden]
*   **Smart Export**：一鍵匯出為 Notion Markdown 格式。
*   **Excel Export**：匯出記帳明細供二次編輯。

---

## 6. 商業與變現戰略 (Business Strategy) [Finalized]

基於「低成本高黏著」原則，採用 **Owner-Only 額度** 搭配 **微日記情感綁定**。

### 6.1 計費模式：Owner-Only Quota
> [!IMPORTANT]
> **設計原則**：最大化病毒傳播，讓邀請零阻力。無生涯總數限制。

| 角色 | 動作 | 額度消耗 |
|:---|:---|:---|
| **Owner** | 建立行程 | ✅ 扣 1 點 (免費版同時間限 3 團 Active) |
| **Owner** | 封存行程 | ❌ 免費 (封存後釋放 Active 額度，無總數限制) |
| **Viewer** | 加入行程 | ❌ 免費 (無限參加) |
| **Viewer** | 寫微日記 | ❌ 免費 (情感鉤子) |

#### 軟性防濫用 (Anti-Abuse)
*   針對「輪流當主揪」的行為，因資料分散與管理成本高，實務上風險低。
*   (選用) 限制同一群組 (Hash) 30 天內只能開一團。

### 6.2 變現核心：沈沒成本 (Sunk Cost)
*   **邏輯**：利用使用者投入的心力 (日記) 作為付費槓桿。
*   **機制**：
    *   行程結束 30 天後自動進入 **「唯讀封存模式」**。
    *   用戶若想 **刪除行程實體** (釋放 Owner 額度)，系統將警告 **「回憶將被永久銷毀」**。
    *   此時提供 **「付費永久封存」** 選項。

*   **關鍵文案**：
    > 「您在這個旅程中留下了 **12 篇回憶日記**。選擇 [刪除] 將會永久銷毀這些回憶。
    > 或者選擇 **[封存旅程]** 來永久保存這些美好時刻？」

### 6.3 定價方案 (Pricing)
考量 Lemon Squeezy Merchant of Record 手續費結構 (5% + $0.50)：

1.  **Pro Subscription ($29/year)**
    *   無限建立行程。
    *   自動封存所有回憶。
    *   優先客服與匯出功能。

2.  **Trip Pass ($4.99/trip)**
    *   針對單次旅遊的永久封存證。
    *   避免低價 ($0.99) 交易被手續費侵蝕利潤。
