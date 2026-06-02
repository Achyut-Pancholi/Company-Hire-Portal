import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, saveTokensToSupabase } from "@/services/microsoftAuth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  
  if (!code) {
    return NextResponse.json({ error: "Authorization code missing" }, { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error);
    }
    
    // Save tokens using the static admin user ID fallback
    await saveTokensToSupabase(undefined, tokens);

    // Redirect to the settings page
    const baseUrl = new URL(request.url).origin;
    return NextResponse.redirect(`${baseUrl}/admin/settings?teams=connected`);
  } catch (error: any) {
    console.error("Microsoft OAuth callback error:", error);
    return NextResponse.json({ error: "Failed to authenticate Microsoft account: " + error.message }, { status: 500 });
  }
}
