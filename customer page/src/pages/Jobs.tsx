import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobCard } from "@/components/jobs/JobCard";
import { API_BASE } from "@/lib/constants";

export default function JobsPage() {
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [dept, setDept] = useState<string>("all");
  const [exp, setExp] = useState<string>("all");
  const [loc, setLoc] = useState<string>("all");

  const [jobsList, setJobsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/jobs/fetch`)
      .then((res) => res.json())
      .then((data) => {
        setJobsList(data.filter((j: any) => j.status === "Active"));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load jobs", err);
        setLoading(false);
      });
  }, []);

  const locationsList = useMemo(() => {
    const s = new Set<string>();
    for (const j of jobsList) {
      if (j.location) s.add(j.location);
    }
    return Array.from(s);
  }, [jobsList]);

  const departmentsList = useMemo(() => {
    const s = new Set<string>();
    for (const j of jobsList) {
      if (j.department) s.add(j.department);
    }
    return Array.from(s);
  }, [jobsList]);

  const experienceLevelsList = useMemo(() => {
    const s = new Set<string>();
    for (const j of jobsList) {
      if (j.experienceLevel) s.add(j.experienceLevel);
    }
    const arr = Array.from(s);
    return arr.length > 0 ? arr : ["Entry", "Mid", "Senior", "Lead"];
  }, [jobsList]);

  const filtered = useMemo(() => {
    return jobsList.filter((j) => {
      const matchesQ =
        !q ||
        j.title.toLowerCase().includes(q.toLowerCase()) ||
        (j.summary || "").toLowerCase().includes(q.toLowerCase()) ||
        (j.description || "").toLowerCase().includes(q.toLowerCase());
      const matchesDept = dept === "all" || j.department === dept;
      const matchesExp = exp === "all" || j.experienceLevel === exp;
      const matchesLoc = loc === "all" || j.location === loc;
      return matchesQ && matchesDept && matchesExp && matchesLoc;
    });
  }, [jobsList, q, dept, exp, loc]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const j of filtered) {
      const deptName = j.department || "Other";
      if (!map.has(deptName)) map.set(deptName, []);
      map.get(deptName)!.push(j);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <div className="text-muted-foreground">Loading open positions...</div>
      </div>
    );
  }

  return (
    <div className="bg-secondary/30">
      <section className="border-b border-border/60 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <Badge variant="secondary" className="rounded-full bg-accent text-khalti">
            Open roles
          </Badge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Find a role that fits
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {jobsList.length} open positions across Khalti. Filter by department, experience or
            location.
          </p>

          <div className="mt-8 grid gap-3 rounded-2xl border border-border bg-white p-3 shadow-soft md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="flex items-center gap-2 rounded-xl border border-border px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by title or keyword"
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
            </div>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departmentsList.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={exp} onValueChange={setExp}>
              <SelectTrigger><SelectValue placeholder="Experience" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All experience</SelectItem>
                {experienceLevelsList.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={loc} onValueChange={setLoc}>
              <SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locationsList.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {grouped.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white p-16 text-center">
            <SlidersHorizontal className="mx-auto h-6 w-6 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No roles match your filters</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try clearing a filter or searching for something else.
            </p>
          </div>
        ) : (
          <div className="space-y-14">
            {grouped.map(([deptName, items]) => (
              <div key={deptName}>
                <div className="mb-5 flex items-baseline justify-between">
                  <h2 className="text-xl font-semibold tracking-tight">{deptName}</h2>
                  <span className="text-sm text-muted-foreground">{items.length} open</span>
                </div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((j) => <JobCard key={j.id} job={j} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
