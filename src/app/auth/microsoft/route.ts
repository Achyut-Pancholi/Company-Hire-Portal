import { NextResponse } from "next/server";
import { getMicrosoftAuthUrl } from "@/services/microsoftAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = getMicrosoftAuthUrl();
    console.log("Generated Microsoft Auth URL:", url);
    return NextResponse.redirect(url);
  } catch (error: any) {
    console.error("Microsoft auth redirect error:", error);
    return NextResponse.json({ error: "Failed to generate auth URL" }, { status: 500 });
  }
}
