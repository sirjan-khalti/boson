import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ShieldAlert,
  History,
  Search,
  Briefcase,
  UserPlus,
  UserCog,
  Settings,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useAuth, getToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/config";

type ActivityLog = {
  id: string;
  timestamp: string;
  action_type: string;
  description: string;
  user_name: string;
  user_email: string | null;
  job_id: string | null;
  candidate_id: string | null;
};

const actionIconMap: Record<string, React.ElementType> = {
  job_created: Briefcase,
  job_status_updated: Settings,
  candidate_applied: UserPlus,
  candidate_stage_updated: UserCog,
  member_role_updated: ShieldAlert,
};

const actionColorMap: Record<string, { bg: string; text: string; border: string }> = {
  job_created: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/5",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
  },
  job_status_updated: {
    bg: "bg-amber-500/10 dark:bg-amber-500/5",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
  },
  candidate_applied: {
    bg: "bg-sky-500/10 dark:bg-sky-500/5",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/20",
  },
  candidate_stage_updated: {
    bg: "bg-primary/10 dark:bg-primary/5",
    text: "text-primary dark:text-primary-400",
    border: "border-primary/20",
  },
  member_role_updated: {
    bg: "bg-fuchsia-500/10 dark:bg-fuchsia-500/5",
    text: "text-fuchsia-600 dark:text-fuchsia-400",
    border: "border-fuchsia-500/20",
  },
};

export default function ActivityLogsPage() {
  const { user, isAdmin } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // Pagination State
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  // Debounce search input to avoid hammering backend
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLogs = async (p: number, s: number, type: string, query: string) => {
    setLoading(true);
    try {
      const apiBase = API_BASE;
      const url = new URL(`${apiBase}/activity-logs/fetch`);
      url.searchParams.append("page", p.toString());
      url.searchParams.append("size", s.toString());
      if (type && type !== "all") {
        url.searchParams.append("action_type", type);
      }
      if (query.trim()) {
        url.searchParams.append("search", query.trim());
      }

      const headers: Record<string, string> = {};
      const token = getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(url.toString(), {
        headers,
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.items);
        setTotal(data.total);
        setPages(data.pages);
      }
    } catch (e) {
      console.error("Failed to fetch activity logs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchLogs(page, size, filterType, debouncedSearch);
    }
  }, [isAdmin, page, size, filterType, debouncedSearch]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-3 text-lg font-semibold">Sign in required</h2>
        <p className="mt-1 text-sm text-muted-foreground">Please sign in to access activity logs.</p>
        <Link to="/login" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go to login</Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h2 className="mt-3 text-lg font-semibold">Access restricted</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Only <span className="font-medium">ADMIN</span> and <span className="font-medium">SUPERADMIN</span> can view the activity audit trail.
          Your current role is <span className="font-medium">{user.role}</span>.
        </p>
      </div>
    );
  }

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr + "Z");
      return date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (e) {
      return dateStr;
    }
  };

  const handleRefresh = () => {
    fetchLogs(page, size, filterType, debouncedSearch);
  };

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
            <History className="h-5 w-5 text-primary" /> Activity Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground">Chronological audit trail of all recruiters actions and application activities.</p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted active:scale-95 transition-all text-foreground"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs by activity description, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 font-medium min-w-[180px]"
          >
            <option value="all">All Action Types</option>
            <option value="job_created">Job Created</option>
            <option value="job_status_updated">Job Status Updated</option>
            <option value="candidate_applied">Candidate Applied</option>
            <option value="candidate_stage_updated">Candidate Stage Updated</option>
            <option value="member_role_updated">Team Role Updated</option>
          </select>
        </div>
      </div>

      {/* Logs container */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
            <RefreshCw className="h-6 w-6 mx-auto animate-spin text-muted-foreground/60" />
            <p>Loading activity logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
            <History className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="font-semibold text-foreground">No activities found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {logs.map((log) => {
              const Icon = actionIconMap[log.action_type] || History;
              const color = actionColorMap[log.action_type] || {
                bg: "bg-muted",
                text: "text-foreground",
                border: "border-border",
              };

              return (
                <div key={log.id} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                  {/* Action Icon */}
                  <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl border shadow-sm", color.bg, color.text, color.border)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Log info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-start justify-between gap-1">
                      <p className="text-sm font-medium text-foreground tracking-tight leading-snug">
                        {log.description}
                      </p>
                      <span className="text-[11px] text-muted-foreground shrink-0 font-medium whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Actor: <span className="font-medium text-foreground">{log.user_name}</span>
                        {log.user_email && <span className="text-[11px] opacity-80 font-normal"> ({log.user_email})</span>}
                      </span>
                      <span className="hidden sm:inline opacity-30">•</span>
                      <span>
                        Action: <span className="font-semibold uppercase tracking-wider text-[10px] text-primary">{log.action_type.replace(/_/g, " ")}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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

      <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
        Audit trail activities are immutable and generated automatically by backend database operations.
      </div>
    </div>
  );
}
