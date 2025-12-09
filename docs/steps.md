# 高效率 AI 協作開發流程：從零開始指南

這份文件記錄了我們這次的合作模式，讓您下次開發新 App 時，可以達到「零等待」的極速流暢體驗。

---

## 1. 準備階段 (User Action)

在呼叫 AI 之前，請先準備好以下兩樣東西：

### A. 完整架構書 (Architecture Doc)
一份好的 Markdown (`.md`) 架構書能讓 AI 不需要猜測。
**必備內容：**
*   **技術選型 (Tech Stack):** 明確指定框架 (e.g., React + Vite + TypeScript, Tailwind CSS)。
*   **設計風格 (Design System):** 提供色票代碼 (Hex Colors) 與 UI 規範 (e.g., Macaron Palette)。
*   **資料庫結構 (Schema):** 列出需要的 Tables 與欄位 (這讓 AI 能預先寫好 SQL)。
*   **檔案結構 (File Structure):** 預期的目錄結構。

### B. Supabase 專案資訊
先去 [Supabase Dashboard](https://supabase.com/dashboard) 建立好新專案。
**需要取得的資訊：**
*   **Project URL** (`Settings` -> `API` -> `Project URL`)
*   **Anon Key** (`Settings` -> `API` -> `Project API keys` -> `anon`, `public`)

---

## 2. 啟動階段 (Perfect Prompt)

當您準備好上述資料後，請用以下方式給出 **第一個指令**，這樣 AI 就能一次完成初始化設定，中間不需要停下來問您問題。

**建議 Prompt 範本：**

> 「你好，我要開發一個新的 [App名稱]。
> 這是我的 **架構書** (附上檔案)。
>
> 請幫我進行專案初始化 (React + Vite + Tailwind)，並設定好 Supabase 連線。
> 以下是 Supabase 的連線資訊：
> **URL:** `https://your-project.supabase.co`
> **Anon Key:** `eyJh...`
>
> 請直接建立專案，並給我一份 SQL 檔案讓我去設定資料庫。」

---

## 3. 開發流程 (Workflow)

依照上述 Prompt，AI 會自動執行以下步驟 (您只需等待)：

1.  **環境建置:** `npm create vite`, 安裝 Tailwind, 設定 `env` 變數。
2.  **檔案結構:** 建立 `components`, `pages` 等資料夾。
3.  **產出 SQL:** AI 會寫好 `supabase_schema.sql`。

## 4. 同步階段 (Sync)

當 AI 完成初始化後，會停下來請您做這件事：

1.  **執行 SQL:** 複製 AI 提供的 SQL 程式碼 -> 去 Supabase **SQL Editor** -> 貼上並 Run。
2.  **回報:** 告訴 AI 「DB 設定好了」。

---

**總結：只要在第一步就提供 `架構書` + `Supabase Key`，我們就可以省下多次來回確認的時間！**
