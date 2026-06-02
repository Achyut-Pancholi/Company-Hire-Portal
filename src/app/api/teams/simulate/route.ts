import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const STATIC_ADMIN_USER_ID = "00000000-0000-0000-0000-000000000000";

// GET: Check connection status
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from("microsoft_tokens")
      .select("*")
      .eq("user_id", STATIC_ADMIN_USER_ID)
      .single();

    if (error || !data) {
      return NextResponse.json({ connected: false });
    }

    const isSandbox = data.access_token === "mock-demo-token-12345";
    
    // Check if real token is expired
    let expired = false;
    if (!isSandbox) {
      expired = new Date(data.expires_at) <= new Date();
    }

    return NextResponse.json({
      connected: true,
      isSandbox,
      expired,
      expiresAt: data.expires_at,
      scope: data.scope,
    });
  } catch (error: any) {
    console.error("Failed to check Teams connection status:", error);
    return NextResponse.json({ connected: false, error: error.message });
  }
}

// POST: Toggle connect sandbox / disconnect
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body; // "connect" or "disconnect"

    if (action === "disconnect") {
      const { error } = await supabase
        .from("microsoft_tokens")
        .delete()
        .eq("user_id", STATIC_ADMIN_USER_ID);

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({ success: true, connected: false });
    }

    // Connect Demo Sandbox
    const expiresAt = new Date("2099-12-31T23:59:59.000Z");
    const { error } = await supabase
      .from("microsoft_tokens")
      .upsert({
        user_id: STATIC_ADMIN_USER_ID,
        access_token: "mock-demo-token-12345",
        refresh_token: "mock-demo-refresh-12345",
        expires_at: expiresAt.toISOString(),
        scope: "OnlineMeetings.ReadWrite OnlineMeetingRecording.Read.All OnlineMeetingTranscript.Read.All User.Read Calendars.ReadWrite",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      connected: true,
      isSandbox: true,
    });
  } catch (error: any) {
    console.error("Failed to toggle Teams sandbox simulation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
