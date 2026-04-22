import { z } from "zod";

export const intakeSurveySchema = z.object({
  full_name: z.string().min(1, "Please share your name"),
  pronouns: z.string().optional().default(""),
  current_role_title: z.string().min(1, "What role are you in (or most recently were)?"),
  years_experience: z.coerce.number().min(0).max(60),
  strengths: z.string().min(1, "List at least one strength"),
  growth_areas: z.string().min(1, "List at least one growth area"),
  energizers: z.string().min(1, "What gives you energy at work?"),
  drainers: z.string().optional().default(""),
  short_term_goals: z.string().min(1),
  long_term_goals: z.string().min(1),
  work_environment: z.string().min(1),
  proudest_accomplishment: z.string().min(1),
  challenge_overcome: z.string().min(1),
  skills_to_probe: z.string().optional().default(""),
  background_gaps: z.string().optional().default(""),
  feedback_style: z.string().min(1),
});

export type IntakeSurvey = z.infer<typeof intakeSurveySchema>;
export type IntakeSurveyInput = z.input<typeof intakeSurveySchema>;

export const interviewTargetSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  company_location: z.string().optional().default(""),
  company_notes: z.string().optional().default(""),
  job_title: z.string().min(1, "Job title is required"),
  job_details: z.string().optional().default(""),
  interviewer_name: z.string().optional().default(""),
  interviewer_details: z.string().optional().default(""),
  interview_date: z.string().optional().default(""),
});

export type InterviewTargetInput = z.infer<typeof interviewTargetSchema>;
export type InterviewTargetFormInput = z.input<typeof interviewTargetSchema>;

export const mockConfigSchema = z.object({
  mode: z.enum(["single", "five", "full"]),
  personality: z.enum(["warm", "analytical", "challenging"]),
});

export type MockConfig = z.infer<typeof mockConfigSchema>;

export const mockAnswerInputSchema = z.object({
  mockId: z.string().uuid(),
  questionId: z.string(),
  transcript: z.string().min(1),
});

export type MockAnswerInput = z.infer<typeof mockAnswerInputSchema>;
