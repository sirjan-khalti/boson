import { Link } from "react-router-dom";

export function KhaltiLogo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2 ${className}`}>
      <img src="/Full Logo.png" alt="Khalti Logo" className="h-8 object-contain" />
      <div className="leading-tight border-l border-border pl-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Careers</div>
      </div>
    </Link>
  );
}
