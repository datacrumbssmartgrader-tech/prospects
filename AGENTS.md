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
| `src/lib/db.ts` | NeonDB client. User CRUD: `getUsers`, `findUserByUsername`, `createUser`, `updateUsername`, `updateUserRole`, `updateUserPassword`, `deleteUser`. |
| `src/lib/auth.ts` | `encrypt(payload)` / `decrypt(session)` — generic JWT helpers using jose. JWT payload shape: `{ username, role }`. |
| `src/lib/stages.ts` | Stage name normalisation and alias mapping. |
| `src/proxy.ts` | Middleware. Guards `/prospects` and `/admin` routes. Redirects non-admins away from `/admin`. |
| `src/components/table/prospects-table.tsx` | Main CRM table (client component). Receives `currentUser` prop from the server page. |
| `src/components/admin/user-management.tsx` | Admin accounts CRUD UI (client component). |
| `src/app/(dashboard)/layout.tsx` | Shared header — logo (`/LOGO.png`), Home nav, Accounts nav (admin only), username display, logout. |

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
- Payload: `{ username: string, role: "admin" | "user" }`
- Login checks env-var admin first (`APP_USERNAME` / `APP_PASSWORD`), then NeonDB
- The env-var admin always has `role: "admin"`
- To read the session in a server component or route: `decrypt(cookieStore.get("session")?.value)`

## NeonDB users table
```sql
id SERIAL PRIMARY KEY
username TEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL        -- bcrypt, cost 10
role TEXT NOT NULL DEFAULT 'user'  -- 'admin' or 'user'
created_at TIMESTAMPTZ DEFAULT NOW()
```

## Environment variables
```
GOOGLE_CLIENT_EMAIL        Service account email
GOOGLE_PRIVATE_KEY         Service account private key (multiline, escaped \n)
GOOGLE_SHEET_ID            Full spreadsheet URL or bare ID
NEXT_PUBLIC_GOOGLE_SHEET_ID  Bare spreadsheet ID (client-safe, used for tab links)
APP_USERNAME               Hardcoded super-admin username
APP_PASSWORD               Hardcoded super-admin password
SESSION_SECRET             JWT signing secret
DATABASE_URL               NeonDB connection string
```

## Important patterns
- **Optimistic UI**: `updateData` in `prospects-table.tsx` applies the change to local state immediately, then fires the PATCH. On error it reverts. When `field === "comments"`, it also sets `commentBy` to `currentUser` optimistically.
- **Column letters**: `colIndexToLetter(index)` in `google.ts` converts 0-based column index to spreadsheet letter (A, B, … Z, AA…).
- **Sheet gid map**: built inside `fetchAllProspects` from `spreadsheet.data.sheets[i].properties.sheetId`.
- **No caching**: every `GET /api/prospects` call fetches fresh from Google Sheets.
