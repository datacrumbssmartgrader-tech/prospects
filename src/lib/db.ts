import { neon } from "@neondatabase/serverless";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set.");
  return neon(url);
}

export type AppUser = {
  id: number;
  username: string;
  password_hash: string;
  role: "admin" | "user";
  created_at: string;
};

export async function getUsers(): Promise<Omit<AppUser, "password_hash">[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, username, role, created_at
    FROM users
    ORDER BY created_at DESC
  `;
  return rows as Omit<AppUser, "password_hash">[];
}

export async function findUserByUsername(username: string): Promise<AppUser | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, username, password_hash, role, created_at
    FROM users
    WHERE username = ${username}
    LIMIT 1
  `;
  return (rows[0] as AppUser) ?? null;
}

export async function createUser(
  username: string,
  passwordHash: string,
  role: "admin" | "user"
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO users (username, password_hash, role)
    VALUES (${username}, ${passwordHash}, ${role})
  `;
}

export async function updateUsername(id: number, username: string): Promise<void> {
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

export async function deleteUser(id: number): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM users WHERE id = ${id}`;
}
