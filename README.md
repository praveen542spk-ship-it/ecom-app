# 🛍️ AuraShop Premium - Modern E-Commerce Platform

AuraShop Premium is a modern, high-fidelity e-commerce application built with **React (Vite)**, **Node.js (Express)**, and **MongoDB Atlas**. It features a modern glassmorphic design system, 5-language internationalization, guest cart merging, interactive payment simulation (UPI, Cards, NetBanking, COD), and a 17+ feature Settings control panel.

---

## ✨ Comprehensive Feature Suite

### 1. 🌐 Multi-Language Support (5 Languages)
* Real-time dynamic dictionary translation for **English**, **தமிழ் (Tamil)**, **తెలుగు (Telugu)**, **हिंदी (Hindi)**, and **Deutsch (German)**.
* Dynamic language selection stored per user preference with zero reload lag.

### 2. ⚙️ Comprehensive Settings Panel (17+ Features)
* **Profile Info**: Device gallery photo uploader, contact info sync, birthday, gender & bio customization.
* **Security & Auth**: Two-Factor Verification (2FA), 4-digit quick checkout PIN, password updates & active session revocation.
* **Preferences & Currency**: 5-language switcher, currency converter (₹ INR, $ USD, € EUR), and customizable notification channels (Email, SMS, Promotions).
* **Payment Methods & Wallet**: Interactive credit/debit card manager and custom amount Aura Cash Wallet top-up system.
* **Privacy Controls**: Downloadable account data package (JSON export), browsing cache wipe, and account deactivation.

### 3. 🛒 Advanced Shopping & E-Commerce Flow
* **Smart Cart Engine**: Persistent user-specific carts with automatic guest cart merging upon login.
* **Frequently Bought Together**: Bundle offer suggestions on product detail views.
* **Recently Viewed Carousel**: Horizontal product tracking carousel on shop catalog.
* **Customer Q&A & Reviews**: Interactive product questions & answers section and review ratings.
* **Wishlist Sharing**: 1-click WhatsApp wishlist sharing integration.

### 4. 💳 Interactive Payment Simulation (AuraSecure)
> [!NOTE]
> **Mock & Simulation Disclaimer**: All payment gateways implemented in this project (UPI, Credit/Debit Cards, Net Banking, and Wallet) are **mock simulations designed for UI/UX testing and demonstration purposes only**. No real financial transactions are performed, and no real bank accounts or credit cards are charged.

* **Direct NPCI-Style UPI**: Authentic BHIM/UPI modal with recipient details and 6-digit PIN keypad validation (`123456` or `999999`).
* **3D Animated Credit Card**: Interactive virtual card with dynamic front/back 3D flipping CVV focus and mock OTP bank verification.
* **Net Banking Portal**: Major Indian banks grid with bank login authentication portals.
* **COD Verification**: Safety captcha verification code prior to order placement.

### 5. 📊 Dashboard & Invoice Engine
* Order tracking timeline (Processing, Shipped, Delivered).
* Printable & downloadable PDF billing invoice builder reflecting discounts and taxes.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js (v18+)** and **npm** installed on your system.

### 1. Installation
Run the root setup script to install dependencies for both frontend and backend concurrently:
```bash
npm run install:all
```

### 2. Running the Application
Start both the backend server (`http://localhost:5000`) and Vite frontend (`http://localhost:5173`) in one terminal window:
```bash
npm run dev
```

---

## 🛠️ Tech Stack & Architecture

* **Frontend**: React.js, Vite, React Router DOM, HSL-tailored CSS variables.
* **Backend**: Node.js, Express.js, MongoDB Atlas (Mongoose ORM).
* **Authentication**: Token-based bearer authentication with persistent session validation.
