import { createClient } from '@supabase/supabase-js';

// Use service role client for token storage (server-side only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const STATIC_ADMIN_USER_ID = "00000000-0000-0000-0000-000000000000";

export function getMicrosoftAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID || '',
    response_type: 'code',
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI || '',
    scope: process.env.MICROSOFT_SCOPES || '',
    response_mode: 'query',
  });
  return `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeCodeForTokens(code) {
  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID || '',
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
        code,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI || '',
        grant_type: 'authorization_code',
      }),
    }
  );
  return res.json();
}

export async function saveTokensToSupabase(userId, tokenData) {
  const targetUserId = userId || STATIC_ADMIN_USER_ID;
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
  const { error } = await supabase
    .from('microsoft_tokens')
    .upsert({
      user_id: targetUserId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt.toISOString(),
      scope: tokenData.scope,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) throw new Error('Failed to save Microsoft token: ' + error.message);
}

export async function getValidToken(userId) {
  const targetUserId = userId || STATIC_ADMIN_USER_ID;
  const { data, error } = await supabase
    .from('microsoft_tokens')
    .select('*')
    .eq('user_id', targetUserId)
    .single();

  if (error || !data) throw new Error('Microsoft account not connected');

  if (data.access_token === 'mock-demo-token-12345') {
    return data.access_token;
  }

  // If token is still valid (with 5min buffer), return it
  if (new Date(data.expires_at) > new Date(Date.now() + 5 * 60 * 1000)) {
    return data.access_token;
  }

  // Refresh the token
  const refreshed = await fetch(
    `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID || '',
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
        refresh_token: data.refresh_token,
        grant_type: 'refresh_token',
      }),
    }
  );
  const newTokens = await refreshed.json();
  if (newTokens.error) throw new Error('Token refresh failed: ' + newTokens.error_description);

  await saveTokensToSupabase(targetUserId, newTokens);
  return newTokens.access_token;
}
