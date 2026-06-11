import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getInterviewUrl } from "@/lib/utils";
import { getServiceSupabase } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";

async function getTransporter(senderEmail?: string) {
  const accountsStr = process.env.OUTLOOK_ACCOUNTS || "";
  const gmailUser = process.env.GMAIL_USER || "";
  const gmailPass = process.env.GMAIL_APP_PASSWORD || "";

  // 1. If a specific sender is requested, look for it in DB first
  if (senderEmail) {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from("email_settings")
      .select("*")
      .ilike("email", senderEmail.trim())
      .maybeSingle();

    if (data && data.encrypted_password) {
      const password = decrypt(data.encrypted_password);
      if (password) {
        if (data.provider === 'outlook') {
          return {
            transporter: nodemailer.createTransport({
              host: "smtp.office365.com",
              port: 587,
              secure: false, // TLS
              auth: {
                user: data.email,
                pass: password,
              },
              tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
              }
            }),
            fromEmail: data.email
          };
        } else {
          return {
            transporter: nodemailer.createTransport({
              service: "gmail",
              auth: {
                user: data.email,
                pass: password,
              },
            }),
            fromEmail: data.email
          };
        }
      }
    }
  }

  // Fallback 1: OUTLOOK_ACCOUNTS ENV

  // 2. If it matches GMAIL_USER
  if (senderEmail && gmailUser && senderEmail.trim().toLowerCase() === gmailUser.trim().toLowerCase()) {
    return {
      transporter: nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      }),
      fromEmail: gmailUser
    };
  }

  // 3. Fallback to default configured server if present
  if (process.env.MAIL_SERVER) {
    return {
      transporter: nodemailer.createTransport({
        host: process.env.MAIL_SERVER,
        port: parseInt(process.env.MAIL_PORT || "465"),
        secure: process.env.MAIL_SSL_TLS === "true" || process.env.MAIL_SSL_TLS === "True" || process.env.MAIL_SSL_TLS === "1",
        auth: {
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
        },
      }),
      fromEmail: process.env.MAIL_FROM || process.env.MAIL_USERNAME || ""
    };
  }

  // 4. Default fallback to the first account in OUTLOOK_ACCOUNTS
  if (accountsStr) {
    const firstAcc = accountsStr.split(";").filter(Boolean)[0];
    if (firstAcc) {
      const [email, password] = firstAcc.split(":");
      if (email && password) {
        return {
          transporter: nodemailer.createTransport({
            host: "smtp.office365.com",
            port: 587,
            secure: false,
            auth: {
              user: email.trim(),
              pass: password.trim(),
            },
            tls: {
              ciphers: 'SSLv3',
              rejectUnauthorized: false
            }
          }),
          fromEmail: email.trim()
        };
      }
    }
  }

  // 5. Ultimate fallback to GMAIL
  return {
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    }),
    fromEmail: gmailUser
  };
}

