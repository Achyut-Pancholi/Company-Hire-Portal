const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

let url = "https://gsevnubsikjmonlpoeux.supabase.co";
let key = "";

try {
  if (fs.existsSync(".env.local")) {
    const envContent = fs.readFileSync(".env.local", "utf8");
    const lines = envContent.split("\n");
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) {
        url = trimmed.split("NEXT_PUBLIC_SUPABASE_URL=")[1].trim().replace(/['"]/g, "");
      }
      if (trimmed.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) {
        key = trimmed.split("SUPABASE_SERVICE_ROLE_KEY=")[1].trim().replace(/['"]/g, "");
      }
    });
  }
} catch (e) {
  console.log("Could not read .env.local, using defaults:", e.message);
}

const supabase = createClient(url, key);

const migrationSql = `
-- Add Teams columns to your existing interviews table
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS teams_meeting_id TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS teams_join_url TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS teams_start_time TIMESTAMPTZ;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS teams_end_time TIMESTAMPTZ;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS teams_recording_url TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS teams_recording_status TEXT DEFAULT 'pending';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS teams_transcript_id TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS teams_transcript_text TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS teams_transcript_fetched_at TIMESTAMPTZ;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS teams_ai_summary TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS teams_ai_skills JSONB;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS teams_ai_communication TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS teams_ai_strengths JSONB;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS teams_ai_weaknesses JSONB;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS teams_ai_recommendation TEXT;

-- New table for Microsoft OAuth tokens
CREATE TABLE IF NOT EXISTS microsoft_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE, -- Removed REFERENCES auth.users(id) to avoid foreign key violations on static admin
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

async function main() {
  console.log(`Running Microsoft Teams integration migrations on: ${url}...`);

  // Try RPC method
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: migrationSql
  });

  if (error) {
    console.log("RPC method failed/unavailable, trying direct REST fetch endpoint...");
    const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({ 
        sql: migrationSql
      })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      console.error("Migration failed. Error:", errText);
      console.log("\n📋 Please run the SQL manually in Supabase Dashboard SQL Editor:");
      console.log(migrationSql);
      process.exit(1);
    } else {
      console.log("✅ Migration successful via HTTP fetch endpoint!");
    }
  } else {
    console.log("✅ Migration successful via RPC!");
    console.log("Result:", data);
  }
}

main();
