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

import { renderEmail, type Brand } from './emailLayout.ts';

export type AutoReplyInput = {
  leadName: string;
  practiceName: string;
  customMessage: string | null;
  responseTimeNote: string | null;
  telephone: string | null;
  showCrisisResources: boolean;
  brand: Brand;
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

  const paragraphs = [`Hi ${escapeHtml(firstName)},`, `Thank you for reaching out to ${practice}. We received your message.`];
  if (input.customMessage?.trim()) {
    for (const chunk of input.customMessage.trim().split(/\n\s*\n/)) {
      paragraphs.push(escapeHtml(chunk.trim()).replace(/\n/g, '<br>'));
    }
  }
  paragraphs.push(
    `<strong>What happens next:</strong> ${escapeHtml(
      withPeriod(input.responseTimeNote?.trim() || 'Someone from our office will be in touch with you soon.')
    )}`
  );
  paragraphs.push(
    input.telephone
      ? `If you'd like to reach us sooner, call <a href="tel:${escapeHtml(input.telephone)}">${escapeHtml(input.telephone)}</a> or reply to this email.`
      : 'If you have a question in the meantime, just reply to this email.'
  );

  const footer = [
    ...(input.showCrisisResources
      ? ['<strong>If you are in crisis</strong> or thinking about harming yourself, call or text 988 (the Suicide &amp; Crisis Lifeline) or call 911. This inbox is not monitored around the clock.']
      : []),
    `You're receiving this one-time confirmation because you contacted ${practice} through our website. For your privacy, it doesn't include the details you sent us.`,
  ];

  const html = renderEmail({
    brand: input.brand,
    preheader: 'We received your message. Here is what happens next.',
    paragraphs,
    signature: { name: input.practiceName },
    footer,
  });

  return { subject: `We received your message | ${input.practiceName}`, html };
}
