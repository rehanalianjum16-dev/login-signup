# Secure Next.js + Node/Prisma Auth Portal

A production-grade, highly secure, and visually polished authentication system built using **Next.js (App Router)**, **TypeScript**, **Prisma ORM**, and **PostgreSQL**.

---

## Features & Security Measures

- **Database-Backed Rate Limiting**: Blocks brute-force login attacks using the `LoginAttempt` audit logs, tracking email/IP failed counts over rolling 15-minute windows.
- **Double Token Refresh Rotation**: Issues short-lived access JWTs and sets rotating `SameSite=Strict`, `HTTP-only`, `Secure` refresh cookies. Compares refresh events in DB and triggers complete user session revocations on reuse detections.
- **Zod Strict Validation**: Validates user attributes, signup complexity, and password strengths, showing live progress checklist indicators on forms.
- **Email Verification Transactions**: Prevents email scanning/crawling consumption issues by running verification validation over POST operations. Includes safe console fallbacks in development.
- **Secure Password Hashing**: Utilizes `bcryptjs` with a cost factor of `12`.
- **Glassmorphism Theme UI**: Uses a responsive, sleek dark-indigo color scheme with premium animations, loading transitions, and role-based badges.

---

## Prerequisites

Ensure you have the following installed on your machine:
- Node.js (v18.x or above)
- npm (v9.x or above)
- PostgreSQL database instance running locally or hosted

---

## Setup Instructions

### 1. Install Dependencies
Navigate to the root directory and install node modules:
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
- Optional: Set SMTP details in `EMAIL_HOST`, `EMAIL_USER`, etc., to send actual emails. Leave blank to log activation URLs directly in the terminal console.

### 3. Generate Prisma Client and Run Migrations
Run Prisma migrations to initialize database schemas and generate client bindings:
```bash
npx prisma migrate dev --name init
```

### 4. Run Development Server
Boot up the local dev server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the portal.

### 5. Explore Database Records (Prisma Studio)
Launch the graphical browser client to view users, active refresh tokens, and rate-limit logs:
```bash
npx prisma studio
```
