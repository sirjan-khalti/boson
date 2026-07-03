import { Link } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Filter, Briefcase, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAts } from "@/lib/store";
import { useAuth } from "@/lib/auth";

const tabs = ["Active", "Closed"] as const;

export default function JobsPage() {
  const jobs = useAts((s) => s.jobs);
  const activeJobs = useAts((s) => s.activeJobs);
  const closedJobs = useAts((s) => s.closedJobs);
  const archivedJobs = useAts((s) => s.archivedJobs);

  const fetchJobs = useAts((s) => s.fetchJobs);
  const fetchActiveJobs = useAts((s) => s.fetchActiveJobs);
  const fetchClosedJobs = useAts((s) => s.fetchClosedJobs);
  const fetchArchivedJobs = useAts((s) => s.fetchArchivedJobs);
  const openCreateJob = useAts((s) => s.openCreateJob);
  const openJob = useAts((s) => s.openJob);
  const closeJob = useAts((s) => s.closeJob);
  const reopenJob = useAts((s) => s.reopenJob);
  const { isAdmin } = useAuth();

  const [tab, setTab] = useState<(typeof tabs)[number]>("Active");
  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string>("All");
  const [showOnlyArchived, setShowOnlyArchived] = useState(false);

  const [sortField, setSortField] = useState<string>("applicants");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");


  // Full job list is used for the departments dropdown regardless of tab
  useEffect(() => {
    if (jobs.length === 0) fetchJobs();
  }, [jobs.length, fetchJobs]);

  // Fetch when tab or archive toggle changes
  useEffect(() => {
    if (tab === "Active") {
      fetchActiveJobs();
    } else if (tab === "Closed") {
      if (showOnlyArchived) {
        fetchArchivedJobs();
      } else {
        fetchClosedJobs();
      }
    }
  }, [tab, showOnlyArchived, fetchActiveJobs, fetchClosedJobs, fetchArchivedJobs]);

  useEffect(() => {
    setShowOnlyArchived(false);
  }, [tab]);

  const isArchived = (j: typeof jobs[number]) => {
    if (j.status !== "Closed") return false;

    const closedDate = new Date(j.closed_date || j.postedDate);
    const diffTime = new Date().getTime() - closedDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 30;
  };

  const getClosedDateStr = (j: typeof jobs[number]) => j.closed_date || j.postedDate;

  const formatToDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const departments = useMemo(
    () => ["All", ...Array.from(new Set(jobs.map((j) => j.department)))],
    [jobs],
  );

  const tabJobs = tab === "Active" ? activeJobs : (showOnlyArchived ? archivedJobs : closedJobs);

  const filtered = tabJobs.filter((j) => {
    const matchTab = (tab === "Active" && j.status === "Active") || (tab === "Closed" && j.status === "Closed");
    if (!matchTab) return false;

    if (tab === "Closed") {
      if (showOnlyArchived) {
        if (!isArchived(j)) return false;
      } else {
        if (isArchived(j)) return false;
      }
    }

    return (
      (dept === "All" || j.department === dept) &&
      j.title.toLowerCase().includes(q.toLowerCase())
    );
  });

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA = a[sortField as keyof typeof a];
      let valB = b[sortField as keyof typeof b];

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? " ▴" : " ▾";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
          <p className="text-sm text-muted-foreground">Open vacancies and closed roles.</p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateJob}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/30 hover:opacity-95"
          >
            <Plus className="h-4 w-4" /> Create job
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t} onClick={() => setTab(t)}
            className={cn(
              "relative px-3 py-2 text-sm font-medium transition",
              tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
            {tab === t && (
              <motion.span layoutId="jobs-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {tab === "Closed" && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Lock className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold">View archived vacancies</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Roles closed for 30 days or more are automatically archived. You can view their candidate pool but cannot reopen them.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowOnlyArchived(!showOnlyArchived)}
            className={cn(
              "shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20",
              showOnlyArchived
                ? "bg-primary text-primary-foreground hover:bg-primary/95"
                : "bg-background border border-border hover:bg-muted text-foreground"
            )}
          >
            {showOnlyArchived ? "Show All Closed" : "View Archived"}
          </button>
        </motion.div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search jobs by title…"
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <select
          value={dept} onChange={(e) => setDept(e.target.value)}
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
        >
          {departments.map((d) => <option key={d}>{d}</option>)}
        </select>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm">
          <Filter className="h-3.5 w-3.5" /> Filters
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/40 text-xs text-muted-foreground backdrop-blur">
            <tr>
              <th onClick={() => handleSort("title")} className="px-5 py-2.5 text-left font-medium cursor-pointer hover:bg-muted/60 select-none">
                Job{renderSortIcon("title")}
              </th>
              <th onClick={() => handleSort("department")} className="px-3 py-2.5 text-left font-medium cursor-pointer hover:bg-muted/60 select-none">
                Department{renderSortIcon("department")}
              </th>
              <th onClick={() => handleSort("applicants")} className="px-3 py-2.5 text-left font-medium cursor-pointer hover:bg-muted/60 select-none">
                Applicants{renderSortIcon("applicants")}
              </th>
              <th onClick={() => handleSort("postedDate")} className="px-3 py-2.5 text-left font-medium cursor-pointer hover:bg-muted/60 select-none">
                Posted{renderSortIcon("postedDate")}
              </th>
              {tab === "Closed" && (
                <th className="px-3 py-2.5 text-left font-medium select-none">
                  Closed On
                </th>
              )}
              <th className="px-3 py-2.5 text-right font-medium select-none">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={tab === "Closed" ? 6 : 5} className="px-5 py-16 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-sm font-medium">No jobs here</div>
                  <div className="text-xs text-muted-foreground">Try a different tab or create a new job.</div>
                </td>
              </tr>
            )}
            {sorted.map((j) => {
              const archived = isArchived(j);
              return (
                <tr
                  key={j.id}
                  onClick={() => !archived && openJob(j.id)}
                  className={cn(
                    "border-t border-border transition",
                    archived ? "cursor-default bg-muted/5" : "cursor-pointer hover:bg-muted/30"
                  )}
                >
                  <td className="px-5 py-3">
                    {archived ? (
                      <span className="font-medium text-muted-foreground/80">
                        {j.title}
                      </span>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); openJob(j.id); }}
                        className="text-left font-medium hover:text-primary"
                      >
                        {j.title}
                      </button>
                    )}
                    <div className="text-xs text-muted-foreground">{j.location} · {j.type}</div>
                  </td>
                <td className="px-3 py-3 text-muted-foreground">{j.department}</td>
                <td className="px-3 py-3 tabular-nums">{j.applicants}</td>
                <td className="px-3 py-3 text-muted-foreground">
                  {formatToDDMMYYYY(j.postedDate)}
                </td>
                {tab === "Closed" && (
                  <td className="px-3 py-3 text-muted-foreground">
                    {formatToDDMMYYYY(getClosedDateStr(j))}
                  </td>
                )}
                <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      to={`/candidates?jobId=${j.id}`}
                      className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                    >
                      View candidates
                    </Link>
                    {isAdmin && (
                      j.status === "Active" ? (
                        <button
                          onClick={() => {
                            if (confirm(`Close vacancy "${j.title}"?`)) closeJob(j.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                        >
                          <Lock className="h-3 w-3" /> Close
                        </button>
                      ) : isArchived(j) ? (
                        <span className="text-xs text-muted-foreground bg-muted/40 border border-border/50 px-2 py-1 rounded-md cursor-not-allowed">
                          Archived
                        </span>
                      ) : (
                        <button
                          onClick={() => reopenJob(j.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                        >
                          <Unlock className="h-3 w-3" /> Reopen
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
