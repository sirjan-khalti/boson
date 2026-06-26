import { motion, AnimatePresence } from "framer-motion";
import {
  X, Mail, Phone, Building2, MapPin, GraduationCap, Calendar,
  FileText, FileSpreadsheet, Sparkles, Star, Check, CalendarPlus, X as XIcon,
  Linkedin, Github, Globe, Award, Trophy, Languages, Briefcase,
  DollarSign, Clock, ShieldCheck, Share2, AlertTriangle, Send,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAts } from "@/lib/store";
import { Avatar } from "@/components/ats/Avatar";
import { MatchBadge } from "@/components/ats/MatchBadge";
import { StageChip } from "@/components/ats/StageChip";
import type { Candidate, CandidateStage } from "@/lib/data";
import { useEffect, useState } from "react";

const STAGES: CandidateStage[] = [
  "Applied", "Screening", "Shortlisted", "Interview", "Final Review", "Offer", "Hired", "Rejected",
];

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

function buildCv(c: Candidate, jobTitle?: string) {
  return [
    c.name,
    `${c.title} · ${c.location} · ${c.email} · ${c.phone}`,
    "",
    "SUMMARY",
    c.summary,
    "",
    "APPLIED FOR",
    jobTitle ?? "—",
    "",
    "EXPERIENCE",
    ...c.workHistory.map((w) => `${w.role} — ${w.company} (${w.start} — ${w.end})\n  ${w.description ?? ""}`),
    "",
    "EDUCATION",
    ...c.educationHistory.map((e) => `${e.degree}, ${e.school} (${e.start} — ${e.end})`),
    "",
    "SKILLS",
    c.skills.join(", "),
    "",
    "CERTIFICATIONS",
    c.certifications.join(", "),
    "",
    "SCORE BREAKDOWN",
    `Match Score: ${c.match} / 100`,
    `Tier: ${c.tier}`,
    ...(Array.isArray(c.scores) ? c.scores : []).map((s) => `- ${s.criteria}: ${s.score} / ${s.weight} — ${s.reason || ""}`),
  ].join("\n");
}

