import { useState, useMemo, useEffect } from "react";
import { api } from "@/lib/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Cell,
} from "recharts";
import {
  Calendar,
  Download,
  Users,
  Briefcase,
  UserCheck,
  UserMinus,
  CheckCircle,
  Clock,
  TrendingUp,
} from "lucide-react";

const TOOLTIP = {
  contentStyle: {
    background: "var(--color-popover)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontSize: 12,
  },
};

export default function ReportsPage() {
  // Default dates: 30 days ago to today
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  }, []);

  const [start, setStart] = useState(thirtyDaysAgoStr);
  const [end, setEnd] = useState(todayStr);

  const [reportData, setReportData] = useState<{
    summaryStats: {
      jobs: number;
      applied: number;
      screened: number;
      shortlisted: number;
      interviewed: number;
      finalReview: number;
      offer: number;
      hired: number;
      rejected: number;
    };
    jobBreakdown: Array<{
      id: string;
      title: string;
      department: string;
      status: string;
      postedDate: string;
      applied: number;
      screened: number;
      shortlisted: number;
      interviewed: number;
      finalReview: number;
      offer: number;
      hired: number;
      rejected: number;
    }>;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadReports() {
      setLoading(true);
      try {
        const data = await api.getReports(start, end);
        if (active) {
          setReportData(data);
        }
      } catch (err) {
        console.error("Failed to load reports", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadReports();
    return () => {
      active = false;
    };
  }, [start, end]);

  const summaryStats = useMemo(() => {
    return reportData?.summaryStats ?? {
      jobs: 0,
      applied: 0,
      screened: 0,
      shortlisted: 0,
      interviewed: 0,
      finalReview: 0,
      offer: 0,
      hired: 0,
      rejected: 0,
    };
  }, [reportData]);

  const jobBreakdown = useMemo(() => {
    return reportData?.jobBreakdown ?? [];
  }, [reportData]);

  // Recharts chart data (Conversion funnel values)
  const chartData = useMemo(() => {
    return [
      { name: "Applied", count: summaryStats.applied, fill: "oklch(0.57 0.23 22)" },
      { name: "Screened", count: summaryStats.screened, fill: "oklch(0.65 0.18 27)" },
      { name: "Shortlisted", count: summaryStats.shortlisted, fill: "oklch(0.75 0.16 80)" },
      { name: "Interviewed", count: summaryStats.interviewed, fill: "oklch(0.7 0.16 200)" },
      { name: "Final Review", count: summaryStats.finalReview, fill: "oklch(0.65 0.20 300)" },
      { name: "Offered", count: summaryStats.offer, fill: "oklch(0.70 0.15 170)" },
      { name: "Hired", count: summaryStats.hired, fill: "oklch(0.62 0.18 140)" },
      { name: "Rejected", count: summaryStats.rejected, fill: "oklch(0.62 0.24 27)" },
    ];
  }, [summaryStats]);

  // CSV download function
  const handleDownloadCsv = () => {
    const headers = [
      "Job Title",
      "Department",
      "Posted Date",
      "Status",
      "Applied",
      "Screened",
      "Shortlisted",
      "Interviewed",
      "Final Review",
      "Offered",
      "Hired",
      "Rejected",
    ];

    const metadataRows = [
      ["Recruitment Report Summary"],
      [`Date Range: ${start} to ${end}`],
      [],
      ["Overall Metrics"],
      [`Total Jobs Posted,${summaryStats.jobs}`],
      [`Total Applied,${summaryStats.applied}`],
      [`Total Screened,${summaryStats.screened}`],
      [`Total Shortlisted,${summaryStats.shortlisted}`],
      [`Total Interviewed,${summaryStats.interviewed}`],
      [`Total Final Review,${summaryStats.finalReview}`],
      [`Total Offered,${summaryStats.offer}`],
      [`Total Hired,${summaryStats.hired}`],
      [`Total Rejected,${summaryStats.rejected}`],
      [],
      ["Job-by-Job Breakdown"],
    ];

    const dataRows = jobBreakdown.map((j) => [
      `"${j.title.replace(/"/g, '""')}"`,
      `"${j.department.replace(/"/g, '""')}"`,
      j.postedDate,
      j.status,
      j.applied,
      j.screened,
      j.shortlisted,
      j.interviewed,
      j.finalReview,
      j.offer,
      j.hired,
      j.rejected,
    ]);

    const csvContent = [
      ...metadataRows.map((r) => r.join(",")),
      headers.join(","),
      ...dataRows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `recruitment_report_${start}_to_${end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recruitment Reports</h1>
          <p className="text-sm text-muted-foreground">
            Analyze jobs and candidate transitions across the pipeline for a specified time range.
          </p>
        </div>

        {/* Date Filters & Download */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 shadow-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="bg-transparent text-sm font-medium outline-none focus:ring-0"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="bg-transparent text-sm font-medium outline-none focus:ring-0"
            />
          </div>

          <button
            onClick={handleDownloadCsv}
            disabled={jobBreakdown.length === 0 || loading}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 transition hover:opacity-95 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center space-y-2 text-sm text-muted-foreground bg-card rounded-2xl border border-border">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p>Generating recruitment reports...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPIItem
          title="Jobs Posted"
          value={summaryStats.jobs}
          icon={Briefcase}
          colorClass="text-primary bg-primary/10"
        />
        <KPIItem
          title="Total Applications"
          value={summaryStats.applied}
          icon={Users}
          colorClass="text-blue-500 bg-blue-500/10"
        />
        <KPIItem
          title="Total Hired"
          value={summaryStats.hired}
          icon={UserCheck}
          colorClass="text-emerald-500 bg-emerald-500/10"
        />
        <KPIItem
          title="Total Rejected"
          value={summaryStats.rejected}
          icon={UserMinus}
          colorClass="text-destructive bg-destructive/10"
        />
      </div>

      {/* Analytics Visualization */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Funnel Card */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Funnel Conversion (Historical)</h2>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Flow for candidate stage transitions</span>
            </div>
          </div>

          {summaryStats.applied > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="top"
                    fontSize={11}
                    fill="var(--color-muted-foreground)"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] flex-col items-center justify-center text-center">
              <p className="text-sm text-muted-foreground">No applications found in the selected range.</p>
            </div>
          )}
        </div>

        {/* Funnel Table Info / Breakdown */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="mb-4 text-sm font-semibold">Conversion Summary</h2>
            <div className="space-y-4">
              <ConversionRow
                label="Application Volume"
                percentage={summaryStats.applied > 0 ? 100 : 0}
                desc={`${summaryStats.applied} total applicants received`}
              />
              <ConversionRow
                label="Screening Conversion"
                percentage={
                  summaryStats.applied > 0
                    ? Math.round((summaryStats.screened / summaryStats.applied) * 100)
                    : 0
                }
                desc={`${summaryStats.screened} of ${summaryStats.applied} applicants screened`}
              />
              <ConversionRow
                label="Shortlist Rate"
                percentage={
                  summaryStats.applied > 0
                    ? Math.round((summaryStats.shortlisted / summaryStats.applied) * 100)
                    : 0
                }
                desc={`${summaryStats.shortlisted} of ${summaryStats.applied} shortlisted`}
              />
              <ConversionRow
                label="Interview Rate"
                percentage={
                  summaryStats.applied > 0
                    ? Math.round((summaryStats.interviewed / summaryStats.applied) * 100)
                    : 0
                }
                desc={`${summaryStats.interviewed} of ${summaryStats.applied} applicants interviewed`}
              />
              <ConversionRow
                label="Final Review Rate"
                percentage={
                  summaryStats.applied > 0
                    ? Math.round((summaryStats.finalReview / summaryStats.applied) * 100)
                    : 0
                }
                desc={`${summaryStats.finalReview} of ${summaryStats.applied} in final review`}
              />
              <ConversionRow
                label="Offer Rate"
                percentage={
                  summaryStats.applied > 0
                    ? Math.round((summaryStats.offer / summaryStats.applied) * 100)
                    : 0
                }
                desc={`${summaryStats.offer} of ${summaryStats.applied} offered positions`}
              />
              <ConversionRow
                label="Hired Rate (Offer Acceptance)"
                percentage={
                  summaryStats.applied > 0
                    ? Math.round((summaryStats.hired / summaryStats.applied) * 100)
                    : 0
                }
                desc={`${summaryStats.hired} of ${summaryStats.applied} applicants hired`}
              />
              <ConversionRow
                label="Rejection Rate"
                percentage={
                  summaryStats.applied > 0
                    ? Math.round((summaryStats.rejected / summaryStats.applied) * 100)
                    : 0
                }
                desc={`${summaryStats.rejected} of ${summaryStats.applied} applicants rejected`}
              />
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-4 text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Calculations based on user transitions within the filtered period.</span>
          </div>
        </div>
      </div>

      {/* Detailed Jobs Breakdown Table */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Job Funnel Performance</h2>

        <div className="overflow-x-auto">
          {jobBreakdown.length > 0 ? (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Job Title</th>
                  <th className="py-3 px-2">Department</th>
                  <th className="py-3 px-2">Posted</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-center">Applied</th>
                  <th className="py-3 px-2 text-center">Screened</th>
                  <th className="py-3 px-2 text-center">Shortlisted</th>
                  <th className="py-3 px-2 text-center">Interviewed</th>
                  <th className="py-3 px-2 text-center">Final Review</th>
                  <th className="py-3 px-2 text-center">Offered</th>
                  <th className="py-3 px-2 text-center">Hired</th>
                  <th className="py-3 px-2 text-center">Rejected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobBreakdown.map((j) => (
                  <tr key={j.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-foreground">{j.title}</td>
                    <td className="py-3.5 px-2 text-muted-foreground text-xs">{j.department}</td>
                    <td className="py-3.5 px-2 text-muted-foreground text-xs">{j.postedDate}</td>
                    <td className="py-3.5 px-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          j.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : j.status === "Closed"
                              ? "bg-muted text-muted-foreground"
                              : "bg-amber-500/10 text-amber-500"
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-center font-semibold tabular-nums text-blue-500">{j.applied}</td>
                    <td className="py-3.5 px-2 text-center font-semibold tabular-nums text-purple-500">{j.screened}</td>
                    <td className="py-3.5 px-2 text-center font-semibold tabular-nums text-amber-500">{j.shortlisted}</td>
                    <td className="py-3.5 px-2 text-center font-semibold tabular-nums text-indigo-500">{j.interviewed}</td>
                    <td className="py-3.5 px-2 text-center font-semibold tabular-nums text-fuchsia-500">{j.finalReview}</td>
                    <td className="py-3.5 px-2 text-center font-semibold tabular-nums text-teal-500">{j.offer}</td>
                    <td className="py-3.5 px-2 text-center font-semibold tabular-nums text-emerald-500">{j.hired}</td>
                    <td className="py-3.5 px-2 text-center font-semibold tabular-nums text-destructive">{j.rejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No jobs found posted within the selected date range.
            </div>
          )}
        </div>
      </div>
    </>
  )}
</div>
);
}

function KPIItem({
  title,
  value,
  icon: Icon,
  colorClass,
}: {
  title: string;
  value: number;
  icon: any;
  colorClass: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/20">
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">{title}</span>
        <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      </div>
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${colorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

function ConversionRow({
  label,
  percentage,
  desc,
}: {
  label: string;
  percentage: number;
  desc: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-semibold text-primary">{percentage}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-[10px] text-muted-foreground">{desc}</div>
    </div>
  );
}
