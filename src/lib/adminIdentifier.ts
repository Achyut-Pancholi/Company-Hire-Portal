import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Extracts a human-readable identifier for the current admin making the request.
 * Can be an email or fallback system identifier.
 */
export async function getCurrentAdminIdentifier(req: NextRequest): Promise<string> {
  // 1. Check custom admin header if passed from Vite dashboard or API
  const adminEmailHeader = req.headers.get("x-admin-email") || req.headers.get("x-admin-id");
  if (adminEmailHeader) {
    return adminEmailHeader;
  }

  // 2. Check if user has an active Supabase session
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Read-only cookie setup in API request context
        },
      },
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        return user.email || user.id || "Admin (Session)";
      }
    } catch (e) {
      console.error("[adminIdentifier] Error checking session:", e);
    }
  }

  // 3. Fallback to API Key identification or general admin
  return "Admin (API Key)";
}
