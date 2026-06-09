<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Cognos CRM — Project Context

## What this app is
An internal CRM that reads/writes prospect data from **Google Sheets** and manages user accounts in **NeonDB (Postgres)**. There is no traditional backend database for prospects — Google Sheets is the source of truth.

## Key files to know

| File | Purpose |
|---|---|
| `src/lib/google.ts` | All Google Sheets logic. `Prospect` type defined here. `fetchAllProspects`, `updateProspectField`, `addProspect`. |
| `src/lib/db.ts` | NeonDB client. User CRUD. `AppUser` type uses `email` (not `username`). Includes `avatar_url`, `username` columns and reset-token helpers. |
| `src/lib/auth.ts` | `encrypt(payload)` / `decrypt(session)` — generic JWT helpers using jose. JWT payload shape: `{ email, role, username }`. |
| `src/lib/email.ts` | Nodemailer transporter. `sendPasswordResetEmail(to, resetUrl)` — uses SMTP_* env vars. |
| `src/lib/cloudinary.ts` | Cloudinary SDK config. `uploadAvatar(buffer, publicId?)` — uploads to `cognos-crm/avatars/`, returns URL. |
| `src/lib/stages.ts` | Stage name normalisation and alias mapping. |
| `src/proxy.ts` | Middleware. Guards `/prospects`, `/admin`, `/account`, `/duplicates`. Redirects non-admins away from `/admin` and `/duplicates`. |
| `src/components/ui/avatar-circle.tsx` | Shared avatar component with fallback initial. `AvatarCircle({ src, name, size })`. |
| `src/components/table/prospects-table.tsx` | Main CRM table (client component). Receives `currentUser` prop from the server page. |
| `src/components/admin/user-management.tsx` | Admin accounts CRUD UI (client component). Supports email, username, avatar upload. |
| `src/components/account/account-form.tsx` | Self-service account editor (client component). Edit username, avatar, password via `PATCH /api/me`. |
| `src/components/duplicates/duplicates-checker.tsx` | Duplicate checker UI (client component). Auto-fetches `/api/duplicates`, shows table, export button. |
| `src/app/(dashboard)/layout.tsx` | Shared header — logo, Home nav, Accounts + Duplicates nav (admin only), avatar + username, logout. |
| `src/app/(dashboard)/account/page.tsx` | Self-service account page (server component). Reads session, fetches DB record, renders `AccountForm`. |
| `src/app/(dashboard)/duplicates/page.tsx` | Duplicate Checker page (server wrapper). Admin-only via middleware. |
| `src/app/api/me/route.ts` | `PATCH /api/me` — update own username/avatar/password. Re-issues session cookie so navbar updates immediately. |
| `src/app/api/upload/route.ts` | `POST /api/upload` — multipart image upload (max 2 MB), calls `uploadAvatar()`, returns `{ url }`. |
| `src/app/api/duplicates/route.ts` | `GET /api/duplicates` — admin only. Compares source tab (gid=991813324) phones against all other tabs (normalised). Returns `AnnotatedEntry[]`. |
| `src/app/api/duplicates/export/route.ts` | `POST /api/duplicates/export` — admin only. Calls `addProspect` for each non-duplicate with stage "Contacted" using normalised phone. |
| `src/app/api/auth/forgot-password/route.ts` | Generates reset token, sends email. Returns 400 if email not found (no anti-enumeration). |
| `src/app/api/auth/reset-password/route.ts` | Validates token, hashes new password, marks token used. |

## Prospect type
```ts
type Prospect = {
  id: string;           // "{sheetTitle}-{rowIndex}"
  prospectName: string;
  phoneNumber: string;
  stage: string;
  comments: string;
  commentBy: string;    // auto-set server-side, never user-edited
  sourceSheet: string;
  sheetGid: number;     // Google Sheets tab gid — used for direct tab links
  rowIndex: number;     // 1-based row number in the sheet
}
```

## Google Sheets conventions
- Required headers per tab: `Prospect Name`, `Number`, `stage` (case-insensitive match)
- Optional headers: `Comments`, `Comment By`
- Tabs missing required headers are silently skipped
- Column order doesn't matter — everything is looked up by header name
- `updateProspectField` accepted field values: `"Prospect Name" | "Number" | "stage" | "Comments" | "Comment By"`

## Auth conventions
- JWT stored in httpOnly cookie named `session`, 7-day expiry
- Payload: `{ email: string, role: "admin" | "user", username: string | null }`
- Login checks env-var admin first (`APP_EMAIL` / `APP_PASSWORD`), then NeonDB
- The env-var admin always has `role: "admin"`
- To read the session in a server component or route: `decrypt(cookieStore.get("session")?.value)`

## NeonDB users table
```sql
id SERIAL PRIMARY KEY
email TEXT UNIQUE NOT NULL
username TEXT                      -- display name, shown in navbar and "Comment By"
password_hash TEXT NOT NULL        -- bcrypt, cost 10
role TEXT NOT NULL DEFAULT 'user'  -- 'admin' or 'user'
avatar_url TEXT                    -- Cloudinary URL
created_at TIMESTAMPTZ DEFAULT NOW()
```

Password reset tokens table:
```sql
id SERIAL PRIMARY KEY
email TEXT NOT NULL
token TEXT UNIQUE NOT NULL
expires_at TIMESTAMPTZ NOT NULL
used BOOLEAN DEFAULT FALSE
created_at TIMESTAMPTZ DEFAULT NOW()
```

## Environment variables
```
GOOGLE_CLIENT_EMAIL          Service account email
GOOGLE_PRIVATE_KEY           Service account private key (multiline, escaped \n)
GOOGLE_SHEET_ID              Full spreadsheet URL or bare ID
NEXT_PUBLIC_GOOGLE_SHEET_ID  Bare spreadsheet ID (client-safe, used for tab links)
APP_EMAIL                    Hardcoded super-admin email
APP_PASSWORD                 Hardcoded super-admin password
APP_URL                      Full origin URL (e.g. https://your-app.vercel.app) — used for reset links
SESSION_SECRET               JWT signing secret
DATABASE_URL                 NeonDB connection string
CLOUDINARY_CLOUD_NAME        Cloudinary cloud name
CLOUDINARY_API_KEY           Cloudinary API key
CLOUDINARY_API_SECRET        Cloudinary API secret
SMTP_HOST                    SMTP server (e.g. smtp.gmail.com)
SMTP_PORT                    SMTP port (587 for STARTTLS)
SMTP_USER                    SMTP username / Gmail address
SMTP_PASSWORD                SMTP password / Gmail app password
SMTP_FROM                    From display name + address (e.g. "Cognos CRM <you@gmail.com>")
```

## Important patterns
- **Optimistic UI**: `updateData` in `prospects-table.tsx` applies the change to local state immediately, then fires the PATCH. On error it reverts. When `field === "comments"`, it also sets `commentBy` to `currentUser` optimistically.
- **Column letters**: `colIndexToLetter(index)` in `google.ts` converts 0-based column index to spreadsheet letter (A, B, … Z, AA…).
- **Sheet gid map**: built inside `fetchAllProspects` from `spreadsheet.data.sheets[i].properties.sheetId`.
- **No caching**: every `GET /api/prospects` call fetches fresh from Google Sheets.
