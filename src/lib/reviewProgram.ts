// Copy for "Trusted Without Asking," the ethical Google review program
// (admin/review-program.astro). Kept in one file so the wording can be
// reviewed as a whole.
//
// Replaced the waiting-room sign approach on 2026-10-03. A sign in a room
// only clients sit in, or a review flier in discharge papers, is still a
// request aimed at current or former clients, which ACA C.3.b (also APA
// 5.05, NASW 4.07(b)) prohibits. "Passive" lowers the pressure; it doesn't
// change who's being asked. So nothing here ever asks a client for a
// review. The program instead:
//   1. removes every client-directed ask (ETHICS_CHECKLIST, policy, script)
//   2. makes the practice easy to find on Google with no ask attached
//      (the "Find us on Google" link, business.google_maps_url)
//   3. earns reviews from non-clients at public events (event QR kit,
//      business.google_review_url)
//   4. replies to every review the same HIPAA-safe way (REVIEW_REPLY)
//   5. reports on profile views, calls, and inquiries, not just stars.
// Never promise a review count.

export const ETHICS_CHECKLIST = [
  'Any waiting-room sign, poster, or table card that mentions reviews is taken down.',
  'No review link or request in discharge papers, closing surveys, or exit letters.',
  'No review link in the client portal, appointment reminders, intake emails, or newsletters sent to clients.',
  'No review link or "review us" line in staff email signatures.',
  'No one asks a client in person, by text, or by email, including clients who seem happy.',
  'Staff, referral partners, friends, and family are not asked to post reviews.',
];

export const EVENT_CARD_COPY = {
  heading: "How was today's event?",
  body: "If you found today's session helpful, we'd be grateful if you shared a review of the event on Google. It's completely optional.",
  qrCaption: 'Scan to review this event on Google',
  footer: 'Please keep personal or health details out of your review. Reviews are public.',
};

export const EVENT_RULES = {
  do: [
    'Use it on the closing slide or handout of a workshop, talk, or training that is open to the public.',
    'Invite the whole room at once, in general terms, as part of wrapping up.',
    'Ask for a review of the event, not of counseling or therapy.',
  ],
  dont: [
    'Put it in the waiting room, session rooms, the client portal, reminders, or discharge papers.',
    'Hand it to one person, or ask anyone individually, especially a client who attends.',
    'Market events to your client list as a way around the rule.',
    'Make a review a condition of anything, or offer anything in exchange (a certificate, a discount, a drawing).',
  ],
};

// One reply for every review, positive or negative. Anything more
// specific risks confirming someone is a client, which can be a HIPAA
// disclosure.
export const REVIEW_REPLY =
  "Thank you for taking time to share. Our privacy obligations mean we never confirm whether someone has received services. If you'd like to talk with us, please call our office.";

export const NEGATIVE_REVIEW_PROTOCOL = [
  'Wait a day before replying. Never argue or explain in public.',
  'Post the same generic reply above. Add nothing about the person, their care, or what happened.',
  "If the review breaks Google policy (spam, off-topic, hate speech, a conflict of interest, or someone who was never at the practice), report it through your Business Profile. Don't ask anyone to post reviews to balance it out.",
  'Pass any concern about care to the clinical director, privately.',
  'Never contact a reviewer about their review. If a client raises it in session, the counselor can talk about it there.',
  'If a review includes a threat or a safety concern, follow your clinical and legal procedures first. The review is secondary.',
];

export function reviewPolicyTemplate(practiceName: string): string {
  return `Online Reviews and Social Media

${practiceName} does not ask current or former clients for reviews, ratings, or testimonials, on Google or anywhere else.

If you choose to post a review on your own, please know that reviews are public and permanent, and may show others that you have been a client here. To protect your confidentiality, we will never confirm or deny that anyone is a client, including in replies to reviews. Any reply we post will be the same general message for every review.

We do not accept friend or connection requests from current or former clients on personal social media accounts. You're welcome to follow the practice's public pages, but please don't use comments or messages there to discuss your care.

If you have a concern about your care, please talk with your counselor or call our office so we can address it with you directly.

---
Note for the practice (remove before using): have your attorney approve this language before adding it to your informed consent paperwork. Check your state licensing board's advertising rules too, since some are stricter than the ethics codes.`;
}

export function frontDeskScript(practiceName: string): string {
  return `When a client asks, on their own, how to leave a review

Say:
"You can find us by searching ${practiceName} on Google. Just so you know, reviews are public and can show that you've been here, so it's completely up to you."

Then:
- Leave it there. Don't encourage, thank, or follow up.
- Don't hand them a card, link, or QR code, and don't send one by text or email.
- Don't bring it up again later.

If a client asks whether you'd like a review:
"That's kind of you. We don't ask clients for reviews, to protect your privacy. Your care here is what matters to us."

If someone asks about a specific review online:
"We don't comment on reviews or confirm who our clients are. If you have a concern, I can have the clinical director call you."`;
}

export const STAFF_GUIDELINES = {
  do: [
    'Use the front-desk script if a client brings up reviews on their own, then leave it there.',
    'Reply to every review with the same generic reply.',
    'Pass along any concern raised in a review to the clinical director, privately.',
    "Check your state licensing board's advertising rules. Some are stricter than the ACA code.",
  ],
  dont: [
    'Ask any current or former client for a review, in person, by email, by text, in a survey, or with a sign.',
    'Offer anything in exchange for a review, such as a discount or a gift.',
    'Invite only people you expect to be happy, or discourage anyone from posting. Google prohibits selective asking.',
    'Confirm or deny that someone is a client, in a reply or anywhere else.',
    'Write reviews for the practice, or ask staff, referral partners, friends, or family to post one.',
  ],
};

export function dischargeSurveyTemplate(practiceName: string): string {
  return `${practiceName}: Closing Survey (optional)

Thank you for trusting us with your care. This survey is optional, and you're welcome to leave your name off. Your answers help us improve.

1. Overall, how helpful was counseling for you?
   1 (not helpful)   2   3   4   5 (very helpful)

2. How comfortable did you feel with your counselor?
   1 (not comfortable)   2   3   4   5 (very comfortable)

3. What was most helpful?

4. What could we have done better?

5. How did you first hear about us?
   [ ] Google search   [ ] Google Maps   [ ] A doctor or healthcare provider
   [ ] A church or pastor   [ ] An attorney or other professional
   [ ] A friend or family member   [ ] My insurance company
   [ ] Psychology Today or another directory   [ ] Other: ________

6. Is there anything you'd like us to follow up with you about?
   If so, please include your name and the best way to reach you.

Name (optional): ______________________

---
Note for the practice (remove before using): this survey deliberately has no review request and no link to Google, and it must stay that way. ACA Code of Ethics C.3.b says counselors do not solicit testimonials from current or former clients, and a discharge survey goes to exactly those people. Never send high scorers on to Google: that's review gating, which Google bans. Question 5 is the valuable one for marketing: log each answer on the client's record in the Lead CRM ("Heard about us") so the dashboard shows which channels bring clients.`;
}
