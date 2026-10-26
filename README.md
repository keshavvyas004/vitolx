# VIT OLX — College Student Marketplace

A private, student-only peer-to-peer marketplace for buying and selling items within the college campus.

## 🔐 Key Features
- **Student-only access** — Enrollment number format (`26MAS10012`) validates identity
- **OTP login** via Twilio SMS (no email needed)
- **Fixed Price + Auction bidding** with live Socket.IO updates
- **Image + Video listings** — required working-condition video
- **In-app Razorpay payments** — UPI, cards, wallets
- **Auto UPI payout** to seller after payment
- **Seller contact revealed** ONLY after full payment
- **Zero public exposure** — `robots.txt` + `noindex` blocks all crawlers
- **Admin panel** — revenue tracking, user management, order monitoring

## 📁 Project Structure

```
vit_olx/
├── client/          # React + Vite + TypeScript + Tailwind CSS
└── server/          # Node.js + Express + MongoDB + Socket.IO
```

## 🚀 Setup

### 1. Clone & Install

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 2. Configure Environment

```bash
cd server
cp .env.example .env
# Fill in all values in .env
```

Required env vars:
- `MONGO_URI` — MongoDB Atlas connection string
- `JWT_SECRET` + `JWT_REFRESH_SECRET` — Random long strings
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_ACCOUNT_NUMBER`

### 3. Add Razorpay Script to client/index.html

Add inside `<head>` of `client/index.html`:
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### 4. Run Development

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

## 💰 Platform Fee Model

| Item Price | Buyer Pays Extra | Seller Gets Less | Platform Earns |
|---|---|---|---|
| ₹0–₹500 | +2% | -3% | ~5% |
| ₹501–₹2000 | +2% | -2.5% | ~4.5% |
| ₹2001–₹5000 | +1.5% | -2% | ~3.5% |
| ₹5001+ | +1% | -1.5% | ~2.5% |

Fees are **hidden** — users only see the final price.

## 🔒 Security

- JWT access tokens (15min) + HTTP-only refresh tokens (7 days)
- Seller phone **never** in any API response until order is `PAID`
- All product routes protected — zero unauthenticated access
- `robots.txt`: `Disallow: /` — no search indexing
- `noindex` meta tag on all pages

## 🛠 Tech Stack

| | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB + Mongoose |
| Auth | JWT + Twilio OTP |
| Realtime | Socket.IO |
| Payments | Razorpay (Checkout + Payouts API) |
| Media | Cloudinary (images + video) |
| State | Zustand |

## 📱 Creating Admin Account

After first registration, manually set a user's role in MongoDB:
```js
db.users.updateOne({ enrollmentNo: "26MAS10012" }, { $set: { role: "admin" } })
```
