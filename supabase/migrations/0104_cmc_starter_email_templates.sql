-- CMC only. Starter templates for the Inquiries compose box (CRM phase 1).
-- Draft wording, for Luke's approval. Editable in the admin afterward.
-- Merge fields: {{first_name}}, {{practice}}, {{audit_link}}. Anything in
-- [square brackets] is for Luke to fill in; the admin won't send while one
-- is left. The signature (Luke Burgett, LPCA) is added automatically.
insert into public.email_templates (name, subject, body, sort_order) values
(
  'First reply: audit request',
  'Your Caseload Audit for {{practice}}',
  E'Hi {{first_name}},\n\nThanks for asking for a Caseload Audit. I''m Luke, the founder of Therapy Marketing Co. and a licensed counselor myself.\n\nYour audit is here anytime you want to open it again: {{audit_link}}\n\nWould a 20-minute call help? I''ll walk you through what I''d do first for {{practice}} and answer anything the audit raised. Just reply with a couple of times that work for you.',
  1
),
(
  'First reply: contact form',
  'Thanks for reaching out',
  E'Hi {{first_name}},\n\nThanks for getting in touch. I read your message, and I''d be glad to help.\n\nThe easiest next step is a 20-minute call. I''ll ask about your practice and who you want to see more of, and you''ll leave with a clear picture of what I''d do first, whether or not we work together.\n\nReply with a couple of times that work this week, or a good number to call.',
  2
),
(
  'Recap after a call',
  'Recap of our call',
  E'Hi {{first_name}},\n\nThanks for the time today. Here''s what we covered:\n\n- What''s working now: [fill in]\n- What''s getting in the way: [fill in]\n- What I''d do first: [fill in]\n\nNext step: [what happens next, and when].\n\nIf I missed anything, just reply and tell me.',
  3
),
(
  'Your plan and price',
  'Your plan for {{practice}}',
  E'Hi {{first_name}},\n\nHere''s what I''d recommend for {{practice}}: [plan name].\n\nWhat''s included: [the short list].\n\nCost: $1,500 for the website build, then $[monthly price]/mo. Month to month, cancel anytime.\n\nYour data is yours: download it anytime, and it always goes with you. If you leave, you keep your website and domain.\n\nIf it looks right, reply and I''ll send the agreement and a start date. Happy to answer questions first.',
  4
),
(
  'Checking in',
  'Checking in',
  E'Hi {{first_name}},\n\nJust checking in on {{practice}}. Did you get a chance to look at [the audit / the plan]?\n\nIf now isn''t the right time, tell me and I''ll stop following up.',
  5
),
(
  'Closing your file',
  'Closing your file for now',
  E'Hi {{first_name}},\n\nI haven''t heard back, so I''ll assume now isn''t the right time and stop following up.\n\nIf things change, reply to this email anytime. Your audit stays here for you: {{audit_link}}\n\nWishing you and {{practice}} well.',
  6
);
