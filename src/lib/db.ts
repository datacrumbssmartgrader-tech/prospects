import { neon } from "@neondatabase/serverless";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set.");
  return neon(url);
}

export type AppUser = {
  id: number;
  email: string;
  username: string | null;
  password_hash: string;
  role: "admin" | "user";
  avatar_url: string | null;
  created_at: string;
};

export type ResetToken = {
  id: number;
  email: string;
  token: string;
  expires_at: string;
  used: boolean;
};

export async function getUsers(): Promise<Omit<AppUser, "password_hash">[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, email, username, role, avatar_url, created_at
    FROM users
    ORDER BY created_at DESC
  `;
  return rows as Omit<AppUser, "password_hash">[];
}

export async function findUserByEmail(email: string): Promise<AppUser | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, email, username, password_hash, role, avatar_url, created_at
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;
  return (rows[0] as AppUser) ?? null;
}

export async function findUserById(id: number): Promise<AppUser | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, email, username, password_hash, role, avatar_url, created_at
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;
  return (rows[0] as AppUser) ?? null;
}

export async function createUser(
  email: string,
  passwordHash: string,
  role: "admin" | "user",
  avatarUrl?: string | null,
  username?: string | null
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO users (email, password_hash, role, avatar_url, username)
    VALUES (${email}, ${passwordHash}, ${role}, ${avatarUrl ?? null}, ${username ?? null})
  `;
}

export async function updateUserEmail(id: number, email: string): Promise<void> {
  const sql = getSql();
  await sql`UPDATE users SET email = ${email} WHERE id = ${id}`;
}

export async function updateUserUsername(id: number, username: string): Promise<void> {
  const sql = getSql();
  await sql`UPDATE users SET username = ${username} WHERE id = ${id}`;
}

export async function updateUserRole(id: number, role: "admin" | "user"): Promise<void> {
  const sql = getSql();
  await sql`UPDATE users SET role = ${role} WHERE id = ${id}`;
}

export async function updateUserPassword(id: number, passwordHash: string): Promise<void> {
  const sql = getSql();
  await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${id}`;
}

export async function updateUserAvatar(id: number, avatarUrl: string): Promise<void> {
  const sql = getSql();
  await sql`UPDATE users SET avatar_url = ${avatarUrl} WHERE id = ${id}`;
}

export async function deleteUser(id: number): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM users WHERE id = ${id}`;
}

// Password reset tokens

export async function createResetToken(
  email: string,
  token: string,
  expiresAt: Date
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO password_reset_tokens (email, token, expires_at)
    VALUES (${email}, ${token}, ${expiresAt.toISOString()})
  `;
}

export async function findResetToken(token: string): Promise<ResetToken | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, email, token, expires_at, used
    FROM password_reset_tokens
    WHERE token = ${token}
    LIMIT 1
  `;
  return (rows[0] as ResetToken) ?? null;
}

export async function markResetTokenUsed(id: number): Promise<void> {
  const sql = getSql();
  await sql`UPDATE password_reset_tokens SET used = TRUE WHERE id = ${id}`;
}
