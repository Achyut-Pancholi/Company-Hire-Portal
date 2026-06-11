import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("email_settings")
      .select("email, provider");

    const emails: string[] = [];

    if (!error && data) {
      data.forEach(setting => {
        if (setting.email && setting.email.includes("@")) {
          emails.push(setting.email.trim());
        }
      });
    }

    // Fallback logic for development if DB is completely empty
    if (emails.length === 0) {
      const accountsStr = process.env.OUTLOOK_ACCOUNTS || "";
      const gmailUser = process.env.GMAIL_USER || "";
      
      if (accountsStr) {
        accountsStr.split(";").filter(Boolean).forEach(acc => {
          const [email] = acc.split(":");
          if (email && email.includes("@")) {
            emails.push(email.trim());
          }
        });
      }
      
      if (emails.length === 0 && gmailUser) {
        emails.push(gmailUser);
      }
      
      if (emails.length === 0) {
        emails.push("careers@elasticrew.com");
      }
    }
    
    // Ensure unique emails
    const uniqueEmails = Array.from(new Set(emails));
    
    return NextResponse.json({ emails: uniqueEmails });
  } catch (error: any) {
    console.error("Error fetching senders:", error);
    return NextResponse.json({ emails: ["careers@elasticrew.com"] });
  }
}
