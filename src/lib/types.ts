export type InterviewerPersonality = "warm" | "analytical" | "challenging";

export type MockMode = "single" | "five" | "full";

export type QuestionCategory =
  | "behavioral"
  | "technical"
  | "situational"
  | "culture-fit"
  | "role-specific"
  | "closing";

export interface GeneratedQuestion {
  id: string;
  category: QuestionCategory;
  question: string;
  reasoning: string;
  answerFormat: string;
  sampleAnswer?: string;
}

export interface MockAnswer {
  questionId: string;
  question: string;
  transcript: string;
  score: number;
  strengths: string[];
  improvements: string[];
}

export interface MockScore {
  overall: number;
  clarity: number;
  structure: number;
  relevance: number;
  confidence: number;
  summary: string;
  wentWell: string[];
  focusNext: string[];
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  pronouns: string | null;
  current_role_title: string | null;
  years_experience: number | null;
  strengths: string[] | null;
  growth_areas: string[] | null;
  energizers: string | null;
  drainers: string | null;
  short_term_goals: string | null;
  long_term_goals: string | null;
  work_environment: string | null;
  proudest_accomplishment: string | null;
  challenge_overcome: string | null;
  skills_to_probe: string | null;
  background_gaps: string | null;
  feedback_style: string | null;
  resume_text: string | null;
  resume_filename: string | null;
  intake_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResumeEdit {
  section: string;
  original: string;
  suggested: string;
  why: string;
  applied?: boolean;
}

export interface ResumeReview {
  summary: string;
  edits: ResumeEdit[];
}

export interface InterviewTarget {
  id: string;
  user_id: string;
  company_name: string;
  company_location: string | null;
  company_notes: string | null;
  job_title: string;
  job_details: string | null;
  interviewer_name: string | null;
  interviewer_details: string | null;
  interview_date: string | null;
  questions: GeneratedQuestion[] | null;
  research_notes: string | null;
  pitch_headline: string | null;
  cover_letter: string | null;
  resume_review: ResumeReview | null;
  tailored_resume: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockInterview {
  id: string;
  target_id: string;
  user_id: string;
  mode: MockMode;
  personality: InterviewerPersonality;
  answers: MockAnswer[];
  score: MockScore | null;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
}
