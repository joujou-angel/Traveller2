# 架構書 1208 (Comprehensive Edition)

**專案名稱：** 旅遊筆記本 (Travel Notebook)
**版本：** 1208 (Pre-Alpha / Dev)
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
│   ├─ Navbar/
│   │   ├─ Navbar.tsx
│   │   ├─ navbar.css
│   │   └─ index.ts
│   ├─ Icon/
│   │   ├─ Icon.tsx
│   │   └─ icons/ (SVG assets)
│   └─ ...
│
├─ features/               # 「每個功能」的邏輯 (Feature-First)
│   ├─ itinerary/
│   │   ├─ api.ts         # Supabase CRUD
│   │   ├─ hooks.ts       # React Query hooks
│   │   └─ components/    # 該頁面專用元件
│   ├─ expenses/
│   ├─ weather/
│   ├─ assistant/
│   └─ auth/
│
├─ pages/                  # 5 個頁面 (React Router)
│   ├─ Info.tsx
│   ├─ Itinerary.tsx
│   ├─ Expenses.tsx
│   ├─ Weather.tsx
│   └─ Assistant.tsx
│
├─ layout/                 # 不同頁面共用的 Layout（含 Navbar）
│   └─ MainLayout.tsx
│
├─ lib/
│   ├─ supabase.ts        # Supabase client 初始化
│   ├─ utils.ts           # 日期、金額、格式工具
│   └─ constants.ts       # 全域常數
│
├─ styles/
│   ├─ globals.css        # 全站 style
│   └─ variables.css      # 色票、字體、間距設定
│
├─ main.tsx               # ReactDOM render
└─ App.tsx                # Routes 設定入口
```

> **Note**: 原始需求使用 `.js`/`.jsx`，但本專案為 TypeScript 架構，故架構書中已調整為 `.ts`/`.tsx` 以符合現狀。

### 1.2 技術選型 (Tech Stick)

| 類別 | 選型 | 詳細說明 |
| :--- | :--- | :--- |
| **Runtime** | **Vite** | 極速開發體驗，秒級 HMR。 |
| **Framework** | **React 18** | 使用 Functional Components 與 Hooks。 |
| **Language** | **TypeScript** | 強型別，確保資料結構 (如 `Expense`, `FlightSegment`) 的一致性。 |
| **Styling** | **Tailwind CSS** | Utility-first CSS。專案定義了 `macaron` (馬卡龍) 色票系統。 |
| **Backend** | **Supabase** | Backend-as-a-Service。提供 PostgreSQL 資料庫與 API。 |
| **Data Fetching** | **TanStack Query (v5)** | `useQuery` / `useMutation` 管理 Server State，具備自動快取與重新驗證功能。 |
| **Date Library** | **date-fns** | 輕量級日期處理 (Formatting, Grouping)。 |
| **Icons** | **Lucide React** | 統一風格的 SVG 圖標庫。 |
| **UI Components** | **Sonner** | 漂亮的 Toast 通知元件。 |

---

## 2. 資料庫設計 (Database Schema)

資料庫託管於 Supabase (PostgreSQL)。

### 2.1 `trip_config` (旅程設定)
單行記錄 (`singleton`)，存儲整趟旅程的全域設定。

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `bigint` | PK |
| `companions` | `jsonb` | 旅伴陣列，例：`["Alice", "Bob", "Charlie"]` |
| `flight_info` | `jsonb` | 航班資訊物件。包含 `flights` (陣列), `startDate`, `endDate`。 |
| `hotel_info` | `jsonb` | 住宿資訊。包含 `name`, `address` (英文), `addressLocal` (當地語言), `phone`, `notes`。 |

### 2.2 `itineraries` (行程表)
存儲每日的具體活動。

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `bigint` | PK |
| `date` | `date` | 活動日期，用於分組顯示。 |
| `start_time` | `time` | 24小時制開始時間 (`HH:mm`)。 |
| `location` | `text` | 地點名稱 (如 "成田機場")。 |
| `category` | `text` | 類別枚舉：`transport`, `activity`, `food`, `stay`。 |
| `notes` | `text` | 詳細備註、Google Maps 連結或其他資訊。 |

### 2.3 `expenses` (共用錢包)
**[12/09 更新]** 支援多幣別與拆帳細節。

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `bigint` | PK |
| `created_at` | `timestamp` | 建立時間，用於排序。 |
| `item_name` | `text` | 消費項目名稱 (例："晚餐", "計程車")。 |
| `amount` | `numeric` | 此筆消費的總金額。 |
| `currency` | `text` | **[NEW]** 幣別代碼 (TWD, JPY, KRW, USD, etc.)。 |
| `payer` | `text` | 付款人 (必須是 `trip_config.companions` 之一)。 |
| `split_details` | `jsonb` | 分帳細節。格式：`{ "Alice": 333, "Bob": 333 }` (該人應付金額)。 |

> **開發環境 RLS 說明**：目前開發階段已透過 SQL Script 開放 `anon` 角色對上述表格的 CRUD 權限，以便在未登入狀態下測試。

---

## 3. 功能模組與實作細節 (Implementation Details)

### 3.1 資訊頁 (Info Page)
*   **功能**：管理航班、住宿與旅伴。
*   **特色**：
    *   **Conditional Rendering**：電話與備註欄位若為空，在 View Mode 自動隱藏。
    *   **Connecting Flights**：支援多段航班輸入。
    *   **Edit Mode**：點擊右上角編輯按鈕進入修改模式，使用 `updateMutation` 同步至 Supabase。
    *   **Smart Default**：若旅伴名單為空且當前用戶為 Owner，系統會自動將 Owner 加入名單，避免「在此行程中找不到自己」的問題。

### 3.2 行程頁 (Itinerary Page)
*   **功能**：時間軸式的行程檢視。
*   **特色**：
    *   **Timeline UI**：左側顯示時間，右側顯示卡片。
    *   **Map Integration (Roadmap)**：
        *   目前邏輯：解析 `notes` 中的 Google Maps URL。
        *   提取規則：從 URL 中提取 `@lat,lng` 座標與 `z` (zoom level)。
        *   預設 Zoom：若無指定，預設為 `10`。
    *   **Direct Seeding**：包含一個隱藏或開發用的 Seeding 機制，可快速填入測試資料。

### 3.3 記帳頁 (Expenses Page)
*   **功能**：多人分帳與匯率換算。
*   **[12/09 重構] 新架構**：
    1.  **Always-Visible Converter (Header)**：
        *   常駐於頂部的匯率換算器。
        *   介面簡化：移除 Input Spin Buttons，優化 TWD 顯示空間。
        *   邏輯：前端 State 即時計算 `Amount * Rate`。
    2.  **Multi-Currency Dashboard**：
        *   **Total Spent**：依幣別分開加總顯示 (例：`$5000 TWD + ¥20000 JPY`)。
        *   **Net Balances**：分幣別計算欠款。
            *   邏輯：`Balance = (我支付的) - (我應付的)`。
            *   正值 = 別人欠我 (綠色)；負值 = 我欠公款 (粉色)。
    3.  **Add Expense Modal**：
        *   **Currency Selector**：新增幣別下拉選單。
        *   **Split Logic**：預設為「均分」，勾選參與者後自動計算每人應付金額 (`Amount / N`) 並存入 `split_details`。
        *   **Auto-Sync Companion**：即使 Info Page 未設定旅伴，只要是 Owner 進入此頁，也會自動被視為旅伴之一，允許立即記帳。
        *   **UI Optimizations**：
            *   FAB (Floating Action Button) 位於右下角。
            *   Modal 底部按鈕避開 iOS Safe Area，並增加 Padding 防止遮擋。

### 3.4 天氣預報 (Weather Page)
*   **功能**：提供旅程期間的精準天氣預報與歷史氣候參考。
*   **技術架構**：
    *   **Prefetching**：利用 React Query `prefetchQuery` 在進入 `MainLayout` 時預先載入天氣資料，提升頁面切換體感速度。
    *   **Smart Hybrid Strategy**：
        *   **近期預報 (Forecast)**：針對 14 天內的日期，抓取即時預報。
        *   **歷史推估 (History)**：針對超過 14 天的遠期規劃，自動回溯 **去年同期** 的歷史氣候數據做為參考。
        *   **Inline Indicator**：歷史數據會在日期旁顯示「雲朵+時鐘」圖示與「歷史推估」標籤，明確區分真實預報與參考數據。
    *   **Geocoding Reliability**：
        *   **City Mapping**：內建台灣各大城市與國際熱門景點的中英對照表 (`CITY_MAPPINGS`)，支援 "台北", "花蓮", "首爾" 等中文地名搜索。
        *   **Fallback Mechanism**：若中文搜尋失敗，自動嘗試無語言參數的模糊搜尋。

---

## 4. UI/UX 設計規範 (Design System)

### 4.1 色彩系統 (Milk Tea / Earth Tone)
專案採用自定義的 **奶茶色 / 大地色系**，營造溫暖、質感與放鬆的氛圍。定義於 `tailwind.config.js`：

| Semantic Role | Token Name | Hex Code | Visual/Usage |
| :--- | :--- | :--- | :--- |
| **Page Title** | `page-title` | `#342b14` | 深棕色，用於最重要標題 |
| **Main Title** | `main-title` | `#5a4a42` | 次深棕，用於卡片標題 |
| **Subtitle** | `sub-title` | `#a39992` | 淺灰棕，用於次要資訊 |
| **Description** | `desc` | `#667280` | 灰藍色，用於說明文字 |
| **Background** | `page-bg` | `#faf8f5` | 米白色，全域背景 |
| **Button (Primary)** | `btn` | `#d4c4b8` | 奶茶色 (Focus `#9B8D74`)，主要按鈕 |
| **Input Border** | `border` | `#e8e3de` | 淺米灰，輸入框邊框 |
| **Date (Unselected)** | `date-unselected-bg` | `#f5f0eb` | 淺米色背景 |
| **Date (Selected)** | `date-selected-bg` | `#ebe6e1` | 深米色背景 |
| **Positive** | `positive` | `#88b89e` | 柔和綠，用於結餘 (別人欠我) / 類別標籤 |
| **Negative** | `negative` | `#d8a4a4` | 柔和粉，用於結餘 (我欠公款) |
| **Category (Transport)** | `bg-orange-500` | - | 鮮明橘，行程類別：交通 |
| **Category (Food)** | `bg-blue-500` | - | 亮藍色，行程類別：飲食 |
| **Category (Stay)** | `bg-indigo-500` | - | 靛青色，行程類別：住宿 |

