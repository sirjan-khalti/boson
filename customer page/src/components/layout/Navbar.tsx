import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KhaltiLogo } from "./KhaltiLogo";

const links = [
  { to: "/", label: "Careers" },
  { to: "/jobs", label: "Departments" },
  { to: "/#life", label: "Life at Khalti" },
  { to: "/#about", label: "About" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <KhaltiLogo />
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.to + l.label}
              to={l.to}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-khalti"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block">
          <Button asChild className="bg-khalti text-khalti-foreground hover:bg-khalti/90">
            <Link to="/jobs">Explore Jobs</Link>
          </Button>
        </div>
        <button
          aria-label="Toggle menu"
          className="md:hidden rounded-md p-2 text-foreground/80 hover:bg-secondary"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {links.map((l) => (
              <Link
                key={l.to + l.label}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
              >
                {l.label}
              </Link>
            ))}
            <Button asChild className="mt-2 bg-khalti text-khalti-foreground hover:bg-khalti/90">
              <Link to="/jobs" onClick={() => setOpen(false)}>
                Explore Jobs
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
