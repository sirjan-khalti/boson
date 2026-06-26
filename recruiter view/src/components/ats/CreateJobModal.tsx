import { motion, AnimatePresence } from "framer-motion";
import { X, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useAts } from "@/lib/store";
import { API_BASE } from "@/lib/config";
import { useNavigate } from "react-router-dom";

const DEPARTMENTS = ["Engineering", "Product", "Design", "Data", "Legal", "Risk & Compliance", "Operations", "Marketing"];
const TYPES = ["Full-time", "Part-time", "Intern", "Trainee"] as const;

export function CreateJobModal() {
  const open = useAts((s) => s.createJobOpen);
  const close = useAts((s) => s.closeCreateJob);
  const createJob = useAts((s) => s.createJob);
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [depts, setDepts] = useState<string[]>(DEPARTMENTS);
  const [departmentSelect, setDepartmentSelect] = useState(DEPARTMENTS[0]);
  const [customDept, setCustomDept] = useState("");
  const [location, setLocation] = useState("Kathmandu");
  const [type, setType] = useState<(typeof TYPES)[number]>("Full-time");
  const [description, setDescription] = useState("");
  const [skillsInput, setSkillsInput] = useState("");

  useEffect(() => {
    if (!open) {
      setTitle(""); setDepartmentSelect(DEPARTMENTS[0]); setCustomDept(""); setLocation("Kathmandu");
      setType("Full-time"); setDescription(""); setSkillsInput("");
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    const finalDept = departmentSelect === "__new__" ? customDept.trim() : departmentSelect;
    if (!finalDept) {
      alert("Please enter or select a department");
      return;
    }
    try {
      await createJob({
        title: title.trim(),
        department: finalDept,
        location: location.trim() || "Kathmandu",
        type,
        description: description.trim(),
        skills: skillsInput.split(",").map((s) => s.trim()).filter(Boolean),
      });
      close();
    } catch (err: any) {
      alert(err.message || "Failed to create job");
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
            onSubmit={submit}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="my-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Create job</h2>
                <p className="text-xs text-muted-foreground">Post a new role to your active pipeline.</p>
              </div>
              <button
                type="button" onClick={close} aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

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

            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 p-4">
              <button
                type="button" onClick={close}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/30"
              >
                <Plus className="h-4 w-4" /> Publish job
              </button>
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
