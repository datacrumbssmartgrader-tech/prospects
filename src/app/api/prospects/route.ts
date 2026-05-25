import { NextResponse } from "next/server";
import { fetchAllProspects, addProspect } from "@/lib/google";
import { decrypt } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    const verified = await decrypt(session);
    
    if (!verified) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prospects = await fetchAllProspects();
    return NextResponse.json(prospects);
  } catch (error) {
    console.error("Error fetching prospects:", error);
    return NextResponse.json(
      { error: "Failed to fetch prospects" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    const verified = await decrypt(session);

    if (!verified) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { prospectName, phoneNumber, stage, sourceSheet } = body;

    if (!prospectName) {
      return NextResponse.json(
        { error: "Prospect Name is required" },
        { status: 400 }
      );
    }

    const newProspect = await addProspect(
      {
        prospectName,
        phoneNumber: phoneNumber || "",
        stage: stage || "Contacted",
      },
      sourceSheet
    );

    return NextResponse.json(newProspect);
  } catch (error) {
    console.error("Error adding prospect:", error);
    return NextResponse.json(
      { error: "Failed to add prospect" },
      { status: 500 }
    );
  }
}