### 4.2 互動元件
*   **Buttons**：圓角較大 `rounded-2xl`，點擊時有 `active:scale-95` 的微縮放回饋。
*   **Inputs**：移除標準瀏覽器的 Spin Buttons (`appearance: none`)，提供更乾淨的數值輸入體驗。
*   **Modals**：由底部滑出的 Bottom Sheet 風格，在手機上操作更直觀。

### 4.3 Logo
專案使用的 Logo (SVG)：
<svg width="250" height="250" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
    <title>IJou Organic Rough Handwriting</title>
    <desc>A casual, organic handwritten logo for "I jou" with purposeful imperfections to avoid a rigid look.</desc>
    <path fill="#d4c4b8" d="M387.5,136.2c-41.9-53.4-110.9-72.6-174.4-58c-68.6,15.8-128.2,72.9-143.7,146.3
	c-14.5,68.6,10.3,144.3,66.7,188.2c53.4,41.6,127.6,49.8,189.1,26.1c58.7-22.7,106.6-73.5,123.4-136.9
	C463.4,246.7,434.6,196.3,387.5,136.2z"/>
    <g fill="none" stroke="#faf8f5" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
        <path d="M130,185 Q150,182 170,180" />
        <path d="M150,182 Q155,230 148,275" />
        <path d="M135,275 Q150,278 165,275" />
        <path d="M230,220 Q235,300 230,320 Q220,360 190,350" />
        <path d="M235,185 L236,186" stroke-width="14"/>
        <path d="M305,240 
             Q275,235 275,270 
             Q275,300 305,300 
             Q330,300 325,270 
             Q322,255 310,250" />
        <path d="M355,250 Q355,300 380,300 Q400,300 400,260 M400,260 L400,305" />
    </g>
