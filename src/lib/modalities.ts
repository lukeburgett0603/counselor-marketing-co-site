// A real, standard list of recognized psychotherapy modalities/
// theoretical orientations — not invented, sourced from established
// clinical terminology (the same kind of taxonomy a directory like
// Psychology Today uses for its own "Types of Therapy" filter). Backs
// the modality-selection picker on admin/counselor-settings.astro.
// Values are stored and displayed exactly as written here (as public
// tags on a counselor's page), so common abbreviations are used where
// one is genuinely standard (EMDR, CBT, DBT, ACT, IFS — matches how
// real counselors already had these entered as free text before this
// picker existed) and full names otherwise, for a visitor who isn't a
// clinician to actually understand the tag.
//
// pages.modalities stays a plain string[] (0029_counselor_card_v2.sql) —
// a custom "Other" entry a counselor types in is stored exactly the same
// way as a picked option, so no schema change was needed for this.
export const MODALITY_OPTIONS: string[] = [
  'ACT',
  'Applied Behavior Analysis',
  'Art Therapy',
  'Attachment-Based Therapy',
  'Behavioral Activation',
  'Brainspotting',
  'CBT',
  'Christian/Faith-Based Counseling',
  'Cognitive Processing Therapy',
  'DBT',
  'EMDR',
  'Emotionally Focused Therapy',
  'Existential Therapy',
  'Exposure and Response Prevention',
  'Expressive Arts Therapy',
  'Family Systems Therapy',
  'Gestalt Therapy',
  'Gottman Method',
  'Grief Counseling',
  'Group Therapy',
  'Harm Reduction',
  'IFS',
  'Imago Relationship Therapy',
  'Interpersonal Therapy',
  'Mindfulness-Based Cognitive Therapy',
  'Mindfulness-Based Stress Reduction',
  'Motivational Interviewing',
  'Narrative Therapy',
  'Person-Centered Therapy',
  'Play Therapy',
  'Prolonged Exposure Therapy',
  'Psychoanalytic Therapy',
  'Psychodynamic Therapy',
  'Rational Emotive Behavior Therapy',
  'Sand Tray Therapy',
  'Schema Therapy',
  'Sensorimotor Psychotherapy',
  'Solution-Focused Brief Therapy',
  'Somatic Experiencing',
  'Strength-Based Therapy',
  'Structural Family Therapy',
  'Trauma-Focused CBT',
];
