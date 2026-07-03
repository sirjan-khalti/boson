import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { API_BASE } from "@/lib/constants";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 text-[15px] leading-relaxed text-foreground/85">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i} className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-khalti" />
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/jobs/fetch`)
      .then((res) => { if (!res.ok) throw new Error("Failed to fetch jobs"); return res.json(); })
      .then((jobs) => {
        const found = jobs.find((j: any) => j.id === jobId);
        if (!found || found.status !== "Active") { navigate("/jobs", { replace: true }); return; }
        setJob(found);
        setAllJobs(jobs);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [jobId, navigate]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="text-muted-foreground">Loading role...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-xl font-semibold">Couldn't load this role</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-6">
          Try again
        </Button>
      </div>
    );
  }

  if (!job) return null;

  const related = allJobs.filter((j: any) => j.id !== job.id && j.department === job.department && j.status === "Active").slice(0, 2);

  return (
    <div>
      {/* Header */}
      <section className="border-b border-border/60 bg-secondary/30">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-6 text-muted-foreground">
            <Link to="/jobs"><ArrowLeft className="mr-1.5 h-4 w-4" /> All roles</Link>
          </Button>
          <Badge variant="secondary" className="rounded-full bg-white text-khalti">
            {job.department}
          </Badge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{job.title}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{job.summary || job.title}</p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> {job.employmentType || job.type}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {job.location}</span>
            {job.experience && <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {job.experience}</span>}
            {job.salaryRange && <span className="inline-flex items-center gap-1.5"><Wallet className="h-4 w-4" /> {job.salaryRange}</span>}
            <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4" /> Posted {job.postedAt || new Date(job.posted_date || Date.now()).toLocaleDateString()}</span>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto grid max-w-5xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <div className="space-y-10">
          {job.description ? (
            <Section title="Job Description">
              <div className="whitespace-pre-line">{job.description}</div>
            </Section>
          ) : (
            <>
              <Section title="About the Role"><p>{job.about}</p></Section>
              <Section title="Key Responsibilities"><BulletList items={job.responsibilities || []} /></Section>
              <Section title="Required Skills & Qualifications"><BulletList items={job.requirements || []} /></Section>
              <Section title="Nice to Have"><BulletList items={job.niceToHave || []} /></Section>
              <Section title="What Khalti Offers"><BulletList items={job.offers || []} /></Section>
            </>
          )}

          {related.length > 0 && (
            <div className="border-t border-border pt-10">
              <h2 className="text-xl font-semibold">Similar roles</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    to={`/jobs/${r.id}`}
                    className="group rounded-2xl border border-border/70 bg-white p-5 transition-all hover:border-khalti/40 hover:shadow-soft"
                  >
                    <div className="text-xs text-muted-foreground">{r.department}</div>
                    <div className="mt-1 font-semibold group-hover:text-khalti">{r.title}</div>
                    <div className="mt-2 text-sm text-muted-foreground line-clamp-2">{r.summary}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky apply card */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="rounded-2xl border-border/70 p-6 shadow-soft">
            <div className="flex items-center gap-2 text-khalti">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Apply now</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold">Ready to join Khalti?</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Upload your resume and we'll help you fill in the rest. Should take just a few minutes.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-5 w-full bg-khalti text-khalti-foreground hover:bg-khalti/90"
            >
              <Link to={`/apply/${job.id}`}>
                Apply for this role <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <div className="mt-5 space-y-2 text-xs text-muted-foreground">
              <div>📄 PDF • up to 10 MB</div>
              <div>⏱ ~3 minutes to apply</div>
              <div>💬 Human-reviewed by our team</div>
            </div>
          </Card>
        </aside>
      </section>

      {/* Mobile sticky bar */}
      <div className="sticky bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
        <Button asChild size="lg" className="w-full bg-khalti text-khalti-foreground hover:bg-khalti/90">
          <Link to={`/apply/${job.id}`}>
            Apply for this role
          </Link>
        </Button>
      </div>
    </div>
  );
}
