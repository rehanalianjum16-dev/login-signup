# Secure Next.js + Node/Prisma POS Auth Portal

A production-grade, highly secure, and visually polished authentication system built using **Next.js (App Router)**, **TypeScript**, **Prisma ORM**, and **PostgreSQL** with Role-Based Access Control (RBAC) and OTP-based password resets.

---

## Features & Security Measures

- **Hashed OTP Password Reset**: Replaces link-based resets with a 6-digit verification code. Uses bcrypt encryption to store OTPs, limits entries to 5 attempts (to block brute force), restricts requests to 3 per hour, and enforces a 60-second cooldown timer.
- **Hierarchical Role-Based Access Control (RBAC)**:
  - `OWNER`: Full system access, views financial reports, manages all users (can hire Owners, Managers, and Cashiers).
  - `MANAGER`: Oversees inventory and staff (can view, register, and manage Cashier accounts only).
  - `CASHIER`: Processing register transactions and shift review only. (Default role for public signup is CASHIER).
- **Database-Backed Rate Limiting**: Tracks failed logins inside rolling 15-minute windows (max 5 attempts per IP/email) before locking.
- **Double Token Refresh Rotation**: Issues short-lived access JWTs and sets rotating `SameSite=Strict`, `HTTP-only`, `Secure` refresh cookies, checking for token reuse.
- **Verification Transactions**: Protects signup validation by executing code consumption over secure POST operations.
- **Sleek Vanilla Glassmorphic UI**: Includes active role badges, countdown state handlers, dynamic split-digit OTP entry, and full staff management panels.

---

## Prerequisites

Ensure you have the following installed on your machine:
- Node.js (v18.x or above)
- npm (v9.x or above)
- PostgreSQL database instance running locally or hosted

---

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to a new `.env` file:
```bash
cp .env.example .env
```
Open `.env` and configure your settings:
- Update the `DATABASE_URL` with your PostgreSQL server connection details.
- Create unique, random secrets for `JWT_SECRET` and `REFRESH_SECRET`.
- Optional: Set SMTP details in `EMAIL_HOST`, `EMAIL_USER`, etc. to send emails. Leave blank to print OTP codes directly to the terminal console in development.

### 3. Run Migrations
Run Prisma migrations to initialize database schemas and generate client bindings:
```bash
npx prisma migrate dev --name init
```

### 4. Bootstrap Default Owner Account (Seeding)
Since public signup defaults to the lowest privilege (`CASHIER`), you must seed the initial administrative account:
```bash
npm run db:seed
```
This registers the default OWNER:
- **Email**: `owner@business.com`
- **Password**: `OwnerPassword123!`

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the portal. Log in with the OWNER credentials to start managing managers and cashiers!

### 6. Explore Database Records (Prisma Studio)
```bash
npx prisma studio
```
