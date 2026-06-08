# Cognos CRM

An internal CRM for managing prospects, synchronized live with Google Sheets. Built with Next.js 16, React 19, TailwindCSS 4, and NeonDB.

---

## Features

- **Prospects table** — view, search, filter, sort, and inline-edit all prospect data pulled from Google Sheets
- **Comments column** — add per-prospect comments; the author's username is recorded automatically
- **Sheet links** — each row's Source cell links directly to the correct Google Sheets tab
- **Multi-user auth** — JWT-based sessions; the env-var admin plus any accounts created in the Accounts panel
- **Accounts panel** — admin-only page to create, edit (username, role, password), and delete user accounts
- **Role-based access** — `admin` role sees the Accounts nav link and can access `/admin`; `user` role cannot

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.6 (App Router) |
| UI | React 19, TailwindCSS 4, shadcn/ui |
| Table | TanStack React Table v8 |
| Auth | jose (JWT HS256), httpOnly cookies |
| Database | NeonDB (serverless Postgres) — user accounts |
| Data store | Google Sheets API v4 — prospect data |
| Password hashing | bcryptjs |
| Notifications | sonner |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/         # Login page (server action)
│   ├── (dashboard)/
│   │   ├── layout.tsx        # Shared header: logo, Home, Accounts nav, username, logout
│   │   ├── prospects/        # Main CRM table page
│   │   └── admin/            # Accounts management page (admin only)
│   ├── api/
│   │   ├── prospects/        # GET (fetch all), POST (add row)
│   │   ├── prospects/[id]/   # PATCH (update field)
│   │   ├── users/            # GET (list), POST (create)
│   │   └── users/[id]/       # PATCH (edit), DELETE
│   └── layout.tsx            # Root layout — fonts, toaster, favicon, title
├── components/
│   ├── table/prospects-table.tsx   # Full CRM table with inline editing
│   ├── admin/user-management.tsx   # Accounts CRUD UI
│   └── ui/                         # shadcn/ui primitives
├── lib/
│   ├── auth.ts       # JWT encrypt / decrypt
│   ├── db.ts         # NeonDB client + user helpers
│   ├── google.ts     # Google Sheets client + prospect helpers
│   └── stages.ts     # Stage name normalization / aliases
└── proxy.ts          # Middleware: auth guard + admin route protection
```

---

## Environment Variables

Create a `.env` file at the project root:

```env
# Google Sheets API (service account)
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=https://docs.google.com/spreadsheets/d/<ID>/

# Exposed to the browser for building sheet tab links
NEXT_PUBLIC_GOOGLE_SHEET_ID=<spreadsheet-ID-only>

# Hardcoded super-admin (always works, even if DB is down)
APP_USERNAME=admin
APP_PASSWORD=admin123

# JWT signing secret — change this in production
SESSION_SECRET=your_strong_secret_here

# NeonDB (serverless Postgres) — stores user accounts
DATABASE_URL=postgresql://...@...neon.tech/neondb?sslmode=require
```

---

## Database Setup

Run once in the Neon console (or any Postgres client):

```sql
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',  -- 'admin' or 'user'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

Seed the admin account:

```bash
node -e "
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const sql = neon(process.env.DATABASE_URL);
bcrypt.hash('admin123', 10).then(h =>
  sql\`INSERT INTO users (username, password_hash, role) VALUES ('admin', \${h}, 'admin') ON CONFLICT DO NOTHING\`
).then(() => { console.log('done'); process.exit(0); });
"
```

---

## Google Sheets Setup

Each sheet tab the app should read must have these column headers (any order, case-insensitive):

| Header | Required | Notes |
|---|---|---|
| `Prospect Name` | Yes | |
| `Number` | Yes | Phone number |
| `stage` | Yes | Normalised automatically |
| `Comments` | No | Editable from the app |
| `Comment By` | No | Auto-filled by the server — do not edit manually |

Sheets missing `Prospect Name`, `Number`, or `stage` are silently skipped (e.g. a `Users` tab won't pollute the table).

---

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`.

### Default credentials
- **Username:** `admin`
- **Password:** `admin123`

---

## Authentication Flow

1. User submits login form
2. Server checks env-var admin first; if no match, queries NeonDB users table
3. Password verified with `bcrypt.compare`
4. JWT issued with `{ username, role }`, stored in an httpOnly cookie (7-day expiry)
5. Middleware (`proxy.ts`) checks the cookie on every request:
   - Unauthenticated → redirect to `/login`
   - `role !== 'admin'` accessing `/admin` → redirect to `/prospects`

---

## Key Behaviours

- **Inline editing** — click any Name, Phone, or Comment cell to edit; press Enter or click away to save. Changes write directly to Google Sheets.
- **Stage dropdown** — stages are derived dynamically from loaded data, no hardcoded list.
- **Comment attribution** — saving a comment also writes the logged-in username to the `Comment By` column server-side; the author label updates immediately (optimistic UI).
- **Sheet link** — clicking the Source column opens the exact sheet tab (`#gid=...`).
- **Pagination** — 100 rows per page with Previous / Next controls.
