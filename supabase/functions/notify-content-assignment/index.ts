// Sends a "you've been assigned a content piece" email the moment an
// owner/agency session assigns (or reassigns) a content_plan_items row to
// a team member — see CLAUDE.md's "Content Plan" sections for the wider
// feature. Reuses the existing NURTURE_RESEND_API_KEY/NURTURE_SENDER_EMAIL
// secrets already configured for the lead-magnet nurture sequence — this
// is the same shape of problem (send real content to a real recipient,
// needs a secret at request time) as submit-lead's own notification email,
// just an internal team notification instead of a lead one, so no new
// Resend sending identity is needed.
//
// Auth: same verify_jwt-isn't-enough pattern as every other action
// function in this project — a real logged-in session is required, plus
// an explicit active-owner/agency check via admin_users (service_role,
// bypassing RLS), since only owner/agency can ever set assigned_to on a
// content plan item in the admin UI today.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  blog_post: 'Blog post',
  service_page: 'New Service Page',
  who_we_serve_page: 'New Who We Serve page',
  update_existing_page: 'Update existing page',
  undecided: 'Content piece',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: authError,
  } = await callerClient.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  const contentPlanItemId = typeof body.content_plan_item_id === 'string' ? body.content_plan_item_id : '';
  if (!contentPlanItemId) {
    return jsonResponse({ error: 'content_plan_item_id is required' }, 400);
  }
  // Computed client-side via window.location.origin + withBase(), same
  // "never depend on a Supabase dashboard setting" reasoning as every
  // other redirectTo in this project.
  const redirectTo = typeof body.redirectTo === 'string' ? body.redirectTo : null;

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerRow } = await adminClient
    .from('admin_users')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();
  if (!callerRow || (callerRow.role !== 'owner' && callerRow.role !== 'agency') || callerRow.status !== 'active') {
    return jsonResponse({ error: 'Only an active owner or agency admin can assign content' }, 403);
  }

  const { data: item, error: itemError } = await adminClient
    .from('content_plan_items')
    .select('title, keyword, content_type, due_date, assigned_to')
    .eq('id', contentPlanItemId)
    .maybeSingle();
  if (itemError || !item) {
    return jsonResponse({ error: 'Content plan item not found' }, 404);
  }
  if (!item.assigned_to) {
    return jsonResponse({ error: 'This item has no assignee' }, 400);
  }

  const { data: assignee } = await adminClient
    .from('admin_users')
    .select('email')
    .eq('id', item.assigned_to)
    .maybeSingle();
  if (!assignee?.email) {
    return jsonResponse({ error: 'Assignee not found' }, 404);
  }

  const resendApiKey = Deno.env.get('NURTURE_RESEND_API_KEY');
  const senderEmail = Deno.env.get('NURTURE_SENDER_EMAIL');
  if (!resendApiKey || !senderEmail) {
    // Same graceful "not configured" shape as every other optional email
    // path in this project — never a hard error just because a client
    // site hasn't set up transactional email.
    return jsonResponse({ ok: true, sent: false, reason: 'Email sending is not configured for this site' });
  }

  const { data: business } = await adminClient.from('business').select('display_name').maybeSingle();
  const fromHeader = business?.display_name ? `${business.display_name} <${senderEmail}>` : senderEmail;

  const contentTypeLabel = CONTENT_TYPE_LABELS[item.content_type as string] ?? 'Content piece';
  const dueDateLine = item.due_date
    ? new Date(`${item.due_date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'No due date set';

  const rows: [string, string][] = [
    ['Content type', contentTypeLabel],
    ['Due', dueDateLine],
  ];
  if (item.keyword) rows.push(['Target keyword', item.keyword as string]);

  const rowsHtml = rows
    .map(([label, value]) => `<p style="margin:0 0 8px;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`)
    .join('\n');
  const buttonHtml = redirectTo
    ? `<p style="margin:20px 0 0;"><a href="${redirectTo}" style="display:inline-block;padding:10px 20px;background:#1a1a1a;color:#ffffff;border-radius:6px;text-decoration:none;font-weight:600;">View my content assignments</a></p>`
    : '';

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromHeader,
        to: [assignee.email],
        subject: `You've been assigned: ${item.title}`,
        html: `<p style="margin:0 0 16px;">You've been assigned a new content piece: <strong>${escapeHtml(item.title as string)}</strong></p>\n${rowsHtml}\n${buttonHtml}`,
      }),
    });
    if (!resendResponse.ok) {
      console.error('notify-content-assignment: Resend rejected the email', {
        status: resendResponse.status,
        body: await resendResponse.text(),
      });
      return jsonResponse({ ok: true, sent: false, reason: 'Resend rejected the email' });
    }
  } catch (err) {
    console.error('notify-content-assignment: send threw', err);
    return jsonResponse({ ok: true, sent: false, reason: 'Unexpected error sending email' });
  }

  return jsonResponse({ ok: true, sent: true });
});
