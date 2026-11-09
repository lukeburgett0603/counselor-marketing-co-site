// CMC-ONLY (keep when syncing): where a prospect's reply should go.
// With INBOUND_REPLY_DOMAIN set (CRM phase 2), every email to a prospect
// with an inquiry uses their private address r-<reply_token>@<domain>,
// which receive-lead-email files on their timeline and forwards to Luke.
// Without it (or with no inquiry), replies go to Luke's own inbox.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const REPLY_PREFIX = 'r-';

export async function lukeInbox(db: SupabaseClient): Promise<string | undefined> {
  const { data } = await db.from('business').select('lead_notification_email').maybeSingle();
  return String(data?.lead_notification_email ?? '').split(',').map((s) => s.trim()).filter(Boolean)[0];
}

export async function replyAddressFor(db: SupabaseClient, leadId: string | null | undefined): Promise<string | undefined> {
  const domain = Deno.env.get('INBOUND_REPLY_DOMAIN');
  if (domain && leadId) {
    const { data } = await db.from('leads').select('reply_token').eq('id', leadId).maybeSingle();
    if (data?.reply_token) return `${REPLY_PREFIX}${data.reply_token}@${domain}`;
  }
  return lukeInbox(db);
}
