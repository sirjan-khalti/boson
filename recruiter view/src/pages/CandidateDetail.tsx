import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  ArrowLeft, MapPin, GraduationCap, Building2, Mail, Calendar, Star,
  Check, X as XIcon, CalendarPlus, ChevronRight, FileText, Sparkles, FileSpreadsheet,
  Linkedin, Github, Globe, Clock, DollarSign, AlertTriangle,
} from "lucide-react";
import { type Candidate } from "@/lib/data";
import { useAts } from "@/lib/store";
import { Avatar } from "@/components/ats/Avatar";
import { MatchBadge } from "@/components/ats/MatchBadge";
import { StageChip } from "@/components/ats/StageChip";
import { cn } from "@/lib/utils";

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildCvText(c: Candidate, jobTitle?: string) {
  const scores = Array.isArray(c.scores) ? c.scores : [];
  return [
    c.name,
    `${c.title} · ${c.location} · ${c.email}`,
    "",
    "SUMMARY",
    c.summary,
    "",
    "APPLIED FOR",
    jobTitle ?? "—",
    "",
    "EXPERIENCE",
    ...(c.workHistory || []).map((w: any) => `${w.role} — ${w.company} (${w.start} — ${w.end})`),
    "",
    "EDUCATION",
    c.education,
    "",
    "SKILLS",
    (c.skills || []).join(", "),
    "",
    "SCORE BREAKDOWN",
    `Match Score: ${c.match} / 100`,
    `Tier: ${c.tier}`,
    ...scores.map((s: any) => `- ${s.criteria}: ${s.score} / ${s.weight} — ${s.reason || ""}`),
    "",
    "NOTES",
    ...(c.notes || []).map((n: any) => `- [${n.date}] ${n.author}: ${n.content}`),
  ].join("\n");
}

function buildCsv(c: Candidate, jobTitle?: string) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const headers = ["Field", "Value"];
  const scores = Array.isArray(c.scores) ? c.scores : [];
  const rows: [string, string][] = [
    ["Name", c.name],
    ["Email", c.email],
    ["Title", c.title],
    ["Company", c.company],
    ["Experience (years)", String(c.experience)],
    ["Location", c.location],
    ["Education", c.education],
    ["Match (%)", String(c.match)],
    ["Tier", c.tier],
    ["Stage", c.stage],
    ["Applied Date", c.appliedDate],
    ["Applied Job", jobTitle ?? ""],
    ["Skills", (c.skills || []).join("; ")],
    ["Summary", c.summary],
    ...scores.map((s: any) => [`${s.criteria} (/${s.weight})`, String(s.score)] as [string, string]),
  ];
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

function buildCandidateJson(c: Candidate) {
  if (c.personal_info && c.personal_info.full_name) {
    return {
      personal_info: {
        full_name: c.personal_info.full_name,
        first_name: c.personal_info.first_name,
        last_name: c.personal_info.last_name,
        email: c.personal_info.email,
        phone: c.personal_info.phone,
        address: c.personal_info.address || { city: "", state: "", country: "" },
        profiles: c.personal_info.profiles || { linkedin: "", github: "", portfolio: "" }
      },
      professional_summary: {
        summary: "",
        total_experience_years: 0,
        notice_period_days: 0,
        preferred_locations: [],
        authorized_to_work_in_nepal: false,
        expected_salary: "",
        ...(c.professional_summary || {})
      },
      skills: c.skills || [],
      experience: c.experience_history || [],
      education: c.education_history || [],
      projects: c.projects || [],
      certifications: c.certifications_history || [],
      languages: c.languages_history || [],
      achievements: c.achievements || [],
      awards: c.awards || [],
      candidate_preferences: c.candidate_preferences || {
        preferred_roles: [],
        preferred_locations: [],
        preferred_employment_type: []
      },
      custom_fields: c.custom_fields || {
        extraInformation: "",
        salaryExpectation: "",
        publications: ""
      }
    };
  }

  const parts = (c.name || "").trim().split(/\s+/);
  const firstName = parts[0] || "";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";

  return {
    personal_info: {
      full_name: c.name,
      first_name: firstName,
      last_name: lastName,
      email: c.email,
      phone: c.phone,
      address: {
        city: c.location.split(",")[0]?.trim() || c.location,
        state: "",
        country: c.location.toLowerCase().includes("remote") ? "Remote" : "Nepal"
      },
      profiles: {
        linkedin: c.links?.linkedin || "",
        github: c.links?.github || "",
        portfolio: c.links?.portfolio || ""
      }
    },
    professional_summary: {
      summary: c.summary,
      total_experience_years: c.experience,
      notice_period_days: parseInt(c.noticePeriod?.replace(/\D/g, "") || "", 10) || 30,
      preferred_locations: ["Kathmandu", "Remote"],
      authorized_to_work_in_nepal: true
    },
    skills: c.skills || [],
    experience: (c.workHistory || []).map((w) => ({
      company_name: w.company,
      job_title: w.role,
      employment_type: "Full-time",
      location: "",
      start_date: `${w.start}-01-01`,
      end_date: w.end === "Present" ? "" : `${w.end}-12-31`,
      currently_working: w.end === "Present",
      work_summary: w.description || "",
      technologies_used: (c.skills || []).slice(0, 3)
    })),
    education: (c.educationHistory || []).map((e) => ({
      degree: e.degree,
      field_of_study: "",
      institution_name: e.school,
      location: "",
      start_date: `${e.start}-01-01`,
      end_date: `${e.end}-12-31`,
      grade: ""
    })),
    projects: [],
    certifications: (c.certifications || []).map((cert) => ({
      name: cert,
      issuer: "",
      issue_date: ""
    })),
    languages: (c.languages || []).map((l) => ({
      language: l.name,
      proficiency: l.level
    })),
    achievements: c.achievements || [],
    awards: [],
    candidate_preferences: {
      preferred_roles: [],
      preferred_locations: [],
      preferred_employment_type: []
    },
    custom_fields: {
      extraInformation: "",
      salaryExpectation: c.salaryExpectation || "",
      publications: ""
    }
  };
}

