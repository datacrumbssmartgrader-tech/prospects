import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/auth";
import { UserManagement } from "@/components/admin/user-management";
export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const payload = await decrypt(session);

  if (!payload || (payload as any).role !== "admin") {
    redirect("/prospects");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
          Accounts
        </h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Create and manage user accounts.
        </p>
      </div>
      <UserManagement />
    </div>
  );
}
