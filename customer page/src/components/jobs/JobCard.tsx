import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowUpRight, MapPin, Clock, Briefcase } from "lucide-react";
import type { Job } from "@/types";

export function JobCard({ job }: { job: any }) {
  const summaryText = job.summary || (job.description ? job.description.slice(0, 120) + "..." : "") || job.title;
  return (
    <Card className="group flex flex-col gap-5 rounded-2xl border-border/70 p-6 transition-all hover:border-khalti/40 hover:shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge variant="secondary" className="rounded-full bg-accent text-khalti">
            {job.department}
          </Badge>
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground hover:text-khalti transition-colors">
            <Link to={`/jobs/${job.id}`}>
              {job.title}
            </Link>
          </h3>
        </div>
        <Link
          to={`/jobs/${job.id}`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-foreground/70 transition-all group-hover:bg-khalti group-hover:text-khalti-foreground group-hover:border-khalti"
          aria-label={`View ${job.title}`}
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">{summaryText}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{job.employmentType || job.type}</span>
        <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
        {job.experience && <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{job.experience}</span>}
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-4">
        <span className="text-xs text-muted-foreground">Posted {job.postedAt || new Date(job.posted_date || Date.now()).toLocaleDateString()}</span>
        <Button asChild size="sm" className="bg-khalti text-khalti-foreground hover:bg-khalti/90">
          <Link to={`/jobs/${job.id}`}>
            View details
          </Link>
        </Button>
      </div>
    </Card>
  );
}
