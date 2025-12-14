# 🏆 Tournament Management Web App

A modern web application to create, manage, and run tournaments with automated matchmaking and live progress tracking.

Built using Next.js, Clerk Authentication, PostgreSQL, Prisma, and Tailwind CSS.

---

## ✨ Features

### Tournament Creation
- Tournament name customization
- Minimum & maximum participants configuration
- Registration end date settings
- Shareable invite link for players to join

### Authentication & Management
- Secure authentication using Clerk
- Admin-controlled match results
- Auto-updating points table

### Matchmaking & Progression
- Automatic matchmaking after registration ends
- Multiple matchmaking strategies (configurable):
  - Random / Knockout
  - Round-robin
  - Swiss system (future-ready)
- Tournament progression until final winner







---

## 🧱 Tech Stack

### Frontend
- **Next.js** (App Router)
- **React**
- **Tailwind CSS**

### Backend
- **Next.js API Routes**
- **Prisma ORM**

### Authentication
- **Clerk** (Email / OTP / OAuth)

### Database
- **PostgreSQL** (Supabase)

### Deployment
- **Vercel** (App + API)
- **Vercel Cron** (matchmaking jobs)







---

## 🗂️ Project Structure

```
/app
  /auth           → Clerk auth routes
  /dashboard      → Admin dashboard
  /tournament     → Tournament views
```