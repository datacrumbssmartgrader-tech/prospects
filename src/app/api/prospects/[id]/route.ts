import { NextResponse } from "next/server";
import { updateProspectField } from "@/lib/google";
import { decrypt } from "@/lib/auth";
import { cookies } from "next/headers";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    const verified = await decrypt(session);

    if (!verified) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const { prospectName, phoneNumber, stage, sourceSheet, rowIndex } = body;

    // We only update what was passed
    if (prospectName !== undefined) {
      await updateProspectField(sourceSheet, rowIndex, "Prospect Name", prospectName);
    }
    if (phoneNumber !== undefined) {
      await updateProspectField(sourceSheet, rowIndex, "Phone Number", phoneNumber);
    }
    if (stage !== undefined) {
      await updateProspectField(sourceSheet, rowIndex, "Stage", stage);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating prospect:", error);
    return NextResponse.json(
      { error: "Failed to update prospect" },
      { status: 500 }
    );
  }
}
