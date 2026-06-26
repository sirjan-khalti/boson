import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import {
  ArrowRight,
  Search,
  Code2,
  ShieldCheck,
  Megaphone,
  Headphones,
  Settings2,
  Sparkles,
  Heart,
  Rocket,
  Users,
  Globe2,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { departments, API_BASE } from "@/lib/constants";
import { JobCard } from "@/components/jobs/JobCard";

const iconMap = {
  Code2,
  ShieldCheck,
  Megaphone,
  Headphones,
  Settings2,
} as const;

export default function Landing() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [jobsList, setJobsList] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/jobs/fetch`)
      .then((res) => res.json())
      .then((data) => setJobsList(data.filter((j: any) => j.status === "Active")))
      .catch((err) => console.error("Failed to fetch jobs", err));
  }, []);

  const dynamicDepartments = useMemo(() => {
    if (jobsList.length === 0) {
      return departments.map(d => ({
        name: d.name,
        description: d.description,
        icon: d.icon,
        openings: d.openings
      }));
    }

    const deptNames = Array.from(new Set(jobsList.map((j) => j.department))).filter(Boolean);

    const predefinedMetadata: Record<string, { description: string; icon: string }> = {
      "Product & Technology": {
        description: "Engineers, designers and PMs building Nepal's payments rail.",
        icon: "Code2",
      },
      "Risk & Compliance": {
        description: "Keeping millions of transactions secure and trusted every day.",
        icon: "ShieldCheck",
      },
      "Brand & Marketing": {
        description: "Telling the Khalti story and growing our community.",
        icon: "Megaphone",
      },
      "Customer Support": {
        description: "Helping users and merchants get the most out of Khalti.",
        icon: "Headphones",
      },
      "Operations": {
        description: "Running the engine that powers reliable fintech experiences.",
        icon: "Settings2",
      },
    };

    return deptNames.map((name) => {
      let meta = predefinedMetadata[name];
      if (!meta) {
        const lowerName = name.toLowerCase();
        const matchedKey = Object.keys(predefinedMetadata).find(
          (k) => k.toLowerCase() === lowerName
        );
        if (matchedKey) {
          meta = predefinedMetadata[matchedKey];
        }
      }

      const description = meta?.description || `Join the ${name} team to build Nepal's digital payment ecosystem.`;
      let icon = meta?.icon || "Settings2";

      if (!meta) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes("tech") || lowerName.includes("eng") || lowerName.includes("product") || lowerName.includes("develop")) {
          icon = "Code2";
        } else if (lowerName.includes("risk") || lowerName.includes("compli") || lowerName.includes("legal") || lowerName.includes("secur")) {
          icon = "ShieldCheck";
        } else if (lowerName.includes("market") || lowerName.includes("brand") || lowerName.includes("sale") || lowerName.includes("pr")) {
          icon = "Megaphone";
        } else if (lowerName.includes("support") || lowerName.includes("custom") || lowerName.includes("help") || lowerName.includes("care")) {
          icon = "Headphones";
        } else {
          icon = "Settings2";
        }
      }

      const openings = jobsList.filter((j) => j.department === name).length;

      return {
        name,
        description,
        icon,
        openings,
      };
    });
  }, [jobsList]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/jobs?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="flex flex-col">
      {/* HERO */}
      <section className="relative overflow-hidden hero-gradient">
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="secondary"
              className="mb-6 rounded-full border border-khalti/15 bg-white px-4 py-1.5 text-khalti shadow-soft"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              We're hiring across {jobsList.length > 0 ? Array.from(new Set(jobsList.map((j) => j.department))).filter(Boolean).length : 5} departments
            </Badge>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Build Nepal's{" "}
              <span className="text-gradient-khalti">Digital Future</span> with Khalti
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              Join the team shaping the future of digital payments and financial technology in
              Nepal.
            </p>

            <form
              onSubmit={onSearch}
              className="mx-auto mt-10 flex max-w-xl items-center gap-2 rounded-2xl border border-border bg-white p-2 shadow-soft"
            >
              <div className="flex flex-1 items-center gap-2 px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search roles, e.g. Python Developer"
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
              </div>
              <Button type="submit" className="bg-khalti text-khalti-foreground hover:bg-khalti/90">
                Search
              </Button>
            </form>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-khalti text-khalti-foreground hover:bg-khalti/90 shadow-elevated"
              >
                <Link to="/jobs">
                  Explore Jobs <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <a href="#departments">Browse departments</a>
              </Button>
            </div>
          </div>

          {/* stats strip */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { k: "10M+", v: "Users" },
              { k: "250K+", v: "Merchants" },
              {
                k: jobsList.length > 0
                  ? String(Array.from(new Set(jobsList.map((j) => j.department))).filter(Boolean).length)
                  : "5",
                v: "Departments",
              },
              { k: jobsList.length > 0 ? String(jobsList.length) : "22", v: "Open Roles" },
            ].map((s) => (
              <div
                key={s.v}
                className="rounded-2xl border border-border/70 bg-white/80 p-5 text-center shadow-soft backdrop-blur"
              >
                <div className="text-2xl font-bold text-foreground">{s.k}</div>
                <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPARTMENTS */}
      <section id="departments" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Badge variant="secondary" className="rounded-full bg-accent text-khalti">
              Departments
            </Badge>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Find your team
            </h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              From engineers to risk analysts — explore the teams building Nepal's fintech.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/jobs">View all openings <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {dynamicDepartments.map((d) => {
            const Icon = iconMap[d.icon as keyof typeof iconMap] || Settings2;
            return (
              <Link key={d.name} to="/jobs" className="group">
                <Card className="relative h-full overflow-hidden rounded-2xl border-border/70 p-6 transition-all hover:border-khalti/40 hover:shadow-soft">
                  <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-accent text-khalti transition-colors group-hover:bg-khalti group-hover:text-khalti-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">{d.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{d.description}</p>
                  <div className="mt-6 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{d.openings} open roles</span>
                    <span className="inline-flex items-center gap-1 font-medium text-khalti">
                      Explore <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* FEATURED JOBS */}
      <section className="bg-secondary/40 py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <Badge variant="secondary" className="rounded-full bg-white text-khalti">
                Featured roles
              </Badge>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Open positions
              </h2>
            </div>
            <Button asChild variant="ghost" className="text-khalti hover:text-khalti">
              <Link to="/jobs">See all <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {jobsList.slice(0, 3).map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        </div>
      </section>

      {/* WHY JOIN */}
      <section id="life" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge variant="secondary" className="rounded-full bg-accent text-khalti">
            Why Khalti
          </Badge>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Work that moves the country forward
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every line of code, every policy decision, every conversation with a merchant adds up
            to a more connected Nepal.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Rocket, title: "Real impact", desc: "Ship products used by millions across Nepal every day." },
            { icon: Heart, title: "Care for people", desc: "Health insurance, generous leave and family-first policies." },
            { icon: GraduationCap, title: "Always learning", desc: "Annual learning budget, conferences and internal guilds." },
            { icon: Users, title: "Great teammates", desc: "Friendly, ambitious folks who lift each other up." },
          ].map((b) => (
            <Card key={b.title} className="rounded-2xl border-border/70 p-6">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-khalti/10 text-khalti">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{b.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{b.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CULTURE / CTA */}
      <section id="about" className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-navy p-10 text-white sm:p-16">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge variant="secondary" className="rounded-full bg-white/10 text-white">
                <Globe2 className="mr-1.5 h-3.5 w-3.5" /> Life at Khalti
              </Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                A culture built on trust, craft and curiosity
              </h2>
              <p className="mt-4 text-white/75">
                We move fast but we're never careless — because real money and real people are on
                the other side of every release. We celebrate small wins, debate the hard calls,
                and look out for one another.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-khalti text-khalti-foreground hover:bg-khalti/90">
                  <Link to="/jobs">See open roles <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <a href="mailto:careers@khalti.com">Talk to recruiting</a>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { t: "Hybrid working", d: "Office + remote balance" },
                { t: "Wellness budget", d: "For gym, yoga, therapy" },
                { t: "Parental leave", d: "Generous for all parents" },
                { t: "Stock & bonus", d: "Share in our growth" },
              ].map((p) => (
                <div key={p.t} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                  <div className="font-semibold">{p.t}</div>
                  <div className="mt-1 text-sm text-white/70">{p.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
