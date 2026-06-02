import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { revalidatePath } from "next/cache";

const transporter = nodemailer.createTransport(
  process.env.MAIL_SERVER
    ? {
        host: process.env.MAIL_SERVER,
        port: parseInt(process.env.MAIL_PORT || "465"),
        secure:
          process.env.MAIL_SSL_TLS === "true" ||
          process.env.MAIL_SSL_TLS === "True" ||
          process.env.MAIL_SSL_TLS === "1",
        auth: {
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
        },
      }
    : {
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      }
);

function reportEmailTemplate(
  candidateName: string,
  jobRole: string,
  reportUrl: string,
  scores: { resume?: number; video?: number; tech?: number },
  recommendation: string
): string {
  const scoreColor = (v?: number) =>
    !v ? "#64748b" : v >= 85 ? "#10b981" : v >= 70 ? "#3b82f6" : v >= 55 ? "#f59e0b" : "#ef4444";

  const recColor =
    recommendation === "Selected"
      ? "#10b981"
      : recommendation === "Rejected"
      ? "#ef4444"
      : "#f59e0b";

  const scoreRow = (label: string, value?: number) =>
    value
      ? `<tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;">${label}</td>
          <td style="padding:6px 0;text-align:right;font-weight:700;font-size:14px;color:${scoreColor(value)};">${value}/100</td>
        </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Interview Report — KadelLabs</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 4px 30px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0E2D7B 0%,#1e40af 100%);padding:32px 40px;text-align:center;">
            <div style="display:inline-block;vertical-align:middle;">
              <span style="color:#7DBA00;font-size:22px;font-weight:900;letter-spacing:-0.5px;">Kade</span><span style="color:#fff;font-size:22px;font-weight:900;">Labs</span>
            </div>
            <p style="color:rgba(255,255,255,0.6);margin:8px 0 0;font-size:12px;letter-spacing:0.8px;text-transform:uppercase;">Interview Report</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="color:#64748b;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Your Report is Ready</p>
            <h1 style="color:#0E2D7B;font-size:24px;font-weight:800;margin:0 0 14px;line-height:1.3;">Hello, ${candidateName} 👋</h1>
            <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 28px;">
              Your interview report for the <strong style="color:#0E2D7B;">${jobRole}</strong> position has been prepared and is now available for you to view.
            </p>

            <!-- Score Summary -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:20px 24px;margin:0 0 28px;">
              <p style="color:#0E2D7B;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 12px;">Score Summary</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${scoreRow("Resume Score", scores.resume)}
                ${scoreRow("Video Interview", scores.video)}
                ${scoreRow("Tech Interview", scores.tech)}
                <tr style="border-top:1px solid #e2e8f0;">
                  <td style="padding:10px 0 4px;color:#0E2D7B;font-size:13px;font-weight:700;">Final Recommendation</td>
                  <td style="padding:10px 0 4px;text-align:right;">
                    <span style="background:${recColor};color:#fff;padding:3px 12px;border-radius:999px;font-size:12px;font-weight:700;">${recommendation || "Under Review"}</span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${reportUrl}" style="display:inline-block;background:linear-gradient(135deg,#0E2D7B,#1e40af);color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:16px 48px;border-radius:12px;letter-spacing:0.3px;">
                    View Full Report →
                  </a>
                </td>
              </tr>
            </table>

            <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;text-align:center;line-height:1.7;">
              This is a read-only report. If the button doesn't work, copy and paste:<br>
              <a href="${reportUrl}" style="color:#0E2D7B;word-break:break-all;">${reportUrl}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">
              This report is shared by KadelLabs Hiring Team.<br>
              © 2025 KadelLabs. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { candidateId, candidateEmail, candidateName, jobRole, scores, recommendation } = body;

    if (!candidateId || !candidateEmail) {
      return NextResponse.json({ error: "Missing candidateId or candidateEmail" }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // 1. Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // 2. First fetch the existing extracted_data so we can merge into it
    const { data: existing, error: fetchError } = await supabase
      .from("candidates")
      .select("extracted_data")
      .eq("id", candidateId)
      .single();

    if (fetchError) {
      console.error("Failed to fetch candidate:", fetchError);
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // 3. Embed the token inside extracted_data JSONB (no new columns needed)
    const mergedData = {
      ...(existing?.extracted_data || {}),
      _reportShareToken: token,
      _reportShareExpiresAt: expiresAt,
    };

    // 4. Update candidate: store token in extracted_data + set report_status to Shared
    const { error: updateError } = await supabase
      .from("candidates")
      .update({
        extracted_data: mergedData,
        report_status: "Shared",
      })
      .eq("id", candidateId);

    if (updateError) {
      console.error("Failed to store report token:", updateError);
      return NextResponse.json({ error: "Failed to generate report link" }, { status: 500 });
    }

    // 5. Build the report URL dynamically from the request origin to guarantee correctness
    let baseUrl = req.nextUrl.origin;
    if (baseUrl === "null" || !baseUrl || baseUrl.includes("localhost")) {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    }
    baseUrl = baseUrl.replace(/\/$/, "");
    const reportUrl = `${baseUrl}/report/${token}`;

    // 6. Send email to the candidate
    if (!body.skipEmail) {
      const fromName = process.env.MAIL_FROM_NAME || "KadelLabs";
      const fromEmail = process.env.MAIL_FROM || process.env.GMAIL_USER;

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: candidateEmail,
        subject: `Your Interview Report is Ready — ${jobRole} Position`,
        html: reportEmailTemplate(candidateName, jobRole, reportUrl, scores || {}, recommendation || "Under Review"),
      });
    }

    revalidatePath("/", "layout");
    return NextResponse.json({ success: true, reportUrl, token });
  } catch (error: any) {
    console.error("Report share error:", error);
    return NextResponse.json({ error: "Failed to share report" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