function buildCsv(c: Candidate, jobTitle?: string) {
  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const scores = Array.isArray(c.scores) ? c.scores : [];
  const rows: [string, string][] = [
    ["Name", c.name], ["Email", c.email], ["Phone", c.phone],
    ["Title", c.title], ["Company", c.company],
    ["Experience (years)", String(c.experience)], ["Location", c.location],
    ["Education", c.education], ["Match (%)", String(c.match)],
    ["Tier", c.tier], ["Stage", c.stage],
    ["Applied Date", c.appliedDate], ["Applied Job", jobTitle ?? ""],
    ["Skills", (c.skills || []).join("; ")], ["Missing Skills", (c.missingSkills || []).join("; ")],
    ["Languages", (c.languages || []).map((l) => `${l.name} (${l.level})`).join("; ")],
    ["Certifications", (c.certifications || []).join("; ")],
    ["Salary expectation", c.salaryExpectation], ["Availability", c.availability],
    ["Notice period", c.noticePeriod], ["Work authorization", c.workAuthorization],
    ["Source", c.source], ["LinkedIn", c.links?.linkedin ?? ""],
    ["GitHub", c.links?.github ?? ""],
    ["Portfolio", c.links?.portfolio ?? ""],
    ["Summary", c.summary],
    ...scores.map((s) => [`${s.criteria} (/${s.weight})`, String(s.score)] as [string, string]),
  ];
  return [["Field", "Value"], ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

function buildCandidateJson(c: Candidate) {
  const parts = (c.name || "").trim().split(/\s+/);
  const firstName = parts[0] || "";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";

  return {
    personal_info: {
      full_name: c.personal_info?.full_name || c.name,
      first_name: c.personal_info?.first_name || firstName,
      last_name: c.personal_info?.last_name || lastName,
      email: c.personal_info?.email || c.email,
      phone: c.personal_info?.phone || c.phone,
      date_of_birth: (c.personal_info as any)?.date_of_birth || "",
      gender: (c.personal_info as any)?.gender || "",
      nationality: (c.personal_info as any)?.nationality || "",
      address: {
        city: c.personal_info?.address?.city || "",
        state: c.personal_info?.address?.state || "",
        country: c.personal_info?.address?.country || ""
      },
      profiles: {
        linkedin: c.personal_info?.profiles?.linkedin || c.links?.linkedin || "",
        github: c.personal_info?.profiles?.github || c.links?.github || "",
        portfolio: c.personal_info?.profiles?.portfolio || c.links?.portfolio || ""
      }
    },
    professional_summary: {
      summary: c.professional_summary?.summary || c.summary || "",
      total_experience_years: c.professional_summary?.total_experience_years || c.experience || 0,
      notice_period_days: c.professional_summary?.notice_period_days || 0,
      preferred_locations: c.professional_summary?.preferred_locations || [],
      authorized_to_work_in_nepal: c.professional_summary?.authorized_to_work_in_nepal || false
    },
    skills: c.skills,
    experience: c.experience_history && c.experience_history.length > 0
      ? c.experience_history.map((w) => ({
          company_name: w.company_name || "",
          job_title: w.job_title || "",
          employment_type: w.employment_type || "",
          location: w.location || "",
          start_date: w.start_date || "",
          end_date: w.end_date || "",
          currently_working: w.currently_working || false,
          work_summary: w.work_summary || "",
          technologies_used: w.technologies_used || []
        }))
      : c.workHistory.map((w) => ({
          company_name: w.company || "",
          job_title: w.role || "",
          employment_type: "",
          location: "",
          start_date: w.start || "",
          end_date: w.end || "",
          currently_working: w.end === "Present" || !w.end,
          work_summary: w.description || "",
          technologies_used: []
        })),
    education: c.education_history && c.education_history.length > 0
      ? c.education_history.map((e) => ({
          degree: e.degree || "",
          field_of_study: e.field_of_study || "",
          institution_name: e.institution_name || "",
          location: e.location || "",
          start_date: e.start_date || "",
          end_date: e.end_date || "",
          grade: e.grade || ""
        }))
      : c.educationHistory.map((e) => ({
          degree: e.degree || "",
          field_of_study: "",
          institution_name: e.school || "",
          location: "",
          start_date: e.start || "",
          end_date: e.end || "",
          grade: ""
        })),
    projects: c.projects && c.projects.length > 0
      ? c.projects.map((p) => ({
          project_name: p.project_name || "",
          description: p.description || "",
          technologies_used: p.technologies_used || [],
          github_url: p.github_url || "",
          live_url: p.live_url || ""
        }))
      : [],
    certifications: c.certifications_history && c.certifications_history.length > 0
      ? c.certifications_history.map((cert) => ({
          name: cert.name || "",
          issuer: cert.issuer || "",
          issue_date: cert.issue_date || ""
        }))
      : c.certifications.map((cert) => ({
          name: cert || "",
          issuer: "",
          issue_date: ""
        })),
    languages: c.languages_history && c.languages_history.length > 0
      ? c.languages_history.map((l) => ({
          language: l.language || "",
          proficiency: l.proficiency || ""
        }))
      : c.languages.map((l) => ({
          language: l.name || "",
          proficiency: l.level || ""
        })),
    achievements: c.achievements,
    awards: c.awards || []
  };
}

type ConfirmKind = "Shortlisted" | "Rejected" | "Move";

export function CandidateModal() {
  const id = useAts((s) => s.selectedCandidateId);
  const close = useAts((s) => s.closeCandidate);
  const jobs = useAts((s) => s.jobs);
  const fetchJobs = useAts((s) => s.fetchJobs);

  const [c, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "json" | "cv">("profile");
  const [pendingStage, setPendingStage] = useState<CandidateStage | "">("");
  const [confirm, setConfirm] = useState<{ kind: ConfirmKind; stage: CandidateStage } | null>(null);

  useEffect(() => {
    if (!id) {
      setCandidate(null);
      return;
    }
    if (jobs.length === 0) {
      fetchJobs();
    }

    setPendingStage("");
    setConfirm(null);
    setActiveTab("profile");

    let active = true;
    async function loadCandidate() {
      setLoading(true);
      try {
        const data = await api.getCandidateById(id);
        if (active) {
          setCandidate(data);
        }
      } catch (err) {
        console.error("Failed to load candidate in modal", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadCandidate();

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      active = false;
      window.removeEventListener("keydown", onKey);
    };
  }, [id, close, fetchJobs, jobs.length]);

  const requestStageChange = (kind: ConfirmKind, stage: CandidateStage) => {
    if (!c || c.stage === stage) return;
    setConfirm({ kind, stage });
  };

  const applyConfirm = async () => {
    if (c && confirm) {
      try {
        const updated = await api.updateCandidateStage(c.id, confirm.stage);
        setCandidate(updated);
        useAts.setState((state) => ({
          candidates: state.candidates.map((x) => (x.id === c.id ? updated : x)),
        }));
      } catch (e: any) {
        alert("Failed to update stage: " + e.message);
      }
    }
    setConfirm(null);
    setPendingStage("");
  };

  const job = c ? jobs.find((j) => j.id === c.jobId) : undefined;
  const candidateJson = c ? buildCandidateJson(c) : undefined;

  const isOpen = id !== null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
            onClick={close}
          >
            {loading && !c ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="my-8 w-full max-w-xl rounded-2xl border border-border bg-card p-12 shadow-2xl flex flex-col items-center justify-center space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Loading candidate profile...</p>
              </motion.div>
            ) : c ? (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="my-8 w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
            {/* Header */}
            <div className="flex items-start gap-4 border-b border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
              <Avatar name={c.name} size={56} />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold tracking-tight">{c.name}</h2>
                <div className="text-sm text-muted-foreground">{c.title} · {c.company}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StageChip stage={c.stage} />
                  <MatchBadge tier={c.tier} />
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Match {c.match}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => triggerDownload(`${c.name.replace(/\s+/g, "_")}_CV.txt`, buildCv(c, job?.title), "text/plain")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  <FileText className="h-3.5 w-3.5" /> CV
                </button>
                <button
                  onClick={() => triggerDownload(`${c.name.replace(/\s+/g, "_")}.csv`, buildCsv(c, job?.title), "text/csv;charset=utf-8")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                </button>
                <button
                  onClick={close}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

             {/* Tabs */}
            <div className="flex border-b border-border bg-muted/20 px-5">
              {[
                { id: "profile", label: "Candidate Profile" },
                { id: "cv", label: "CV Viewer" },
                { id: "json", label: "Application JSON Data" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as "profile" | "json" | "cv")}
                  className={cn(
                    "relative py-3 text-sm font-semibold transition-colors border-b-2 px-4 -mb-px focus:outline-none",
                    activeTab === tab.id
                      ? "border-primary text-primary animate-fade-in"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Body */}
            {activeTab === "profile" ? (
              <div className="grid gap-5 p-5 md:grid-cols-[1fr_1fr]">
                {/* Left */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Sparkles className="h-4 w-4 text-primary" /> AI Summary
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/90">{c.summary}</p>
                  </div>

                  <Section title="Contact">
                    <dl className="space-y-2 text-sm">
                      <Row icon={Mail} label={candidateJson?.personal_info.email || c.email} />
                      <Row icon={Phone} label={candidateJson?.personal_info.phone || c.phone} />
                      <Row icon={Building2} label={c.company} />
                      <Row icon={MapPin} label={candidateJson ? `${candidateJson.personal_info.address.city}, ${candidateJson.personal_info.address.state}, ${candidateJson.personal_info.address.country}` : c.location} />
                      <Row icon={Calendar} label={`Applied ${c.appliedDate} · ${job?.title ?? "—"}`} />
                      <Row icon={Share2} label={`Source: ${c.source}`} />
                      {candidateJson?.personal_info.profiles.linkedin && <Row icon={Linkedin} label={candidateJson.personal_info.profiles.linkedin} />}
                      {candidateJson?.personal_info.profiles.github && <Row icon={Github} label={candidateJson.personal_info.profiles.github} />}
                      {candidateJson?.personal_info.profiles.portfolio && <Row icon={Globe} label={candidateJson.personal_info.profiles.portfolio} />}
                    </dl>
                  </Section>

                  <Section title="Compensation & availability">
                    <dl className="space-y-2 text-sm">
                      <Row icon={DollarSign} label={`Expected: ${c.salaryExpectation}`} />
                      <Row icon={Clock} label={`Availability: ${c.availability} · Notice: ${candidateJson ? `${candidateJson.professional_summary.notice_period_days} days` : c.noticePeriod}`} />
                      <Row icon={ShieldCheck} label={candidateJson ? (candidateJson.professional_summary.authorized_to_work_in_nepal ? "Legally allowed to work in Nepal" : "Requires work permit / sponsorship") : c.workAuthorization} />
                    </dl>
                  </Section>

                  <Section title="AI Strengths & Weaknesses" icon={Sparkles}>
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
                  </Section>

                  {/* Quick actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => requestStageChange("Shortlisted", "Shortlisted")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 animate-pulse-subtle"
                    >
                      <Check className="h-4 w-4" /> Shortlist
                    </button>
                    <button
                      onClick={() => requestStageChange("Rejected", "Rejected")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-destructive/40 py-2 text-sm text-destructive hover:bg-destructive/5"
                    >
                      <XIcon className="h-4 w-4" /> Reject
                    </button>
                  </div>

                  {/* Move stage dropdown */}
                  <div className="rounded-xl border border-border bg-background p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Move stage</div>
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        value={pendingStage}
                        onChange={(e) => setPendingStage(e.target.value as CandidateStage)}
                        className="h-9 flex-1 rounded-lg border border-border bg-card px-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      >
                        <option value="">Select stage…</option>
                        {STAGES.filter((s) => s !== c.stage).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button
                        disabled={!pendingStage}
                        onClick={() => pendingStage && requestStageChange("Move", pendingStage as CandidateStage)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:opacity-95"
                      >
                        Confirm
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">Currently in <span className="font-medium">{c.stage}</span>.</p>
                  </div>

                  <Section title="Recruiter notes">
                    <NotesBlock candidateId={c.id} notes={c.notes} onCandidateUpdate={setCandidate} />
                  </Section>
                </div>

                {/* Right */}
                <div className="space-y-4">
                  <Section title="Scoring Breakdown & Fit Analysis" icon={Sparkles}>
                    {/* Fit Level Badge */}
                    <div className="mb-4 flex items-center justify-between rounded-xl bg-muted/50 p-3">
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
                      {(Array.isArray(c.scores) ? c.scores : []).map((item) => {
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
                              <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${pct}%` }} style-width={`${pct}%`} />
                            </div>
                          </div>
                        );
                      })}
                      {(!Array.isArray(c.scores) || c.scores.length === 0) && (
                        <div className="text-sm text-muted-foreground text-center py-4">No score breakdown available</div>
                      )}
                    </div>
                  </Section>

                  <Section title="Skills">
                    <div className="flex flex-wrap gap-1.5">
                      {c.skills.map((s) => (
                        <span key={s} className="rounded-md bg-accent px-2 py-0.5 text-xs text-accent-foreground">{s}</span>
                      ))}
                    </div>
                  </Section>

                  <Section title="Experience" icon={Briefcase}>
                    <ol className="space-y-3 border-l border-border pl-4">
                      {c.workHistory.map((w, i) => (
                        <li key={i} className="relative">
                          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                          <div className="text-sm font-medium">{w.role}</div>
                          <div className="text-xs text-muted-foreground">{w.company} · {w.start} — {w.end}</div>
                          {w.description && <p className="mt-1 text-xs text-muted-foreground">{w.description}</p>}
                        </li>
                      ))}
                    </ol>
                  </Section>

                  <Section title="Education" icon={GraduationCap}>
                    <ul className="space-y-2 text-sm">
                      {c.educationHistory.map((e, i) => (
                        <li key={i}>
                          <div className="font-medium">{e.degree}</div>
                          <div className="text-xs text-muted-foreground">{e.school} · {e.start} — {e.end}</div>
                        </li>
                      ))}
                    </ul>
                  </Section>

                  <Section title="Languages" icon={Languages}>
                    <div className="flex flex-wrap gap-1.5">
                      {c.languages.map((l) => (
                        <span key={l.name} className="rounded-md bg-muted px-2 py-0.5 text-xs">
                          {l.name} <span className="text-muted-foreground">· {l.level}</span>
                        </span>
                      ))}
                    </div>
                  </Section>

                  <Section title="Certifications" icon={Award}>
                    <ul className="space-y-1 text-sm">
                      {c.certifications.map((cert) => (
                        <li key={cert} className="flex items-center gap-2">
                          <Award className="h-3.5 w-3.5 text-primary" /> {cert}
                        </li>
                      ))}
                    </ul>
                  </Section>

                  <Section title="Achievements" icon={Trophy}>
                    <ul className="space-y-1.5 text-sm text-foreground/90">
                      {c.achievements.map((a) => (
                        <li key={a} className="flex gap-2">
                          <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </Section>

                  {candidateJson && candidateJson.projects && (
                    <Section title="Projects" icon={Briefcase}>
                      <div className="space-y-3">
                        {candidateJson.projects.map((p, idx) => (
                          <div key={idx} className="rounded-xl border border-border bg-background/50 p-3 space-y-1.5 hover:border-border/80 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-foreground">{p.project_name}</span>
                              <div className="flex items-center gap-1.5">
                                {p.github_url && (
                                  <a href={`https://${p.github_url}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                                    <Github className="h-3.5 w-3.5" />
                                  </a>
                                )}
                                {p.live_url && (
                                  <a href={`https://${p.live_url}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                                    <Globe className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {p.technologies_used.map((t) => (
                                <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{t}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}
                </div>
              </div>
            ) : activeTab === "cv" ? (
              <div className="p-6 space-y-4 animate-fade-in">
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
                <div className="relative overflow-hidden rounded-xl border border-border bg-muted/20 shadow-inner flex items-center justify-center h-[650px]">
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
              <div className="p-6 space-y-4 animate-fade-in">
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
          </motion.div>
        ) : null}
      </motion.div>

          {/* Confirmation dialog */}
          <AnimatePresence>
            {confirm && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4"
                onClick={(e) => { e.stopPropagation(); setConfirm(null); }}
              >
                <motion.div
                  initial={{ scale: 0.96, y: 8, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.96, y: 8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
                >
                  <div className="flex items-start gap-3">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                      confirm.kind === "Rejected" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                    }`}>
                      {confirm.kind === "Rejected" ? <AlertTriangle className="h-5 w-5" /> : <Check className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold">
                        {confirm.kind === "Move" ? `Move to ${confirm.stage}?` :
                         confirm.kind === "Shortlisted" ? "Shortlist this candidate?" :
                         confirm.stage === "Interview" ? "Move to Interview?" :
                         "Reject this candidate?"}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {c.name} will be moved from <span className="font-medium text-foreground">{c.stage}</span> to <span className="font-medium text-foreground">{confirm.stage}</span>.
                        {confirm.kind === "Rejected" && " This will notify the team and exit them from the pipeline."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      onClick={() => setConfirm(null)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={applyConfirm}
                      className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${
                        confirm.kind === "Rejected" ? "bg-destructive hover:opacity-90" : "bg-primary hover:opacity-90"
                      }`}
                    >
                      {confirm.kind === "Rejected" ? "Reject" : "Confirm"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function Section({
  title, icon: Icon, children,
}: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />} {title}
      </h4>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function NotesBlock({
  candidateId,
  notes,
  onCandidateUpdate,
}: {
  candidateId: string;
  notes: Candidate["notes"];
  onCandidateUpdate: (updated: Candidate) => void;
}) {
  const { user } = useAuth();
  const [text, setText] = useState("");

  const submit = async () => {
    const v = text.trim();
    if (!v) return;
    try {
      const updated = await api.addCandidateNote(candidateId, v);
      onCandidateUpdate(updated);
      useAts.setState((state) => ({
        candidates: state.candidates.map((x) => (x.id === candidateId ? updated : x)),
      }));
      setText("");
    } catch (e: any) {
      alert("Failed to add note: " + e.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Write a note about this candidate…"
          rows={2}
          maxLength={1000}
          className="flex-1 resize-none rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" /> Post
        </button>
      </div>
      <ul className="space-y-2">
        {notes.map((n, i) => (
          <li key={i} className="rounded-lg bg-muted/40 p-2 text-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{n.author}</span>
              <span>{n.date}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap">{n.content}</p>
          </li>
        ))}
        {notes.length === 0 && (
          <li className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            No notes yet. Be the first to add one.
          </li>
        )}
      </ul>
    </div>
  );
}