</svg>

---


## 5. 已實作功能 (Implemented Features) [12/09 Updated]

### 5.1 多行程規劃 (Multi-Trip Planning)
*   **架構**：Hub & Spoke。
*   **入口**：首頁為行程列表 (`/`)，點擊卡片進入單一行程 (`/trips/:tripId/itinerary`)。
*   **功能**：
    *   **CRUD**：新增、編輯 (日期/地點/封面)、刪除 (僅限 Owner)。
    *   **權限標示**：列表卡片以圖示區分權限：
        *   👑 **Owner** (黃色皇冠)：主辦行程，擁有完整權限 (Edit/Delete Trip)。
        *   👥 **Shared** (藍色人員)：受邀行程，擁有部分權限 (Leave Trip)。
    *   **退出機制 (Leave Trip)**：協作者可主動退出行程 (從 `trip_members` 移除自身)，不同於 Owner 的刪除行程。

### 5.2 旅程共享 (Trip Sharing)
*   **機制**：邀請連結 (`/join/:tripId`)。
*   **流程**：
    1.  Owner 複製連結分享。
    2.  受邀者點擊 -> 登入 -> 自動加入 `trip_members` 並寫入 `companions` 名單。
    3.  受邀者可在首頁看到該行程。

### 5.3 使用者登入 (Authentication)
*   **Provider**：Google OAuth (Supabase)。
*   **保護機制**：
    *   **RLS (Row Level Security)**：資料庫層級保全，實現嚴格的權限控管。
        *   **Trips**: Owner (All), Member (Read Only).
        *   **Itineraries / Trip Config**: Owner (All), Member (Read Only). 協作者無法修改行程內容或設定。
        *   **Expenses**: Owner & Member (All). 支援共同記帳。
    *   **Route Protection**：未登入強制重導至 `/login`。
    *   **UI Guard**：針對非 Owner 隱藏編輯/刪除按鈕，並顯示 "Waiting for setup" 的空狀態訊息。

