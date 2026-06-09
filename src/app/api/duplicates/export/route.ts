import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";
import { addProspect } from "@/lib/google";

async function requireAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const verified = await decrypt(session);
  if (!verified) return null;
  return verified;
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { prospects } = body as {
      prospects: { prospectName: string; phoneNumber: string }[];
    };

    if (!Array.isArray(prospects) || prospects.length === 0) {
      return NextResponse.json({ error: "No prospects to export" }, { status: 400 });
    }

    let exported = 0;
    for (const p of prospects) {
      await addProspect({
        prospectName: p.prospectName,
        phoneNumber: p.phoneNumber,
        stage: "Contacted",
      });
      exported++;
    }

    return NextResponse.json({ success: true, exported });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
