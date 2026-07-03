import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useAts } from "@/lib/store";
import { API_BASE } from "@/lib/config";
import { useNavigate } from "react-router-dom";
import type { ScoringCriterion } from "@/lib/data";

const DEPARTMENTS = ["Engineering", "Product", "Design", "Data", "Legal", "Risk & Compliance", "Operations", "Marketing"];
const TYPES = ["Full-time", "Part-time", "Intern", "Trainee"] as const;

// Mirrors app.core.constants.DEFAULT_SCORING_CRITERIA on the backend.
const DEFAULT_SCORING_CRITERIA: ScoringCriterion[] = [
  { criteria: "Relevant Experience", weight: 25, description: "Evaluate how closely the candidate's experience aligns with the role requirements, responsibilities, domain, and expected impact level." },
  { criteria: "Years of Relevant Experience", weight: 20, description: "Evaluate the candidate's total relevant experience relative to the role level and expectations." },
  { criteria: "Education & Qualifications", weight: 15, description: "Relevant academic background, degrees, coursework, and qualifications aligned with the role requirements." },
  { criteria: "Trainings & Certifications", weight: 15, description: "Relevant certifications, workshops, trainings, bootcamps, and specialized learning credentials." },
  { criteria: "Technical Knowledge", weight: 10, description: "Evaluate technical stack alignment, tools, frameworks, platforms, methodologies, and domain-specific knowledge relevant to the role." },
  { criteria: "Leadership & Strategic Ability", weight: 10, description: "Leadership, ownership, initiative, collaboration, decision-making, strategic thinking, mentoring, or organizational contributions." },
  { criteria: "Communication & Soft Skills", weight: 5, description: "Communication clarity, teamwork, stakeholder interaction, documentation quality, collaboration, adaptability." },
];