### 5.4 介面優化 (UI Refinements)
*   **圖示化按鈕**：全面導入 Lucide Icons (Check, X, Trash, LogOut) 取代純文字按鈕。
*   **行程捲軸**：修復 Itinerary 頁面在 desktop 環境下的水平捲動與自動置中問題。
*   **時間格式**：
    *   **Display**: 強制顯示為 24 小時制 (`HH:mm`)。
    *   **Input**: 實作自定義的時間選擇器 (雙欄位輸入)，移除瀏覽器預設的 Spinners，提供更直觀的輸入體驗。
    *   **Unified Save Icon**：將所有「新增」與「儲存」動作 (Trip, Expense, Info) 的按鈕圖示統一為 **Floppy Disk (Save)**，取代原本不一致的 Check 或純文字樣式。
    *   **Home Header Redesign**：首頁標題改為品牌感更強的 "Traveller" 與 Slogan，並加入飛機圖示 (Plane Icon)；優化 RWD 顯示，確保使用者名稱在手機版始終可見。

### 5.5 天氣功能完整實作 (Weather Perfection) [12/10 Updated]
*   **在地化支援**：完整支援台灣各縣市 (Taipei, Kaohsiung, Hualien...) 與國際熱門城市。
*   **體驗優化**：
    *   **Refresh Button**：支援手動點擊刷新天氣。
    *   **Visual Cues**：為「歷史推估」數據設計專屬的 **Cloud+Clock SVG Icon**，直觀傳達「過去時間點的天氣」概念。

### 5.6 UI/UX Refinement (Logo & Dates) [12/10 Updated]
*   **Brand Identity**：更新 Logo 為 **"IJou Organic Rough Handwriting"** 設計，強化品牌的手寫溫度感。
*   **Date Formatting**：
    *   **Trip List**：將旅程卡片日期的顯示格式優化為 `MM/DD-MM/DD` (例：`12/10-12/15`)，提升閱讀性。
*   **Iconography Standardization**：
    *   **Save Action**：全站統一使用 **Floppy Disk** 圖示作為儲存/建立按鈕，消除原本 Check/Text 混用的不一致體驗。

---

## 6. 未來開發路線圖 (Roadmap) - Remaining Items

以下功能為下一階段開發重點：

1.  **Google Map 深度整合 (Google Map Integration)**
    *   目標：在行程卡片中直接嵌入互動地圖，而非僅顯示連結。
    *   技術：使用 Google Maps JavaScript API 或 Embed API。
    *   功能：根據 `location` 或 `notes` 中的座標顯示 Pin 點。

2.  **公告欄 (Announcements)**
    *   目標：置頂重要訊息 (如：集合時間、注意事項)。
    *   位置：首頁 (Info) 或行程頁 (Itinerary) 頂部。

