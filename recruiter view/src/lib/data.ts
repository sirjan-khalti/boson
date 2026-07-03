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
  status: "Active" | "Draft" | "Closed";
  applicants: number;
  postedDate: string;
  description: string;
  skills: string[];
  scoring_criteria: ScoringCriterion[];
};

export type WorkExperience = {
  role: string;
  company: string;
  start: string;
  end: string;
  description?: string;
};

export type EducationEntry = {
  degree: string;
  school: string;
  start: string;
  end: string;
};

export type Candidate = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  title: string;
  company: string;
  experience: number;
  location: string;
  education: string;
  educationHistory: EducationEntry[];
  match: number;
  tier: MatchTier | "Pending" | null;
  evaluation_status: EvaluationStatus;
  skills: string[];
  missingSkills: string[];
  languages: { name: string; level: string }[];
  certifications: string[];
  achievements: string[];
  links: { linkedin?: string; github?: string; portfolio?: string };
  workHistory: WorkExperience[];
  salaryExpectation: string;
  noticePeriod: string;
  source: string;
  stage: CandidateStage;
  pastStages?: CandidateStage[];
  appliedDate: string;
  jobId: string;
  summary: string;
  notes: { author: string; date: string; content: string }[];
  scores: ScoreBreakdown[];
  strengths: string[];
  weaknesses: string[];
  cvUrl?: string;
  
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
