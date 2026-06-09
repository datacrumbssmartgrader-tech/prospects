import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";
import { fetchAllProspects } from "@/lib/google";

const SOURCE_GID = 991813324;

function normalize(n: string): string {
  return n.replace(/\D/g, "");
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const verified = await decrypt(session);
  if (!verified || (verified as any).role !== "admin") return null;
  return verified;
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allProspects = await fetchAllProspects();

    const sourceEntries = allProspects.filter((p) => p.sheetGid === SOURCE_GID);
    const otherEntries = allProspects.filter((p) => p.sheetGid !== SOURCE_GID);

    const existingNumbers = new Set(
      otherEntries.map((p) => normalize(p.phoneNumber)).filter(Boolean)
    );

    const entries = sourceEntries.map((p) => {
      const normalizedPhone = normalize(p.phoneNumber);
      return {
        prospectName: p.prospectName,
        phoneNumber: p.phoneNumber,
        normalizedPhone,
        rowIndex: p.rowIndex,
        isDuplicate: normalizedPhone.length > 0 && existingNumbers.has(normalizedPhone),
      };
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Duplicates check error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
