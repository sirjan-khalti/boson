import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  ShieldAlert,
  Sparkles,
  RefreshCw,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ats/Avatar";
import type { Candidate, Job } from "@/lib/data";

type DateRange = "today" | "week" | "year" | "all";
type JobScope = "open" | "all";

const statusStyles: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  SUCCESS: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20", icon: CheckCircle2 },
  FAILED: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20", icon: XCircle },
  PENDING: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20", icon: Clock },
};

export default function EvaluationsPage() {
  const { user, isSuperAdmin } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);

  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [jobScope, setJobScope] = useState<JobScope>("open");

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  const jobsMap = useMemo(() => {
    const map: Record<string, Job> = {};
    jobs.forEach((j) => { map[j.id] = j; });
    return map;
  }, [jobs]);

  const fetchEvaluations = async (p: number, s: number, dr: DateRange, js: JobScope) => {
    setLoading(true);
    try {
      const data = await api.getEvaluations({ page: p, size: s, date_range: dr, job_scope: js });
      setCandidates(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e) {
      console.error("Failed to fetch evaluations", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      api.getJobs().then(setJobs).catch(() => {});
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchEvaluations(page, size, dateRange, jobScope);
    }
  }, [isSuperAdmin, page, size, dateRange, jobScope]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-3 text-lg font-semibold">Sign in required</h2>
        <p className="mt-1 text-sm text-muted-foreground">Please sign in to access AI evaluation status.</p>
        <Link to="/login" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go to login</Link>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h2 className="mt-3 text-lg font-semibold">Access restricted</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Only <span className="font-medium">SUPERADMIN</span> can view AI evaluation status.
          Your current role is <span className="font-medium">{user.role}</span>.
        </p>
      </div>
    );
  }

  const handleRefresh = () => fetchEvaluations(page, size, dateRange, jobScope);

  const handleRetryOne = async (candidateId: string) => {
    setRetryingId(candidateId);
    try {
      await api.retryEvaluation(candidateId);
      await fetchEvaluations(page, size, dateRange, jobScope);
    } catch (e) {
      alert("Failed to queue retry for this candidate.");
    } finally {
      setRetryingId(null);
    }
  };

  const handleRetryAllFailed = async () => {
    setRetryingAll(true);
    try {
      const res = await api.retryAllFailedEvaluations({ date_range: dateRange, job_scope: jobScope });
      await fetchEvaluations(page, size, dateRange, jobScope);
      alert(`Queued ${res.queued} candidate(s) for re-evaluation.`);
    } catch (e) {
      alert("Failed to queue retries.");
    } finally {
      setRetryingAll(false);
    }
  };

  const failedCount = candidates.filter((c) => c.evaluation_status === "FAILED").length;

  const renderPageNumbers = () => {
    const buttons = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(pages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => setPage(i)}
          className={cn(
            "h-8 w-8 rounded-lg text-xs font-semibold transition active:scale-95",
            page === i
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              : "border border-border bg-background hover:bg-muted text-foreground"
          )}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Evaluation Status
          </h1>
          <p className="text-sm text-muted-foreground">Monitor and retry AI candidate evaluations.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRetryAllFailed}
            disabled={retryingAll || failedCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground shadow-sm hover:opacity-95 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            <RotateCw className={cn("h-3.5 w-3.5", retryingAll && "animate-spin")} />
            Retry All Failed{failedCount > 0 ? ` (${failedCount})` : ""}
          </button>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted active:scale-95 transition-all text-foreground"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Date</span>
          <select
            value={dateRange}
            onChange={(e) => { setDateRange(e.target.value as DateRange); setPage(1); }}
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 font-medium min-w-[140px]"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Jobs</span>
          <select
            value={jobScope}
            onChange={(e) => { setJobScope(e.target.value as JobScope); setPage(1); }}
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 font-medium min-w-[140px]"
          >
            <option value="open">Open Jobs</option>
            <option value="all">All Jobs</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {loading && candidates.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
            <RefreshCw className="h-6 w-6 mx-auto animate-spin text-muted-foreground/60" />
            <p>Loading evaluations...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="font-semibold text-foreground">No candidates found</p>
            <p className="text-xs text-muted-foreground">Try adjusting the date range or job scope filter.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Candidate</th>
                <th className="px-4 py-2.5 text-left font-medium">Job</th>
                <th className="px-4 py-2.5 text-left font-medium">Applied</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const status = statusStyles[c.evaluation_status] || statusStyles.PENDING;
                const StatusIcon = status.icon;
                const job = jobsMap[c.jobId];
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} size={30} />
                        <div>
                          <Link to={`/candidates/${c.id}`} className="font-medium hover:text-primary transition-colors">
                            {c.name}
                          </Link>
                          <div className="text-[11px] text-muted-foreground">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{job?.title || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {c.appliedDate ? new Date(c.appliedDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", status.bg, status.text, status.border)}>
                        <StatusIcon className="h-3 w-3" />
                        {c.evaluation_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.evaluation_status === "FAILED" && (
                        <button
                          onClick={() => handleRetryOne(c.id)}
                          disabled={retryingId === c.id}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <RotateCw className={cn("h-3 w-3", retryingId === c.id && "animate-spin")} />
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination controls */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{Math.min((page - 1) * size + 1, total)}</span> to{" "}
            <span className="font-semibold text-foreground">{Math.min(page * size, total)}</span> of{" "}
            <span className="font-semibold text-foreground">{total}</span> results
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground transition hover:bg-muted active:scale-95 disabled:pointer-events-none disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1">
              {renderPageNumbers()}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages || pages === 0}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground transition hover:bg-muted active:scale-95 disabled:pointer-events-none disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Show</span>
            <select
              value={size}
              onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }}
              className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs outline-none text-foreground font-semibold cursor-pointer hover:bg-muted transition"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
