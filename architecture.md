# Architecture Documentation

## 1. Project Overview
**Name**: Traveller (Travel Notebook)
**Goal**: A collaborative travel itinerary and expense tracking application designed for groups.

## 2. Technology Stack

### Core
-   **Framework**: React 18 + Vite
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS (with custom "Macaron" color palette)

### State & Data
-   **Server State**: TanStack Query (React Query) v5
-   **Backend**: Supabase (PostgreSQL)
-   **Database**:
    -   `trip_config`: Stores flight info, hotel details, companions.
    -   `expenses`: Stores shared expense records with multi-currency support.

### Key Libraries
-   **Icons**: Lucide React
-   **Dates**: date-fns
-   **Notifications**: Sonner

## 3. Current Implementation

### 3.1 Information Page (`InfoPage.tsx`)
-   **Flight Info**: Dates, Flight numbers, Times.
-   **Hotel Info**:
    -   Name, Address (Local/English).
    -   **[NEW]** Phone Number & Notes (conditional display).
-   **Companions**: List of trip participants.

### 3.2 Itinerary Page (`ItineraryPage.tsx`)
-   **Timeline View**: Displays activities sorted by date and time.
-   **Management**: Add, Edit, Delete activity blocks.

### 3.3 Expenses Page (`ExpensesPage.tsx`)
-   **Multi-Currency Support**:
    -   Record expenses in TWD, JPY, KRW, USD, etc.
    -   Dashboard displays totals per currency.
-   **Split Logic**:
    -   Equal split among selected companions.
    -   Net Balance calculation (Who owes whom).
-   **Currency Converter**:
    -   Always-visible header widget.
    -   Simple `Amount * Rate = TWD` calculation.

## 4. Future Roadmap

### 4.1 Google Map Integration
-   **Goal**: Embed maps for hotel and activity locations.
-   **Features**:
    -   Show dynamic map based on address.
    -   Pins for itinerary items.

### 4.2 User Authentication (Login)
-   **Goal**: Secure access and personalization.
-   **Plan**:
    -   Implement Supabase Auth (Email/Google).
    -   Enable proper Row Level Security (RLS) policies based on `user_id`.

### 4.3 Announcements (Bulletin Board)
-   **Goal**: Important trip notices (e.g., "Bring swimsuit", "Meet at 5 AM").
-   **Features**:
    -   Sticky notes or top-level alerts on the dashboard.

### 4.4 Multi-Trip Planning
-   **Goal**: Manage multiple trips concurrently.
-   **Architecture Update**:
    -   Add `trips` table.
    -   Link `expenses`, `itinerary`, `trip_config` to `trip_id`.
    -   Trip switcher UI.

### 4.5 Markdown Export
-   **Goal**: Export itinerary and expenses for offline use or sharing.
-   **Features**:
    -   Generate `.md` files of the itinerary timeline.
    -   Export expense summary tables.