export function CreateJobModal() {
  const open = useAts((s) => s.createJobOpen);
  const close = useAts((s) => s.closeCreateJob);
  const createJob = useAts((s) => s.createJob);
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);

  const [title, setTitle] = useState("");
  const [depts, setDepts] = useState<string[]>(DEPARTMENTS);
  const [departmentSelect, setDepartmentSelect] = useState(DEPARTMENTS[0]);
  const [customDept, setCustomDept] = useState("");
  const [location, setLocation] = useState("Kathmandu");
  const [type, setType] = useState<(typeof TYPES)[number]>("Full-time");
  const [description, setDescription] = useState("");
  const [skillsInput, setSkillsInput] = useState("");

  const [criteria, setCriteria] = useState<ScoringCriterion[]>(DEFAULT_SCORING_CRITERIA);
  const [submitting, setSubmitting] = useState(false);

  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const weightIsValid = Math.round(totalWeight * 100) / 100 === 100;

  useEffect(() => {
    if (!open) {
      setStep(1);
      setTitle(""); setDepartmentSelect(DEPARTMENTS[0]); setCustomDept(""); setLocation("Kathmandu");
      setType("Full-time"); setDescription(""); setSkillsInput("");
      setCriteria(DEFAULT_SCORING_CRITERIA);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      const baseApiUrl = API_BASE;
      fetch(`${baseApiUrl}/jobs/departments`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const unique = Array.from(new Set([...data, ...DEPARTMENTS]));
            setDepts(unique);
          } else {
            setDepts(DEPARTMENTS);
          }
        })
        .catch(() => {
          setDepts(DEPARTMENTS);
        });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const goToScoring = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    const finalDept = departmentSelect === "__new__" ? customDept.trim() : departmentSelect;
    if (!finalDept) {
      alert("Please enter or select a department");
      return;
    }
    setStep(2);
  };

  const updateCriterion = (index: number, patch: Partial<ScoringCriterion>) => {
    setCriteria((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const removeCriterion = (index: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  const addCriterion = () => {
    setCriteria((prev) => [...prev, { criteria: "", weight: 0, description: "" }]);
  };

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightIsValid) return;
    if (criteria.some((c) => !c.criteria.trim())) {
      alert("Every scoring criterion needs a name.");
      return;
    }
    const finalDept = departmentSelect === "__new__" ? customDept.trim() : departmentSelect;
    setSubmitting(true);
    try {
      await createJob({
        title: title.trim(),
        department: finalDept,
        location: location.trim() || "Kathmandu",
        type,
        description: description.trim(),
        skills: skillsInput.split(",").map((s) => s.trim()).filter(Boolean),
        scoring_criteria: criteria.map((c) => ({ ...c, weight: Number(c.weight) || 0 })),
      });
      close();
    } catch (err: any) {
      alert(err.message || "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <motion.form
            onSubmit={step === 1 ? goToScoring : publish}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="my-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  {step === 1 ? "Create job" : "Scoring criteria"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {step === 1
                    ? "Post a new role to your active pipeline."
                    : "Used by the AI evaluator to score candidates. Cannot be edited after the job is posted."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {step} of 2
                </span>
                <button
                  type="button" onClick={close} aria-label="Close"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {step === 1 ? (
              <div className="grid gap-4 p-5">
                <Field label="Job title" required>
                  <input
                    required value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Head of Risk & Compliance"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Department">
                    <div className="space-y-2">
                      <select
                        value={departmentSelect} onChange={(e) => setDepartmentSelect(e.target.value)}
                        className="h-10 w-full rounded-lg border border-border bg-background px-2 text-sm focus:outline-none"
                      >
                        {depts.map((d) => <option key={d} value={d}>{d}</option>)}
                        <option value="__new__">+ Create new department...</option>
                      </select>
                      {departmentSelect === "__new__" && (
                        <input
                          required value={customDept} onChange={(e) => setCustomDept(e.target.value)}
                          placeholder="Type new department name"
                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                        />
                      )}
                    </div>
                  </Field>
                  <Field label="Employment type">
                    <select
                      value={type} onChange={(e) => setType(e.target.value as typeof type)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"
                    >
                      {TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>

                <Field label="Location" required>
                  <input
                    required value={location} onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Kathmandu / Remote"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </Field>

                <Field label="Required skills" hint="Comma separated">
                  <input
                    value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)}
                    placeholder="e.g. AML, CFT, KYC, NRB, FATF, MLRO"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </Field>

                <Field label="Job description" required>
                  <textarea
                    required value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder="Responsibilities, qualifications, what the role does…"
                    rows={10}
                    className="w-full resize-y rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </Field>
              </div>
            ) : (
              <div className="grid gap-4 p-5 max-h-[60vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Default criteria are pre-filled below — edit weights, descriptions, or add/remove rows as needed.
                  </p>
                  <span
                    className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${
                      weightIsValid
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    Total: {totalWeight}/100
                  </span>
                </div>

                <div className="space-y-3">
                  {criteria.map((c, i) => (
                    <div key={i} className="rounded-xl border border-border bg-background/50 p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <input
                          value={c.criteria}
                          onChange={(e) => updateCriterion(i, { criteria: e.target.value })}
                          placeholder="Criterion name"
                          className="h-9 flex-1 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={c.weight}
                          onChange={(e) => updateCriterion(i, { weight: Number(e.target.value) })}
                          className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-sm text-center outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                        />
                        <button
                          type="button"
                          onClick={() => removeCriterion(i)}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:text-destructive hover:border-destructive/30"
                          aria-label="Remove criterion"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <textarea
                        value={c.description}
                        onChange={(e) => updateCriterion(i, { description: e.target.value })}
                        placeholder="What the AI evaluator should look for..."
                        rows={2}
                        className="w-full resize-y rounded-lg border border-border bg-background p-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addCriterion}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add criterion
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 p-4">
              {step === 2 && (
                <button
                  type="button" onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm mr-auto"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              )}
              <button
                type="button" onClick={close}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                Cancel
              </button>
              {step === 1 ? (
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/30"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!weightIsValid || submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/30 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Plus className="h-4 w-4" /> {submitting ? "Publishing…" : "Publish job"}
                </button>
              )}
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium text-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </span>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
