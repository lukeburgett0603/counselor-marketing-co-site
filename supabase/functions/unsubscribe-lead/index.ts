// Public, unauthenticated by design (see supabase/config.toml —
// verify_jwt = false for this function only) — this is the link a real
// person clicks from inside a nurture email, with no session at all.
// Does exactly one narrow, safe thing: marks that one lead as
// unsubscribed from the nurture sequence. Nothing else about the lead
// (status, notes, other fields) is touched or even readable through
// this endpoint — CAN-SPAM requires a working one-click unsubscribe on
// every marketing email, which this is.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function htmlResponse(message: string): Response {
  return new Response(
    `<!doctype html><html><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;">
      <p>${message}</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

Deno.serve(async (req: Request) => {
  const leadId = new URL(req.url).searchParams.get('lead');
  if (!leadId) {
    return htmlResponse('Missing link — nothing to unsubscribe.');
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await supabase
    .from('leads')
    .update({ sequence_unsubscribed_at: new Date().toISOString() })
    .eq('id', leadId);

  if (error) {
    return htmlResponse("Something went wrong — please contact us directly if you'd like to be removed from these emails.");
  }
  return htmlResponse("You've been unsubscribed from these emails.");
});
