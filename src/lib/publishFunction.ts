import { supabase } from './supabase';

// Thin wrapper around the publish-site Edge Function, shared by every
// admin page that needs to call it (blog publish, website-content saves,
// suggestion approvals all need a rebuild; team invite/resend need the
// same function's other actions). See supabase/functions/publish-site for
// the action routing and the auth checks each action does server-side.
export async function callPublishFunction(
  body: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  const { data: sessionData } = await supabase.auth.getSession();
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/publish-site`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${sessionData.session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: result.error ?? 'Something went wrong.' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function triggerRebuild(): Promise<{ ok: boolean; error?: string }> {
  return callPublishFunction({ action: 'publish' });
}
