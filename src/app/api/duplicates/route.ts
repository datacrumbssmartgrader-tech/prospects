import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";
import { fetchAllProspects } from "@/lib/google";

const SOURCE_GID = 991813324;

function normalize(raw: string): string {
  if (!raw) return "";

  const matches = raw.match(/[+]?[\d\s\-()/]{7,30}/g);
  if (!matches) return "";

  for (const match of matches) {
    let num = match.replace(/[\s\-()/]/g, "");
    num = num.replace(/[^0-9+]/g, "");
    if (!num) continue;

    let digits = num.replace(/^\+/, "");

    if (digits.startsWith("0") && digits.length === 11) {
      digits = "92" + digits.slice(1);
    } else if (digits.length === 10 && digits.startsWith("3")) {
      digits = "92" + digits;
    } else if (digits.startsWith("0092")) {
      digits = digits.slice(2);
    } else if (digits.startsWith("00")) {
      digits = digits.slice(2);
    }

    if (digits.length >= 8 && digits.length <= 15) {
      return digits;
    }
  }

  return "";
}

async function requireAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const verified = await decrypt(session);
  if (!verified) return null;
  return verified;
}

export async function GET() {
  try {
    const session = await requireAuth();
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
