import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Briefcase, UserPlus, CalendarCheck, Trophy, Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Legend,
} from "recharts";
import { useMemo, useEffect, useState } from "react";
import { StatCard } from "@/components/ats/StatCard";
import { MatchScore, MatchBadge } from "@/components/ats/MatchBadge";
import { Avatar } from "@/components/ats/Avatar";
import { StageChip } from "@/components/ats/StageChip";
import { useAts } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

// Cycled by index rather than keyed by stage name, so this stays correct
// regardless of how many stages the backend defines or what order they
// come back in.
const STAGE_COLORS = [
  "oklch(0.75 0.08 240)", // blue
  "oklch(0.7 0.16 200)", // teal
  "oklch(0.75 0.16 80)", // amber
  "oklch(0.6 0.22 295)", // purple
  "oklch(0.7 0.15 50)", // orange
  "oklch(0.7 0.19 330)", // pink
  "oklch(0.62 0.18 140)", // green
  "oklch(0.62 0.24 27)", // red
];

export default function Dashboard() {
  const candidates = useAts((s) => s.candidates);
  const jobs = useAts((s) => s.jobs);
  const fetchJobs = useAts((s) => s.fetchJobs);
  const fetchCandidates = useAts((s) => s.fetchCandidates);
  const openCandidate = useAts((s) => s.openCandidate);
  const { user } = useAuth();

  const [stages, setStages] = useState<string[]>([]);

  useEffect(() => {
    fetchJobs();
    fetchCandidates();
    api.getCandidateFilterOptions()
      .then((opts) => setStages(opts.stages))
      .catch((err) => console.error("Failed to load stage options", err));
  }, [fetchJobs, fetchCandidates]);
  const recent = useMemo(() => {
    return [...candidates]
      .sort((a, b) => {
        const dateA = a.applied_date ? new Date(a.applied_date).getTime() : 0;
        const dateB = b.applied_date ? new Date(b.applied_date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 6);
  }, [candidates]);

  const top = useMemo(() => {
    return [...candidates].sort((a, b) => b.match_score - a.match_score).slice(0, 5);
  }, [candidates]);

  const appsPerJob = useMemo(() => {
    return jobs
      .filter((j) => j.status === "Active")
      .map((j) => {
        const jobCandidates = candidates.filter((c) => c.job_id === j.id);
        const counts: Record<string, number> = {};
        for (const stage of stages) {
          counts[stage] = jobCandidates.filter((c) => c.stage === stage).length;
        }

        return {
          id: j.id,
          name: j.title.split(" ").slice(0, 2).join(" "),
          fullName: j.title,
          ...counts,
          total: jobCandidates.length,
        };
      });
  }, [jobs, candidates, stages]);

  // Excludes the terminal-negative outcome — this chart tracks positive
  // progression through the pipeline, not rejections.
  const funnelStages = useMemo(() => stages.filter((s) => s !== "Rejected"), [stages]);

  const funnelData = useMemo(() => {
    return funnelStages.map((stage) => ({
      stage,
      value: candidates.filter((c) => c.stage_history?.some((h) => h.stage === stage) || c.stage === stage).length,
    }));
  }, [candidates, funnelStages]);

  const stats = useMemo(() => {
    const activeJobs = jobs.filter((j) => j.status === "Active").length;
    const totalCandidates = candidates.length;
    const interviews = candidates.filter((c) => c.stage === "Interview").length;
    const hired = candidates.filter((c) => c.stage === "Hired").length;
    const avgMatch = totalCandidates > 0
      ? Math.round(candidates.reduce((s, c) => s + c.match_score, 0) / totalCandidates)
      : 0;
    return { activeJobs, totalCandidates, interviews, hired, avgMatch };
  }, [jobs, candidates]);



  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {user?.name || user?.email?.split("@")[0] || "Recruiter"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here's what's happening across your pipelines today.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          All systems healthy
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Active Jobs" value={stats.activeJobs} icon={Briefcase} index={0} accent />
        <StatCard label="Candidates" value={stats.totalCandidates} icon={UserPlus} index={1} />
        <StatCard label="Interviews" value={stats.interviews} icon={CalendarCheck} index={2} />
        <StatCard label="Hired" value={stats.hired} icon={Trophy} index={3} />
        <StatCard label="Avg Match" value={`${stats.avgMatch}%`} icon={Sparkles} index={4} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Applications per Job</h2>
              <p className="text-xs text-muted-foreground">Candidate status distribution for all active jobs</p>
            </div>
          </div>
          <div className="h-64">
            {appsPerJob.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={appsPerJob} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    labelFormatter={(labelValue) => {
                      const item = appsPerJob.find((x) => x.name === labelValue);
                      return item ? item.fullName : labelValue;
                    }}
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8, fontSize: 12,
                    }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  {stages.map((stage, idx) => (
                    <Bar
                      key={stage}
                      dataKey={stage}
                      name={stage}
                      stackId="a"
                      fill={STAGE_COLORS[idx % STAGE_COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No active jobs found.
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <h2 className="mb-4 text-sm font-semibold text-foreground">Hiring funnel (Historical)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={funnelData} margin={{ top: 4, right: 16, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" fontSize={11} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="stage" fontSize={11} width={80} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8, fontSize: 12,
                  }}
                />
                <Bar dataKey="value" name="Candidates" fill="oklch(0.65 0.18 27)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Applications */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Recent applications</h2>
            <Link to="/candidates" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-2 text-left font-medium">Candidate</th>
                <th className="px-3 py-2 text-left font-medium">Role</th>
                <th className="px-3 py-2 text-left font-medium">Match</th>
                <th className="px-3 py-2 text-left font-medium">Stage</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.id} onClick={() => openCandidate(c.id)} className="cursor-pointer border-t border-border transition hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} size={32} />
                      <div className="leading-tight">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.title}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{jobs.find(j => j.id === c.job_id)?.title}</td>
                  <td className="px-3 py-3"><div className="flex items-center gap-2"><MatchScore score={c.match_score} /><MatchBadge tier={c.tier} /></div></td>
                  <td className="px-3 py-3"><StageChip stage={c.stage} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* High Match */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold">High match candidates</h2>
          <ul className="space-y-3">
            {top.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => openCandidate(c.id)}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-muted/40"
                >
                  <Avatar name={c.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.title} · {c.experience}y</div>
                  </div>
                  <div className="text-right">
                    <MatchScore score={c.match_score} />
                    <div className="mt-0.5"><MatchBadge tier={c.tier} /></div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