3.  **Smart Export to Notion (Markdown)**
    *   **目標**：一鍵將完整旅程打包成 Notion 友善的格式，解決「歸檔」需求。
    *   **核心整合**：
        *   **Weather Optimized**：在每日標題整合天氣預報 (例：`### Day 1 (10/12) ☀️ 24°C`)，讓規劃時一目瞭然。
        *   **Itinerary**：轉換為 Checkbox List，自動縮網址與整理備註。
        *   **Expenses**：自動生成 Markdown Table，複製到 Notion 後可直接轉為 Database。

---

## 7. 商業變現與戰略轉型 (Monetization Strategy) [12/11 Finalized]

基於使用者決策，本專案採用 **「漸進式付費牆 (Progressive Paywall)」** 策略，平衡初期成長 (Growth) 與變現 (Revenue)。

### 7.1 收費機制 (The Hybrid Model)

核心邏輯：**生涯額度 (Lifetime Quota) + 活躍限制 (Active Limit)**

| 階段 | 用戶動作 | 系統限制 | 收費狀態 |
| :--- | :--- | :--- | :--- |
| **第 1 趟** | 建立行程 | ✅ 允許。享有完整功能。 | **FREE** |
| **第 2 趟** | 建立行程 | ⚠️ **條件允許**。系統強制要求 **封存 (Archive)** 第 1 趟行程 (變唯讀)，才能開啟第 2 趟。 | **FREE (Condition)** |
| **第 3 趟+** | 建立行程 | ⛔ **禁止**。觸發付費牆 (Paywall)。 | **PAY ($)** |

### 7.2 付費方案 (Pricing Tiers)

建議透過 **Lemon Squeezy** (MoR) 實作以下兩種方案：

1.  **單次通行證 (Trip Pass)**
    *   **價格**：$2.99 / trip (預估)。
    *   **權限**：解鎖單一行程。
    *   **賣點**：適合低頻旅遊者 (一年出國一次)。

2.  **專業訂閱 (Pro Subscription)**
    *   **價格**：$29 / year (預估)。
    *   **權限**：無限建立行程，無需封存。
    *   **賣點**：適合導遊、領隊或旅遊成癮者。

### 7.3 技術實作 (Execution & Locking)

為了防止前端破解，所有限制必須在 **資料庫層 (Database Layer)** 實作。

#### A. 資料庫設計
1.  **`users` 表新增欄位**：
    *   `lifetime_trip_count` (int): 生涯累計建立行程數。
    *   `subscription_status` (text): 'free', 'pro', 'trip_pass'.
2.  **`trips` 表新增欄位**：
    *   `status` (text): 'active', 'archived'.
    *   `is_unlocked` (boolean): 是否已購買單次通行證。

#### B. 鎖定邏輯 (DB Trigger - 偽代碼)
```sql
-- 當用戶嘗試建立新行程 (Insert Trip)
IF (user.subscription == 'free') {
    -- 規則 1: 檢查生涯額度
    IF (user.lifetime_trip_count >= 2) {
        RAISE EXCEPTION '已達免費額度上限 (2次)。請升級或是購買單次通行證。';
    }
    
    -- 規則 2: 檢查活躍行程 (Active Trip Check)
    active_trips = SELECT count(*) FROM trips WHERE status = 'active' AND owner = user.id;
    IF (active_trips >= 1) {
        RAISE EXCEPTION '免費版只能有一個活躍行程。請先封存舊行程。';
    }
}
```

#### C. 支付流程 (Lemon Squeezy Integration)
1.  **觸發**：用戶點擊「解鎖行程」-> 前端呼叫 Lemon Squeezy API 建立 Checkout URL。
2.  **支付**：用戶在 Lemon Squeezy 頁面完成付款。
3.  **開通 (Webhook)**：
    *   Lemon Squeezy 發送 `order_created` webhook 到 Supabase Edge Function。
    *   Edge Function 驗證簽章後，更新 DB：
        *   若是 Trip Pass -> 設定 `trips.is_unlocked = true`。
        *   若是 Subscription -> 設定 `users.subscription_status = 'pro'`。

### 7.4 資料互通性 (Data Portability) [User Priority]

打破「封閉花園」，降低遷移門檻，讓用戶敢於開始。

