import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useMemo, useEffect, useState } from "react";
import {
  DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Mail } from "lucide-react";
import { motion } from "framer-motion";
import { type Candidate, type CandidateStage } from "@/lib/data";
import { Avatar } from "@/components/ats/Avatar";
import { MatchBadge } from "@/components/ats/MatchBadge";
import { useAts } from "@/lib/store";
import { api } from "@/lib/api";

const STAGES: CandidateStage[] = [
  "Applied", "Screening", "Shortlisted", "Interview", "Final Review", "Offer", "Hired", "Rejected",
];

export default function PipelinePage() {
  const seed = useAts((s) => s.candidates);
  const jobs = useAts((s) => s.jobs);
  const updateCandidateStage = useAts((s) => s.updateCandidateStage);
  const fetchJobs = useAts((s) => s.fetchJobs);
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("jobId") ?? undefined;
  const navigate = useNavigate();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (jobs.length === 0) {
      fetchJobs();
    }
  }, [jobs.length, fetchJobs]);

  useEffect(() => {
    let active = true;
    const loadCandidates = async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const res = await api.getCandidates({ jobId, page: 1, size: 1000 });
        if (active) {
          useAts.setState({ candidates: res.items });
        }
      } catch (err) {
        console.error("Failed to fetch candidates for pipeline", err);
      } finally {
        if (active && showLoading) setLoading(false);
      }
    };

    loadCandidates(true);

    const interval = setInterval(() => {
      loadCandidates(false);
    }, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [jobId]);

  const pipelineJobs = useMemo(() => {
    return jobs.filter((j) => j.status === "Active" || j.id === jobId);
  }, [jobs, jobId]);

  const selectedJob = jobId ? jobs.find((j) => j.id === jobId) : null;

  const visible = useMemo(
    () => {
      if (jobId) {
        return seed.filter((c) => c.job_id === jobId);
      }
      return seed.filter((c) => {
        const job = jobs.find((j) => j.id === c.job_id);
        return job?.status === "Active";
      });
    },
    [seed, jobId, jobs],
  );

  const grouped = useMemo(() => {
    const g: Record<CandidateStage, Candidate[]> = {
      Applied: [], Screening: [], Shortlisted: [], Interview: [],
      "Final Review": [], Offer: [], Hired: [], Rejected: [],
    };
    visible.forEach((c) => {
      let s: string = c.stage;
      if (s === "Interviewing") s = "Interview";
      if (s === "Final Review") s = "Final Review";
      if (!g[s as CandidateStage]) {
        s = "Applied";
      }
      g[s as CandidateStage].push(c);
    });
    return g;
  }, [visible]);

  const onDragEnd = (e: DragEndEvent) => {
    const id = String(e.active.id);
    const newStage = e.over?.id as CandidateStage | undefined;
    if (!newStage) return;
    updateCandidateStage(id, newStage);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Hiring Pipeline {selectedJob && <span className="text-muted-foreground font-normal">· {selectedJob.title}</span>}
          </h1>
          <p className="text-sm text-muted-foreground">
            Drag candidates across stages. Rejected matches are auto-placed in the Rejected column.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Job</label>
          <select
            value={jobId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              navigate(v ? `/pipeline?jobId=${v}` : `/pipeline`);
            }}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="">All jobs</option>
            {pipelineJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}{j.status === "Closed" ? " (Closed)" : ""}
              </option>
            ))}
          </select>
          {jobId && (
            <Link to={`/candidates?jobId=${jobId}`} className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs">
              View candidates
            </Link>
          )}
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {STAGES.map((stage) => (
            <Column key={stage} stage={stage} cards={grouped[stage]} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function Column({ stage, cards }: { stage: CandidateStage; cards: Candidate[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const isRejected = stage === "Rejected";
  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-card transition ${
        isOver ? "border-primary/50 ring-2 ring-primary/20" : isRejected ? "border-destructive/30" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5 group">
        <div className="flex items-center gap-2">
          <div className={`text-sm font-semibold ${isRejected ? "text-destructive" : ""}`}>{stage}</div>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">{cards.length}</span>
        </div>
        {cards.length > 0 && (
          <a
            href={`mailto:${cards.map(c => c.email).join(",")}`}
            className="text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
            title={`Email all in ${stage}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      <div className="flex-1 space-y-2 p-2 min-h-[120px]">
        {cards.map((c) => <Card key={c.id} c={c} />)}
        {cards.length === 0 && <div className="rounded-lg border border-dashed border-border py-6 text-center text-[11px] text-muted-foreground">Drop here</div>}
      </div>
    </div>
  );
}

function Card({ c }: { c: Candidate }) {
  const openCandidate = useAts((s) => s.openCandidate);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: c.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <motion.div
      layout
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          openCandidate(c.id);
        }
      }}
      className={`cursor-pointer rounded-xl border border-border bg-background p-3 shadow-sm transition active:cursor-grabbing ${
        isDragging ? "opacity-60 shadow-lg" : "hover:border-primary/40"
      }`}
    >
      <div className="flex items-center gap-2">
        <Avatar name={c.name} size={28} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{c.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">{c.title}</div>
        </div>
        <span className="text-xs font-semibold tabular-nums">{c.match_score}%</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <MatchBadge tier={c.tier} />
        <div className="flex items-center gap-2">
          <a
            href={`mailto:${c.email}`}
            className="text-muted-foreground hover:text-primary transition-colors"
            title={`Email ${c.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="h-3.5 w-3.5" />
          </a>
          <span className="text-[10px] text-muted-foreground">{c.experience}y</span>
        </div>
      </div>
      {c.notes[0] && (
        <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">"{c.notes[0].content}"</p>
      )}
    </motion.div>
  );
}