export default function CandidateDetail() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const jobs = useAts((s) => s.jobs);
  const fetchJobs = useAts((s) => s.fetchJobs);

  const [c, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "json" | "cv">("profile");
  const [noteContent, setNoteContent] = useState("");

  useEffect(() => {
    if (jobs.length === 0) {
      fetchJobs();
    }
  }, [jobs.length, fetchJobs]);

  useEffect(() => {
    let active = true;
    async function loadCandidate() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getCandidateById(candidateId!);
        if (active) {
          setCandidate(data);
        }
      } catch (err: any) {
        console.error("Failed to load candidate", err);
        if (active) {
          setError(err.message || "Failed to load candidate profile.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadCandidate();
    return () => {
      active = false;
    };
  }, [candidateId]);

  const handleUpdateStage = async (newStage: string) => {
    if (!c) return;
    try {
      const updated = await api.updateCandidateStage(c.id, newStage);
      setCandidate(updated);
      useAts.setState((state) => ({
        candidates: state.candidates.map((x) => (x.id === c.id ? updated : x)),
      }));
    } catch (e: any) {
      alert("Failed to update candidate stage: " + e.message);
    }
  };

  const handleAddNote = async () => {
    if (!c || !noteContent.trim()) return;
    try {
      const updated = await api.addCandidateNote(c.id, noteContent);
      setCandidate(updated);
      setNoteContent("");
      useAts.setState((state) => ({
        candidates: state.candidates.map((x) => (x.id === c.id ? updated : x)),
      }));
    } catch (e: any) {
      alert("Failed to add candidate note: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-2 text-sm text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p>Loading candidate profile...</p>
      </div>
    );
  }

  if (error || !c) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center text-sm text-destructive max-w-md mx-auto mt-10">
        <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-2" />
        <h3 className="font-semibold text-base mb-1">Error Loading Profile</h3>
        <p className="text-xs opacity-90">{error || "Candidate not found"}</p>
        <Link to="/candidates" className="inline-block mt-4 text-xs font-semibold underline text-primary">
          Back to candidates list
        </Link>
      </div>
    );
  }

  const job = jobs.find((j) => j.id === c.jobId);
  const candidateJson = buildCandidateJson(c);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/candidates" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to candidates
        </Link>
        <div className="flex rounded-lg border border-border bg-card p-1 shadow-sm">
          {[
            { id: "profile", label: "Candidate Profile" },
            { id: "cv", label: "CV Viewer" },
            { id: "json", label: "Application JSON" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "profile" | "json" | "cv")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "profile" ? (
        <>

      {/* AI Summary */}
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card p-5 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">AI Summary</h2>
              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">Auto-generated</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{c.summary}</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Match score</div>
            <div className="mt-0.5 text-3xl font-semibold tabular-nums">{c.match}<span className="text-base text-muted-foreground">%</span></div>
            <div className="mt-1"><MatchBadge tier={c.tier} /></div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[400px_1fr]">
        {/* LEFT PANEL */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <Avatar name={c.name} size={56} />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-semibold tracking-tight">{c.name}</h1>
                <div className="text-sm text-muted-foreground">{c.title}</div>
                <div className="mt-1"><StageChip stage={c.stage} /></div>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <Row icon={Mail} label={candidateJson?.personal_info.email || c.email} />
              <Row icon={Building2} label={c.company} />
              <Row icon={MapPin} label={candidateJson ? `${candidateJson.personal_info.address.city}, ${candidateJson.personal_info.address.state}, ${candidateJson.personal_info.address.country}` : c.location} />
              <Row icon={GraduationCap} label={c.education} />
              <Row icon={Calendar} label={`Applied ${c.appliedDate} · ${job?.title}`} />
              {candidateJson?.personal_info.profiles.linkedin && <Row icon={Linkedin} label={candidateJson.personal_info.profiles.linkedin} />}
              {candidateJson?.personal_info.profiles.github && <Row icon={Github} label={candidateJson.personal_info.profiles.github} />}
              {candidateJson?.personal_info.profiles.portfolio && <Row icon={Globe} label={candidateJson.personal_info.profiles.portfolio} />}
            </dl>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => handleUpdateStage("Shortlisted")}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 active:scale-95 transition"
              >
                <Check className="h-4 w-4" /> Shortlist
              </button>
              <button
                onClick={() => handleUpdateStage("Rejected")}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-destructive/40 py-2 text-sm text-destructive hover:bg-destructive/5 active:scale-95 transition"
              >
                <XIcon className="h-4 w-4" /> Reject
              </button>
              <div className="col-span-2 flex flex-col gap-1 mt-1">
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Move Stage</label>
                <select
                  value={c.stage}
                  onChange={(e) => handleUpdateStage(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold hover:bg-muted/50 transition cursor-pointer"
                >
                  {["Applied", "Screening", "Shortlisted", "Interview", "Final Review", "Offer", "Hired", "Rejected"].map((stg) => (
                    <option key={stg} value={stg}>{stg}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compensation</h3>
            <dl className="space-y-2 text-sm">
              <Row icon={DollarSign} label={`Expected: ${candidateJson?.professional_summary.expected_salary || c.salaryExpectation}`} />
              <Row icon={Clock} label={`Notice: ${candidateJson ? `${candidateJson.professional_summary.notice_period_days} days` : c.noticePeriod}`} />
            </dl>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" /> AI Strengths & Weaknesses
            </h3>
            <div className="space-y-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5 text-emerald-500" /> Strengths
                </div>
                <ul className="mt-1.5 space-y-1 list-disc list-inside text-xs text-muted-foreground pl-1">
                  {c.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-border/50 pt-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <XIcon className="h-3.5 w-3.5 text-rose-500" /> Areas for Development
                </div>
                <ul className="mt-1.5 space-y-1 list-disc list-inside text-xs text-muted-foreground pl-1">
                  {c.weaknesses.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" /> Scoring Breakdown & Fit Analysis
            </h3>

            {/* Fit Level Badge */}
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Match Tier</div>
                <div className={cn(
                  "text-xs font-bold mt-0.5 px-2.5 py-0.5 rounded-full inline-block",
                  c.tier === "Strong Fit" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                  : c.tier === "Moderate Fit" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30"
                )}>
                  {c.tier || "—"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Points</div>
                <div className="text-xl font-black text-foreground">{c.match} <span className="text-xs text-muted-foreground font-normal">/100</span></div>
              </div>
            </div>

            {/* Categories list */}
            <div className="space-y-3">
              {(Array.isArray(c.scores) ? c.scores : []).map((item: any) => {
                const pct = item.weight > 0 ? (item.score / item.weight) * 100 : 0;
                const isFailed = item.score < (item.weight / 2);

                let barColor = "bg-emerald-500";
                let textColor = "text-emerald-600 dark:text-emerald-400";
                let bgColor = "bg-emerald-50 dark:bg-emerald-950/20";
                let ringColor = "ring-emerald-500/20";

                if (pct < 60) {
                  barColor = "bg-rose-500";
                  textColor = "text-rose-600 dark:text-rose-400";
                  bgColor = "bg-rose-50 dark:bg-rose-950/20";
                  ringColor = "ring-rose-500/20";
                } else if (pct < 80) {
                  barColor = "bg-amber-500";
                  textColor = "text-amber-600 dark:text-amber-400";
                  bgColor = "bg-amber-50 dark:bg-amber-950/20";
                  ringColor = "ring-amber-500/20";
                }

                return (
                  <div key={item.criteria} className="group relative rounded-lg border border-border/50 bg-card p-2.5 transition hover:border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-foreground/90">{item.criteria}</div>
                        {item.reason && <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{item.reason}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-bold ring-1 ring-inset", bgColor, textColor, ringColor)}>
                          {item.score} <span className="opacity-65 font-normal ml-0.5">/{item.weight}</span>
                        </span>
                        {isFailed && (
                          <div className="text-[9px] font-semibold text-rose-500 mt-1 uppercase tracking-wider animate-pulse">
                            Below Threshold
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {(!Array.isArray(c.scores) || c.scores.length === 0) && (
                <div className="text-sm text-muted-foreground text-center py-4">No score breakdown available</div>
              )}
            </div>


            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold">Recruiter notes</h3>
              <ul className="mt-3 space-y-3">
                {c.notes.map((n, i) => (
                  <li key={i} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{n.author}</span><span>{n.date}</span>
                    </div>
                    <p className="mt-1">{n.content}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-3 space-y-2">
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Add a note…"
                  className="w-full resize-none rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  rows={2}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAddNote}
                    disabled={!noteContent.trim()}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Post Note
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold">Skills</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.skills.map((s) => (
                <span key={s} className="rounded-md bg-accent px-2 py-0.5 text-xs text-accent-foreground">{s}</span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold">Experience</h3>
            {candidateJson.experience && candidateJson.experience.length > 0 ? (
              <ol className="mt-3 space-y-4 border-l border-border pl-4">
                {candidateJson.experience.map((exp: any, i: number) => {
                  const startYear = exp.start_date ? exp.start_date.substring(0, 4) : "";
                  const endYear = exp.currently_working ? "Present" : (exp.end_date ? exp.end_date.substring(0, 4) : "Present");
                  const timeStr = [startYear, endYear].filter(Boolean).join(" — ");
                  return (
                    <li key={i} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                      <div className="text-sm font-semibold text-foreground/90">{exp.job_title}</div>
                      <div className="text-xs text-muted-foreground font-medium">{exp.company_name} {timeStr ? `· ${timeStr}` : ""}</div>
                      {exp.work_summary && (
                        <p className="mt-1 text-xs text-muted-foreground/80 leading-relaxed whitespace-pre-line">{exp.work_summary}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="mt-3 text-xs text-muted-foreground italic">No work experience history provided.</div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold">Education</h3>
            {candidateJson.education && candidateJson.education.length > 0 ? (
              <ol className="mt-3 space-y-3 border-l border-border pl-4">
                {candidateJson.education.map((edu: any, i: number) => {
                  const startYear = edu.start_date ? edu.start_date.substring(0, 4) : "";
                  const endYear = edu.end_date ? edu.end_date.substring(0, 4) : "";
                  const timeStr = [startYear, endYear].filter(Boolean).join(" — ");
                  return (
                    <li key={i} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary/60" />
                      <div className="text-sm font-semibold text-foreground/90">{edu.degree}{edu.field_of_study ? `, ${edu.field_of_study}` : ""}</div>
                      <div className="text-xs text-muted-foreground font-medium">{edu.institution_name} {timeStr ? `· ${timeStr}` : ""}</div>
                      {edu.grade && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">Grade: {edu.grade}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="mt-3 text-xs text-muted-foreground italic">No education history provided.</div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold">Languages</h3>
            {candidateJson.languages && candidateJson.languages.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {candidateJson.languages.map((l: any) => (
                  <span key={l.language} className="rounded-md bg-muted px-2 py-0.5 text-xs">
                    {l.language} <span className="text-muted-foreground">· {l.proficiency}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-xs text-muted-foreground italic">No languages specified.</div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold">Certifications</h3>
            {candidateJson.certifications && candidateJson.certifications.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm">
                {candidateJson.certifications.map((cert: any) => (
                  <li key={cert.name} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary" /> {cert.name} {cert.issuer ? `(${cert.issuer})` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 text-xs text-muted-foreground italic">No certifications listed.</div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold">Achievements</h3>
            {candidateJson.achievements && candidateJson.achievements.length > 0 ? (
              <ul className="mt-3 space-y-1.5 text-sm text-foreground/90">
                {candidateJson.achievements.map((a: any) => (
                  <li key={a} className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 text-xs text-muted-foreground italic">No achievements listed.</div>
            )}
          </div>

          {candidateJson.projects && candidateJson.projects.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold mb-3">Projects</h3>
              <div className="space-y-3">
                {candidateJson.projects.map((p: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-border bg-background/50 p-3 space-y-1.5 hover:border-border/80 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-foreground">{p.project_name}</span>
                      <div className="flex items-center gap-1.5">
                        {p.github_url && (
                          <a href={p.github_url.startsWith("http") ? p.github_url : `https://${p.github_url}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                            <Github className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {p.live_url && (
                          <a href={p.live_url.startsWith("http") ? p.live_url : `https://${p.live_url}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                            <Globe className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    {p.description && <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>}
                    {p.technologies_used && p.technologies_used.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.technologies_used.map((t: string) => (
                          <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {candidateJson.awards && candidateJson.awards.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold">Awards & Honors</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-foreground/90">
                {candidateJson.awards.map((a: any, idx: number) => (
                  <li key={idx} className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {candidateJson.custom_fields?.publications && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold">Publications</h3>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                {candidateJson.custom_fields.publications}
              </p>
            </div>
          )}

          {candidateJson.custom_fields?.extraInformation && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold">Extra Information</h3>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                {candidateJson.custom_fields.extraInformation}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT - PDF placeholder */}
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {c.name.replace(/\s+/g, "_")}_Resume
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => triggerDownload(`${c.name.replace(/\s+/g, "_")}_CV.txt`, buildCvText(c, job?.title), "text/plain")}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
              >
                <FileText className="h-3.5 w-3.5" /> CV
              </button>
              <button
                onClick={() => triggerDownload(`${c.name.replace(/\s+/g, "_")}.csv`, buildCsv(c, job?.title), "text/csv;charset=utf-8")}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </button>
            </div>
          </div>
          <div className="relative mt-3 h-[1100px] overflow-hidden rounded-xl bg-[oklch(0.96_0.005_280)] dark:bg-[oklch(0.22_0.02_285)]">
            <div className="absolute inset-0 grid place-items-center">
              <div className="mx-auto h-[95%] w-[78%] rounded-md bg-white p-10 text-[oklch(0.18_0.02_280)] shadow-lg">
                <div className="border-b border-zinc-200 pb-4">
                  <div className="text-2xl font-semibold">{c.name}</div>
                  <div className="mt-0.5 text-sm text-zinc-500">{c.title} · {c.location} · {c.email}</div>
                </div>
                <section className="mt-5">
                  <h4 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Summary</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-700">{c.summary}</p>
                </section>
                <section className="mt-5">
                  <h4 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Experience</h4>
                  <div className="mt-2 space-y-3 text-sm">
                    <div>
                      <div className="font-medium">{c.title} — {c.company}</div>
                      <div className="text-xs text-zinc-500">2023 — Present</div>
                      <ul className="mt-1 list-disc pl-5 text-zinc-700">
                        <li>Designed and shipped systems using {c.skills.slice(0, 3).join(", ")}.</li>
                        <li>Owned reliability & performance for high-traffic services.</li>
                        <li>Mentored junior engineers and led code reviews.</li>
                      </ul>
                    </div>
                  </div>
                </section>
                <section className="mt-5">
                  <h4 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Skills</h4>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.skills.map((s) => (
                      <span key={s} className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700">{s}</span>
                    ))}
                  </div>
                </section>
                <section className="mt-5">
                  <h4 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Education</h4>
                  <div className="mt-1 text-sm text-zinc-700">{c.education}</div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  ) : activeTab === "cv" ? (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Interactive CV Document Viewer</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Rendered live from the secure upload location / minIO storage server.</p>
        </div>
        <a
          href={c.cvUrl || "#"}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted active:scale-95 transition-all text-foreground"
        >
          Open in New Tab
        </a>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-border bg-muted/20 shadow-inner flex items-center justify-center h-[750px]">
        {c.cvUrl ? (
          <iframe
            src={`${c.cvUrl}#toolbar=0`}
            className="w-full h-full border-none"
            title={`${c.name} Resume`}
          />
        ) : (
          <div className="text-center p-8 text-muted-foreground space-y-2">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/60" />
            <p className="text-sm font-semibold">No CV Document Uploaded</p>
            <p className="text-xs text-muted-foreground/80">Please check this candidate's application submission.</p>
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Structured Application JSON</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Exact structured payload format matching candidate profiles and CV parsed fields.</p>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(buildCandidateJson(c), null, 2));
            alert("JSON schema copied to clipboard!");
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted active:scale-95 transition-all"
        >
          Copy JSON to Clipboard
        </button>
      </div>
      <pre className="overflow-x-auto rounded-xl bg-muted/50 p-5 font-mono text-xs leading-relaxed text-foreground select-all border shadow-inner max-h-[600px] overflow-y-auto">
        {JSON.stringify(buildCandidateJson(c), null, 2)}
      </pre>
    </div>
  )}
</div>
  );
}

function Row({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
    </div>
  );
}
