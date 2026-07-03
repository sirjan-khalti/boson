import { Link, useSearchParams } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { Search, Download, X, Briefcase, Gem, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { MatchBadge, MatchScore } from "@/components/ats/MatchBadge";
import { StageChip } from "@/components/ats/StageChip";
import { Avatar } from "@/components/ats/Avatar";
import { useAts } from "@/lib/store";
import type { MatchTier } from "@/lib/data";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const ALL_STAGES = ["All", "Applied", "Screening", "Shortlisted", "Interview", "Final Review", "Offer", "Hired", "Rejected"];

export default function CandidatesPage() {
  const candidates = useAts((s) => s.candidates);
  const jobs = useAts((s) => s.jobs);
  const fetchJobs = useAts((s) => s.fetchJobs);
  const openCandidate = useAts((s) => s.openCandidate);
  const [searchParams, setSearchParams] = useSearchParams();
  const jobId = searchParams.get("jobId") ?? undefined;

  // Filter & Search Inputs
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [debouncedMinScore, setDebouncedMinScore] = useState(0);
  const [minExp, setMinExp] = useState(0);
  const [debouncedMinExp, setDebouncedMinExp] = useState(0);
  const [stage, setStage] = useState<string>("All");
  const [tiers, setTiers] = useState<Set<MatchTier>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Sorting State
  const [sortField, setSortField] = useState<string>("match");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination State
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ((prev) => {
        if (prev !== q) {
          setPage(1);
          return q;
        }
        return prev;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  // Debounce sliders to avoid spamming database
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMinScore((prev) => {
        if (prev !== minScore) {
          setPage(1);
          return minScore;
        }
        return prev;
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [minScore]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMinExp((prev) => {
        if (prev !== minExp) {
          setPage(1);
          return minExp;
        }
        return prev;
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [minExp]);

  useEffect(() => {
    if (jobs.length === 0) fetchJobs();
  }, [jobs.length, fetchJobs]);

  const selectedJob = jobId ? jobs.find((j) => j.id === jobId) : null;

  const candidateJobs = useMemo(() => {
    return jobs.filter((j) => j.status === "Active" || j.id === jobId);
  }, [jobs, jobId]);

  const fetchCandidatesData = async (
    jId?: string,
    search?: string,
    mScore?: number,
    mExp?: number,
    stg?: string,
    trs?: Set<MatchTier>,
    sField?: string,
    sOrder?: "asc" | "desc",
    pg?: number,
    sz?: number
  ) => {
    setLoading(true);
    try {
      const res = await api.getCandidates({
        jobId: jId,
        search,
        minScore: mScore || undefined,
        minExp: mExp || undefined,
        stage: stg === "All" ? undefined : stg,
        tiers: trs && trs.size > 0 ? Array.from(trs).join(",") : undefined,
        sort_by: sField,
        sort_order: sOrder,
        page: pg,
        size: sz,
      });

      // Synchronize with Ats store so candidate drawers and modals work seamlessly
      useAts.setState({ candidates: res.items });
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      console.error("Failed to fetch candidates", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidatesData(
      jobId,
      debouncedQ,
      debouncedMinScore,
      debouncedMinExp,
      stage,
      tiers,
      sortField,
      sortOrder,
      page,
      size
    );
  }, [jobId, debouncedQ, debouncedMinScore, debouncedMinExp, stage, tiers, sortField, sortOrder, page, size]);

  // Reset page to 1 if Job URL param changes
  useEffect(() => {
    setPage((p) => {
      if (p !== 1) return 1;
      return p;
    });
  }, [jobId]);

  const handleSort = (field: string) => {
    let order: "asc" | "desc" = "asc";
    if (sortField === field) {
      order = sortOrder === "asc" ? "desc" : "asc";
      setSortOrder(order);
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? " ▴" : " ▾";
  };

  const toggleTier = (t: MatchTier) => {
    setTiers((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
    setPage(1);
  };

  const setJob = (v: string) =>
    v ? setSearchParams({ jobId: v }) : setSearchParams({});

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExport = async () => {
    // Fetch all candidates matching current filter criteria for export
    try {
      const exportData = await api.getCandidates({
        jobId,
        search: debouncedQ,
        minScore: debouncedMinScore || undefined,
        minExp: debouncedMinExp || undefined,
        stage: stage === "All" ? undefined : stage,
        tiers: tiers.size > 0 ? Array.from(tiers).join(",") : undefined,
        sort_by: sortField,
        sort_order: sortOrder,
        page: 1,
        size: 10000,
      });

      const targets = selected.size > 0
        ? exportData.items.filter((c: any) => selected.has(c.id))
        : exportData.items;

      if (targets.length === 0) {
        alert("No candidates to export.");
        return;
      }

      const headers = [
        "ID",
        "Name",
        "Email",
        "Phone",
        "Role Title",
        "Current Company",
        "Experience (Years)",
        "Location",
        "Education",
        "Match Score (%)",
        "Match Tier",
        "Skills",
        "Stage",
        "Applied Date",
        "Scores Breakdown"
      ];

      const escapeCSV = (val: string | number | undefined | null) => {
        if (val === undefined || val === null) return '""';
        const str = String(val);
        return `"${str.replace(/"/g, '""')}"`;
      };

      const rows = targets.map((c: any) => [
        c.id,
        c.name,
        c.email,
        c.phone,
        c.title,
        c.company,
        c.experience,
        c.location,
        c.education,
        c.match,
        c.tier,
        Array.isArray(c.skills) ? c.skills.join(", ") : "",
        c.stage,
        c.appliedDate,
        (Array.isArray(c.scores) ? c.scores : []).map((s: any) => `${s.criteria}: ${s.score}/${s.weight}`).join("; ")
      ].map(escapeCSV).join(","));

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);

      const filename = selected.size > 0
        ? `selected_candidates_${new Date().toISOString().slice(0, 10)}.csv`
        : `candidates_export_${new Date().toISOString().slice(0, 10)}.csv`;

      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Export failed", e);
      alert("Export failed.");
    }
  };

  const allChecked = candidates.length > 0 && candidates.every((c) => selected.has(c.id));

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
          <p className="text-sm text-muted-foreground">
            {selectedJob
              ? `${total} candidates for ${selectedJob.title}`
              : `${total} candidates across all roles`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchCandidatesData(jobId, debouncedQ, debouncedMinScore, debouncedMinExp, stage, tiers, sortField, sortOrder, page, size)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm hover:bg-muted transition text-foreground"
            title="Refresh candidate list"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
          </button>
          <button
            onClick={handleExport}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm hover:bg-muted transition"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Top filter bar: Job filter + search + score + stage */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <select
            value={jobId ?? ""}
            onChange={(e) => setJob(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
          >
            <option value="">All jobs</option>
            {candidateJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}{j.status === "Closed" ? " (Closed)" : ""}
              </option>
            ))}
          </select>
          {selectedJob && (
            <button
              onClick={() => setJob("")}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              title="Clear job filter"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        <div className="relative ml-auto flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or skill…"
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <select
          value={stage}
          onChange={(e) => {
            setStage(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
        >
          {ALL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Secondary filter row: sliders + tier chips */}
      <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]">
        <RangeSlider
          label="Min match score"
          value={minScore}
          min={0}
          max={100}
          step={1}
          suffix="%"
          onChange={setMinScore}
        />
        <RangeSlider
          label="Min experience"
          value={minExp}
          min={0}
          max={15}
          step={1}
          suffix="y"
          onChange={setMinExp}
        />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <Gem className="h-3.5 w-3.5" /> Tier
            </span>
            {tiers.size > 0 && (
              <button
                onClick={() => {
                  setTiers(new Set());
                  setPage(1);
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["Strong Fit", "Moderate Fit", "Weak Fit"] as MatchTier[]).map((t) => {
              const active = tiers.has(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleTier(t)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition",
                    active
                      ? t === "Strong Fit"
                        ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : t === "Moderate Fit"
                          ? "border-amber-500/60 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "border-rose-500/60 bg-rose-500/10 text-rose-500"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedJob && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-sm">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <span className="font-medium">{selectedJob.title}</span>
            <span className="text-xs text-muted-foreground">
              · {selectedJob.department} · {selectedJob.location}
            </span>
          </div>
          <Link
            to={`/pipeline?jobId=${selectedJob.id}`}
            className="text-xs text-primary hover:underline"
          >
            Open pipeline →
          </Link>
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-1.5">
            <button className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">Shortlist</button>
            <button className="rounded-md border border-border px-2.5 py-1 text-xs">Move stage</button>
            <button className="rounded-md border border-destructive/40 px-2.5 py-1 text-xs text-destructive">Reject</button>
            <button onClick={() => setSelected(new Set())} className="ml-1 rounded-md p-1 text-muted-foreground hover:bg-background">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {loading && candidates.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
            <RefreshCw className="h-6 w-6 mx-auto animate-spin text-muted-foreground/60" />
            <p>Loading candidates...</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/40 text-xs text-muted-foreground backdrop-blur border-b border-border">
                <tr>
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (allChecked) {
                            candidates.forEach((c) => next.delete(c.id));
                          } else {
                            candidates.forEach((c) => next.add(c.id));
                          }
                          return next;
                        });
                      }}
                      className="accent-[oklch(0.52_0.22_295)]"
                    />
                  </th>
                  <th onClick={() => handleSort("name")} className="px-3 py-2.5 text-left font-medium cursor-pointer hover:bg-muted/60 select-none">
                    Candidate{renderSortIcon("name")}
                  </th>
                  <th onClick={() => handleSort("salaryExpectation")} className="px-3 py-2.5 text-left font-medium cursor-pointer hover:bg-muted/60 select-none">
                    Expected Salary{renderSortIcon("salaryExpectation")}
                  </th>
                  <th onClick={() => handleSort("match")} className="px-3 py-2.5 text-left font-medium cursor-pointer hover:bg-muted/60 select-none">
                    Match{renderSortIcon("match")}
                  </th>
                  <th onClick={() => handleSort("experience")} className="px-3 py-2.5 text-left font-medium cursor-pointer hover:bg-muted/60 select-none">
                    Exp{renderSortIcon("experience")}
                  </th>
                  <th onClick={() => handleSort("stage")} className="px-3 py-2.5 text-left font-medium cursor-pointer hover:bg-muted/60 select-none">
                    Stage{renderSortIcon("stage")}
                  </th>
                  <th onClick={() => handleSort("appliedDate")} className="px-3 py-2.5 text-left font-medium cursor-pointer hover:bg-muted/60 select-none">
                    Applied{renderSortIcon("appliedDate")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => {
                  const job = jobs.find((j) => j.id === c.jobId);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => openCandidate(c.id)}
                      className="cursor-pointer border-t border-border transition hover:bg-muted/30"
                    >
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggle(c.id)}
                          className="accent-[oklch(0.52_0.22_295)]"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} size={30} />
                          <div className="leading-tight">
                            <div className="font-medium">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{job?.title}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{c.salaryExpectation}</td>
                      <td className="px-3 py-2.5"><div className="flex items-center gap-2"><MatchScore score={c.match} /><MatchBadge tier={c.tier} /></div></td>
                      <td className="px-3 py-2.5 tabular-nums">{c.experience}y</td>
                      <td className="px-3 py-2.5"><StageChip stage={c.stage} /></td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {new Date(c.appliedDate).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {candidates.length === 0 && (
              <div className="px-5 py-16 text-center text-sm text-muted-foreground">
                No candidates match your filters.
              </div>
            )}
          </>
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
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(1);
              }}
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

function RangeSlider({
  label, value, min, max, step, suffix, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">
          {value === 0 ? "Any" : `${value}${suffix ?? ""}+`}
          <span className="ml-1 text-muted-foreground">/ {max}{suffix ?? ""}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
        style={{
          background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${
            ((value - min) / (max - min)) * 100
          }%, hsl(var(--muted)) ${((value - min) / (max - min)) * 100}%, hsl(var(--muted)) 100%)`,
        }}
      />
    </div>
  );
}
