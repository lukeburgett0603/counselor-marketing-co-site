// One-click unsubscribe from the instant audit's follow-up emails (CMC
// only). Reached from a link in an email client with no session, so
// verify_jwt is off (supabase/config.toml); the audit's random token is
// the only key, and the only thing it can do is stop that audit's emails.
// Reads the token from the query string for any method, so both a
// person's GET and a mail provider's RFC 8058 POST work.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const page = (title: string, body: string) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:15vh auto;padding:0 20px;color:#18181b;line-height:1.6">
<h1 style="font-size:22px">${title}</h1><p>${body}</p></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get('t') ?? '';
  if (!/^[0-9a-f]{36}$/.test(token)) return page('Link not recognized', 'This unsubscribe link is incomplete. Reply to any of our emails and we will take you off the list.');
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  await db.from('audits').update({ unsubscribed_at: new Date().toISOString() }).eq('token', token).is('unsubscribed_at', null);
  return page("You're unsubscribed", "You won't get any more follow-up emails about your Caseload Audit. Your audit link still works whenever you want it.");
});
