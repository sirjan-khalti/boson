export type MatchTier = "Strong Fit" | "Moderate Fit" | "Weak Fit";
export type EvaluationStatus = "PENDING" | "SUCCESS" | "FAILED";
export type CandidateStage =
  | "Applied"
  | "Screening"
  | "Shortlisted"
  | "Interview"
  | "Final Review"
  | "Offer"
  | "Hired"
  | "Rejected";

export type ScoreBreakdown = {
  criteria: string;
  weight: number;
  score: number;
  reason: string;
};

export type ScoringCriterion = {
  criteria: string;
  weight: number;
  description: string;
};

export type AddressInfo = {
  city: string;
  state: string;
  country: string;
};

export type ProfilesInfo = {
  linkedin: string;
  github: string;
  portfolio: string;
};

export type PersonalInfo = {
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: AddressInfo;
  profiles: ProfilesInfo;
};

export type ProfessionalSummary = {
  summary: string;
  total_experience_years: number;
  notice_period_days: number;
  preferred_locations: string[];
  authorized_to_work_in_nepal: boolean;
  expected_salary: string;
};

export type ExperienceItem = {
  company_name: string;
  job_title: string;
  employment_type: string;
  location: string;
  start_date: string;
  end_date: string;
  currently_working: boolean;
  work_summary: string;
  technologies_used: string[];
};

export type EducationItem = {
  degree: string;
  field_of_study: string;
  institution_name: string;
  location: string;
  start_date: string;
  end_date: string;
  grade: string;
};

export type ProjectItem = {
  project_name: string;
  description: string;
  technologies_used: string[];
  github_url: string;
  live_url: string;
};

export type CertificationItem = {
  name: string;
  issuer: string;
  issue_date: string;
};

export type LanguageItem = {
  language: string;
  proficiency: string;
};

export type CandidatePreferences = {
  preferred_roles: string[];
  preferred_locations: string[];
  preferred_employment_type: string[];
};

export type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: "Full-time" | "Contract" | "Part-time" | "Intern" | "Trainee";
  status: "Active" | "Closed";
  closed_date?: string | null;
  applicants: number;
  posted_date: string;
  description: string;
  skills: string[];
  scoring_criteria: ScoringCriterion[];
};

export type CandidateActor = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type CandidateNote = {
  id: string;
  author: CandidateActor | null;
  content: string;
  created_at: string;
};

export type CandidateStageHistoryEntry = {
  stage: CandidateStage;
  changed_at: string;
  changed_by: CandidateActor | null;
};

export type CandidateEvaluation = {
  summary: string | null;
  scores: ScoreBreakdown[];
  strengths: string[];
  weaknesses: string[];
  evaluated_at: string | null;
};

export type Candidate = {
  id: string;
  job_id: string;
  stage: CandidateStage;
  stage_history: CandidateStageHistoryEntry[];
  applied_date: string;
  match_score: number;
  tier: MatchTier | "Pending" | null;
  evaluation_status: EvaluationStatus;
  evaluation: CandidateEvaluation | null;
  notes: CandidateNote[];

  name: string;
  experience: number;

  cv_filelink?: string | null;
  cv_url?: string | null;

  // Computed on the API response, not stored — see app/models/candidate.py
  email: string;
  phone: string;
  title: string | null;
  company: string | null;
  location: string | null;
  education: string | null;

  skills: string[];
  achievements: string[];
  salary_expectation: string;
  notice_period: string;
  source: string;

  // Parsed schema properties mapping from backend CandidateResponse
  personal_info?: PersonalInfo;
  professional_summary?: ProfessionalSummary;
  experience_history?: ExperienceItem[];
  education_history?: EducationItem[];
  projects?: ProjectItem[];
  certifications_history?: CertificationItem[];
  languages_history?: LanguageItem[];
  awards?: string[];
  publications?: string[];
  candidate_preferences?: CandidatePreferences;
  custom_fields?: Record<string, unknown>;
};

export const makeAvatar = (name: string) =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
    name
  )}&backgroundType=gradientLinear&fontWeight=600`;
