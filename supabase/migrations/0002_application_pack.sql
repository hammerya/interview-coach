-- Application pack columns: pitch headline, cover letter, resume review,
-- and the optional fully-tailored resume rewrite. All optional, all owned
-- by the target row so they live with the rest of the prep.

alter table public.interview_targets
  add column if not exists pitch_headline text,
  add column if not exists cover_letter text,
  add column if not exists resume_review jsonb,
  add column if not exists tailored_resume text;
