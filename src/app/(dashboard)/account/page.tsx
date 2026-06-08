import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";
import { findUserByEmail } from "@/lib/db";
import { AccountForm } from "@/components/account/account-form";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const payload = await decrypt(session);
  const email = (payload as any)?.email as string | undefined;

  if (!email) redirect("/login");

  const dbUser = await findUserByEmail(email);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
          My Account
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          Update your profile picture, username, and password.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm">
        <AccountForm
          email={email}
          initialUsername={dbUser?.username ?? null}
          initialAvatarUrl={dbUser?.avatar_url ?? null}
        />
      </div>
    </div>
  );
}