function formInviteEmailTemplate(
  candidateName: string,
  jobRole: string,
  candidateId: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = `${baseUrl}/candidate-form/${candidateId}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Candidate Form Invitation</title>
</head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:32px 40px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <div style="width:32px;height:32px;background:#3b82f6;border-radius:8px;display:inline-block;vertical-align:middle;"></div>
              <span style="color:#fff;font-size:20px;font-weight:700;vertical-align:middle;margin-left:10px;">ElastiCrew</span>
            </div>
            <p style="color:#93c5fd;margin:8px 0 0;font-size:13px;letter-spacing:0.5px;">Candidate Form Portal</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="color:#64748b;font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Form Invitation</p>
            <h1 style="color:#0f172a;font-size:26px;font-weight:700;margin:0 0 16px;line-height:1.3;">Hello, ${candidateName} 👋</h1>
            <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
              Please complete your candidate form for the <strong style="color:#0f172a;">${jobRole}</strong> position. 
              This is a required step before we proceed with your application.
            </p>
            
            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 40px;border-radius:12px;letter-spacing:0.3px;">
                    Fill Candidate Form →
                  </a>
                </td>
              </tr>
            </table>
            
            <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;text-align:center;line-height:1.6;">
              If the button doesn't work, copy and paste this link:<br>
              <a href="${link}" style="color:#3b82f6;word-break:break-all;">${link}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">
              This is a one-time link. Do not share it with anyone else.<br>
              © 2026 ElastiCrew. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
function inviteEmailTemplate(
  candidateName: string,
  jobRole: string,
  interviewId: string,
  expiresAt: string,
  customBody?: string
): string {
  const link = getInterviewUrl(interviewId);
  const expiryDate = new Date(expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const bodyContent = customBody
    ? customBody.replace(/\n/g, "<br />")
    : `Hello, ${candidateName} 👋<br /><br />
       You've been invited to complete a video interview for the <strong style="color:#0f172a;">${jobRole}</strong> position. 
       Our AI-powered platform will guide you through the process.<br /><br />
       <strong>Instructions & What to expect:</strong>
       <ul style="color:#475569;font-size:14px;line-height:1.8;padding-left:20px;margin:12px 0 28px;">
         <li><strong>Questions:</strong> Asked by our AI. You have 90 seconds to answer each.</li>
         <li><strong>Recording:</strong> Starts automatically after a 10-second countdown following the question.</li>
         <li><strong>Control:</strong> Click "Submit Answer" when you are done (or wait for the timer to finish).</li>
         <li><strong>Hardware:</strong> Your webcam and microphone will be used.</li>
         <li><strong>Environment:</strong> Ensure you are in a quiet, well-lit space.</li>
         <li><strong style="color:#b91c1c;">Strict Guidelines:</strong>
           <ul style="margin:4px 0 0;padding-left:20px;color:#dc2626;list-style-type:disc;">
             <li>This is a one-time link — do not refresh the page once started.</li>
             <li>Do not exit fullscreen or switch tabs. Switching tabs/exiting fullscreen 3 times will terminate and submit your interview automatically.</li>
           </ul>
         </li>
       </ul>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Interview Invitation</title>
</head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:32px 40px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <div style="width:32px;height:32px;background:#3b82f6;border-radius:8px;display:inline-block;vertical-align:middle;"></div>
              <span style="color:#fff;font-size:20px;font-weight:700;vertical-align:middle;margin-left:10px;">ElastiCrew</span>
            </div>
            <p style="color:#93c5fd;margin:8px 0 0;font-size:13px;letter-spacing:0.5px;">AI Video Interview Platform</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="color:#64748b;font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Interview Invitation</p>
            <div style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
              ${bodyContent}
            </div>
            
            <!-- Info Box -->
            <div style="background:#f1f5f9;border-radius:12px;padding:20px 24px;margin:0 0 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;">
                    <span style="color:#64748b;font-size:13px;">Position</span>
                    <div style="color:#0f172a;font-weight:600;font-size:15px;margin-top:2px;">${jobRole}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;border-top:1px solid #e2e8f0;margin-top:8px;">
                    <span style="color:#64748b;font-size:13px;margin-top:8px;display:block;">Link expires</span>
                    <div style="color:#dc2626;font-weight:600;font-size:15px;margin-top:2px;">${expiryDate}</div>
                  </td>
                </tr>
              </table>
            </div>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 40px;border-radius:12px;letter-spacing:0.3px;">
                    Begin Interview →
                  </a>
                </td>
              </tr>
            </table>
            
            <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;text-align:center;line-height:1.6;">
              If the button doesn't work, copy and paste this link:<br>
              <a href="${link}" style="color:#3b82f6;word-break:break-all;">${link}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">
              This is a one-time link. Do not share it with anyone else.<br>
              © 2026 ElastiCrew. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function completionEmailTemplate(
  candidateName: string,
  jobRole: string,
  reviewUrl: string
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Interview Completed</title>
</head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:32px 40px;text-align:center;">
            <div style="width:32px;height:32px;background:#10b981;border-radius:8px;display:inline-block;vertical-align:middle;"></div>
            <span style="color:#fff;font-size:20px;font-weight:700;vertical-align:middle;margin-left:10px;">ElastiCrew</span>
            <p style="color:#6ee7b7;margin:8px 0 0;font-size:13px;">Interview Completed ✓</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h1 style="color:#0f172a;font-size:24px;font-weight:700;margin:0 0 16px;">
              🎉 Interview Recording Ready
            </h1>
            <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
              <strong>${candidateName}</strong> has completed their video interview for the <strong>${jobRole}</strong> position. 
              The recording is now available for review in your dashboard.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 40px;border-radius:12px;">
                    Review Interview →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">© 2026 ElastiCrew. All rights reserved.</p>
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
    const { type, to, candidateName, jobRole, interviewId, expiresAt, reviewUrl, candidateId, subject: customSubject, bodyText } = body;

    if (!type || !to) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let subject = "";
    let html = "";

    if (type === "invite") {
      subject = customSubject || `ElastiCrew Video Bot Screening Invitation — ${jobRole} Position`;
      html = inviteEmailTemplate(candidateName, jobRole, interviewId, expiresAt, bodyText);
    } else if (type === "form_invite") {
      subject = `Candidate Form — ${jobRole} Position`;
      html = formInviteEmailTemplate(candidateName, jobRole, candidateId);
    } else if (type === "completion") {
      subject = `Interview Completed: ${candidateName} — ${jobRole}`;
      html = completionEmailTemplate(candidateName, jobRole, reviewUrl);
    } else {
      return NextResponse.json({ error: "Invalid email type" }, { status: 400 });
    }

    const fromName = process.env.MAIL_FROM_NAME || "ElastiCrew";
    const { transporter, fromEmail } = await getTransporter(body.senderEmail);

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
