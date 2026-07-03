import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Briefcase, Users, Calendar, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useAts } from "@/lib/store";

export function JobModal() {
  const jobId = useAts((s) => s.selectedJobId);
  const job = useAts((s) => s.jobs.find((j) => j.id === s.selectedJobId));
  const close = useAts((s) => s.closeJobModal);

  useEffect(() => {
    if (!jobId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jobId, close]);

  return (
    <AnimatePresence>
      {job && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={close} />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{job.department}</div>
                <h2 className="mt-0.5 text-xl font-semibold tracking-tight">{job.title}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>
                  <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {job.type}</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {job.applicants} applicants</span>
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Posted {job.posted_date}</span>
                </div>
              </div>
              <button
                onClick={close}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <section>
                <h3 className="text-sm font-semibold">Job description</h3>
                <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {job.description}
                </div>
              </section>

              {job.skills?.length > 0 && (
                <section className="mt-5">
                  <h3 className="text-sm font-semibold">Required skills</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {job.skills.map((s) => (
                      <span key={s} className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs">{s}</span>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-3">
              <Link
                to="/candidates" search={{ jobId: job.id }} onClick={close}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-95"
              >
                View candidates <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