1.  **Excel 匯入 (Smart Excel Import)**
    *   **痛點**：用戶不想手動一筆一筆 Key 資料，尤其是已經在 Google Sheet 排好行程的人。
    *   **解法**：支援 `.xlsx` 或 `.csv` 檔案拖曳上傳。
    *   **智慧解析**：系統提供「範本」下載，並嘗試模糊匹配欄位 (如：偵測 "Time", "Date", "Location" 等關鍵字)。
    *   **戰略意義**：極低門檻的 "Onboarding" 體驗，搶奪 Google Sheet 用戶。

2.  **Excel/Notion 匯出 (Export)**
    *   **定位**：付費功能 (Pro Feature)。
    *   **用途**：旅行結束後的「結案報告」與「分帳明細」。
    *   **格式**：
        *   **Itinerary**: 轉為 Notion Toggle List 或 Checklist。
        *   **Expenses**: 轉為 Excel (含公式)，讓用戶可以二次編輯。

### 7.5 國際化策略 (Internationalization / i18n) [12/11 Finalized]

針對多語言支援，採用開發體驗優先的策略。

*   **技術選型**：`react-i18next` (業界標準)。
*   **路由策略**：**偵測式 (Detection-based)**。
    *   **邏輯**：不改變 URL (如 `/app/dashboard`)，而是根據瀏覽器語言設定或 `localStorage` 自動切換語言。
    *   **理由**：私有行程 App 不需要針對每頁做 SEO，保持 URL 簡潔更重要。
*   **範圍**：
    *   **UI 文字**：全數抽離至 `locales/*.json`。
    *   **用戶內容**：不自動翻譯，保持原樣。

3. **支付整合 (Payment Integration)**
   您需要一個處理全球支付的 Merchant of Record (MoR)。
   *   **推薦方案 (Winner)**： **Lemon Squeezy** (勝過 Stripe)。
   *   **關鍵理由**：
       *   **稅務地獄 (Global Tax)**：Stripe 只負責收錢，不負責算稅。若賣給歐洲/日本用戶，您需自行處理 VAT/消費稅。
       *   **MoR 優勢**：Lemon Squeezy 作為 Merchant of Record會代您處理全球稅務，您只需收受稅後款項，省去龐大的法務與會計成本。
   *   **與 Supabase 的架構**：
       *   用戶在前端點擊「訂閱」。
       *   跳轉至 **Lemon Squeezy Checkout** 頁面。
       *   支付成功後，Lemon Squeezy 透過 Webhook 通知您的 Supabase Edge Function。
       *   Supabase 更新 `users` 資料表中的 `subscription_status` 或 `lifetime_trip_count`。
       *   React 前端根據狀態解鎖功能。

3. **SEO (搜尋引擎優化) —— 免費流量的入口**
   App Store 的流量是封閉的，但 Web 的流量是開放的。
   *   **策略**： 如果您有公開的旅遊行程頁面，利用 Next.js 的 SSR (Server-Side Rendering) 或 SSG 讓 Google 收錄這些頁面。當用戶搜尋「京都三天兩夜行程」時，直接進入您的 Web App，這比在 App Store 搜尋更有競爭力。

### 7.3 第三階段：決策評估 (Trade-off Analysis)

| 維度 | Native App (上架商店) | Web SaaS / PWA (不上架) | 您的現狀適配度 |
| :--- | :--- | :--- | :--- |
| **開發成本** | 高 (需維護多平台代碼) | 低 (一套 React 代碼) | ✅ **極高** |
| **利潤率** | 低 (被抽成 15-30%) | 高 (支付手續費 ~4%) | ✅ **極高** |
| **獲客難度** | 依賴 ASO，競爭紅海 | 依賴 SEO/社群，長尾效應 | 🟡 **需看行銷能力** |
| **用戶信任** | 高 (商店背書) | 中 (需建立品牌信任) | 🟡 **需強化設計感** |
| **功能限制** | 極少 | 有 (無法使用背景定位、藍牙等) | 🟡 **旅遊類通常夠用** |

### 💡 架構師的最終建議

如果您是獨立開發者或小團隊，請放棄上架 App Store 的執念。那是一條充滿法規審核、技術債與高額抽成的荊棘之路。

您的致勝路徑是： 將您的 React 專案打造成一個 「極致體驗的 PWA」，專注於 SEO 獲客 與 B2B/SaaS 變現。讓您的產品成為「最好用的旅遊規劃網頁工具」，而不是「又一個沒人下載的旅遊 App」。
