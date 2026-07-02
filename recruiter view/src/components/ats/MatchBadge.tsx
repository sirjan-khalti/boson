import { cn } from "@/lib/utils";
import type { MatchTier } from "@/lib/data";
import { Diamond, Award, Circle, X, Clock } from "lucide-react";

const styles: Record<MatchTier, string> = {
  "Strong Fit": "bg-[oklch(0.62_0.18_140)/0.12] text-[oklch(0.4_0.18_140)] ring-[oklch(0.62_0.18_140)/0.3] dark:text-[oklch(0.78_0.16_140)]",
  "Moderate Fit": "bg-[oklch(0.78_0.16_80)/0.15] text-[oklch(0.5_0.15_80)] ring-[oklch(0.78_0.16_80)/0.35] dark:text-[oklch(0.85_0.16_80)]",
  "Weak Fit": "bg-destructive/10 text-destructive ring-destructive/30",
};

const icons: Record<MatchTier, React.ElementType> = {
  "Strong Fit": Award,
  "Moderate Fit": Diamond,
  "Weak Fit": X,
};

const KNOWN_TIERS: MatchTier[] = ["Strong Fit", "Moderate Fit", "Weak Fit"];

export function MatchBadge({ tier, className }: { tier?: string | null; className?: string }) {
  if (!tier || !(KNOWN_TIERS as string[]).includes(tier)) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground ring-1 ring-inset ring-border",
          className,
        )}
      >
        <Clock className="h-3 w-3" />
        {tier || "Pending"}
      </span>
    );
  }

  const knownTier = tier as MatchTier;
  const Icon = icons[knownTier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ring-1 ring-inset",
        styles[knownTier],
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {knownTier}
    </span>
  );
}

export function MatchScore({ score }: { score: number }) {
  const color =
    score >= 88 ? "text-[oklch(0.45_0.18_230)] dark:text-[oklch(0.78_0.16_230)]"
    : score >= 75 ? "text-[oklch(0.5_0.15_80)] dark:text-[oklch(0.85_0.16_80)]"
    : score >= 55 ? "text-muted-foreground"
    : "text-destructive";
  return <span className={cn("font-semibold tabular-nums", color)}>{score}%</span>;
}
