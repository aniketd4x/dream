# DishGaze - Smart Restaurant QR Menu & Admin System

A full-stack restaurant management and interactive QR menu system built with React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Supabase, and Capacitor (Android).

## 🚀 Features

### 📱 Customer QR Menu
- **Interactive Digital Menu**: Browse categories, search items, and filter by dietary preference (Veg / Non-Veg / Vegan / Halal / Gluten-Free).
- **Customizable Variants & Add-ons**: Choose portions, spice levels, toppings, and special instructions.
- **Cart & Order Tracking**: Real-time cart calculations, checkout, order placement, and live status updates.
- **Table Detection**: Direct table routing via scanned QR codes (`/menu/:tableCode`).

### 🛠️ Restaurant Admin Portal
- **Modern Dashboard**: Live order feeds with instant audio/haptic chimes, status progression (Pending → Preparing → Served → Paid/Completed).
- **Menu & Category Management**: Add/edit categories, items, prices, dietary badges, images, and availability in real time.
- **Table Management & QR Code Generator**: Generate table QR codes with custom styling, bulk print formatted QR table tent cards, and direct scan URLs.
- **Analytics & Reports**: Daily/weekly sales graphs, category breakdown, exportable Excel/CSV data, and End-of-Day Z-Reports.
- **Staff Authentication**: Secure login with role-based access.

### 📱 Mobile Ready
- Wrapped with **Capacitor** for native Android deployment.
- Native sound effects and haptic feedback integration.

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://tsivosarqlonmssuebwl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_KgylkxGLRQpvL_2c-XMe8g_wTxz4nuo
VITE_SUPABASE_ANON_KEY=sb_publishable_KgylkxGLRQpvL_2c-XMe8g_wTxz4nuo

NEXT_PUBLIC_SUPABASE_URL=https://tsivosarqlonmssuebwl.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_KgylkxGLRQpvL_2c-XMe8g_wTxz4nuo
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_KgylkxGLRQpvL_2c-XMe8g_wTxz4nuo
```

### 3. Database Setup
Execute the complete schema and seed script found in [`supabase_demo_seed.sql`](./supabase_demo_seed.sql) inside the Supabase SQL Editor to initialize all tables, default menus, and demo credentials.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Demo Credentials

- **Admin Login:** `admin@resto.com`
- **Password:** `Admin@123`
- **Table QR Menu Demo:** Navigate to `/menu/TBL-M12WSF9O`

---

## 📦 Building for Production

### Web
```bash
npm run build
```

### Android (Capacitor)
```bash
npm run build
npx cap sync android
npx cap open android
```
