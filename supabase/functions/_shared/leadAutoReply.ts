// The automatic reply a new lead receives right after submitting the
// contact form (the "Get Booked" step of the Full Caseload System). One
// builder shared by submit-lead (the real send) and publish-site (the
// admin preview and "send me a test"), so what the practice previews is
// exactly what a lead receives. See 0070_lead_auto_reply.sql.
//
// Written for someone who may have just reached out for therapy:
//   - Never echoes their message or any detail they submitted. A shared
//     inbox or a family member could see this email.
//   - Includes crisis resources when business.show_crisis_resources is on
//     (every counseling practice; off for CMC's own agency site).
//   - Neutral by default, so it also reads correctly for a non-counseling
//     business. The practice's own warmth goes in the custom message.

export type AutoReplyInput = {
  leadName: string;
  practiceName: string;
  customMessage: string | null;
  responseTimeNote: string | null;
  telephone: string | null;
  showCrisisResources: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function withPeriod(text: string): string {
  const t = text.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

export function buildLeadAutoReply(input: AutoReplyInput): { subject: string; html: string } {
  const firstName = input.leadName.trim().split(/\s+/)[0] || 'there';
  const practice = escapeHtml(input.practiceName);
  const p = (text: string) => `<p style="margin:0 0 14px;">${text}</p>`;

  const paragraphs = [
    p(`Hi ${escapeHtml(firstName)},`),
    p(`Thank you for reaching out to ${practice}. We received your message.`),
  ];
  if (input.customMessage?.trim()) {
    for (const chunk of input.customMessage.trim().split(/\n\s*\n/)) {
      paragraphs.push(p(escapeHtml(chunk.trim()).replace(/\n/g, '<br>')));
    }
  }
  paragraphs.push(
    p(
      `<strong>What happens next:</strong> ${escapeHtml(
        withPeriod(input.responseTimeNote?.trim() || 'Someone from our office will be in touch with you soon.')
      )}`
    )
  );
  const contactLine = input.telephone
    ? `If you'd like to reach us sooner, call <a href="tel:${escapeHtml(input.telephone)}" style="color:inherit;">${escapeHtml(input.telephone)}</a> or reply to this email.`
    : 'If you have a question in the meantime, just reply to this email.';
  paragraphs.push(p(contactLine));
  paragraphs.push(p(`${practice}`));

  const crisis = input.showCrisisResources
    ? `<p style="margin:0 0 10px;font-size:13px;color:#555;"><strong>If you are in crisis</strong> or thinking about harming yourself, call or text 988 (the Suicide &amp; Crisis Lifeline) or call 911. This inbox is not monitored around the clock.</p>`
    : '';

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.55;color:#222;max-width:560px;">
${paragraphs.join('\n')}
<hr style="border:none;border-top:1px solid #ddd;margin:22px 0 14px;">
${crisis}
<p style="margin:0;font-size:12px;color:#888;">You're receiving this one-time confirmation because you contacted ${practice} through our website. For your privacy, it doesn't include the details you sent us.</p>
</div>`;

  return { subject: `We received your message | ${input.practiceName}`, html };
}
