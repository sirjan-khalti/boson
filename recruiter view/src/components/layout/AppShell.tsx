import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Briefcase, Users, KanbanSquare, BarChart3, Shield,
  LogOut, Plus, FileSpreadsheet,
  History, KeyRound, FileUp, Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ats/Avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useAts } from "@/lib/store";
import { CandidateModal } from "@/components/ats/CandidateModal";
import { CreateJobModal } from "@/components/ats/CreateJobModal";
import { JobModal } from "@/components/ats/JobModal";
import { ChangePasswordModal } from "@/components/ats/ChangePasswordModal";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

function KhaltiLogo() {
  return (
    <div className="flex items-center gap-2">
      <img src="/Full Logo.png" alt="Khalti Logo" className="h-8 object-contain" />
      <div className="leading-tight border-l border-border pl-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Recruiter</div>
      </div>
    </div>
  );
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, isAuthenticated, isAdmin, isSuperAdmin, logout } = useAuth();
  const openCreateJob = useAts((s) => s.openCreateJob);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  // Client-side mount flag avoids SSR/hydration mismatches when reading auth from localStorage.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (mounted && !loading && !isAuthenticated) navigate("/login");
  }, [mounted, loading, isAuthenticated, navigate]);

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const showUploadCv = user?.role !== "VIEWER";

  const section1: NavItem[] = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ...(showUploadCv ? [{ to: "/upload-cv", label: "Upload CV", icon: FileUp }] : []),
  ];

  const section2: NavItem[] = [
    { to: "/jobs", label: "Jobs", icon: Briefcase },
    { to: "/candidates", label: "Candidates", icon: Users },
    { to: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  ];

  const section3: NavItem[] = [
    { to: "/reports", label: "Reports", icon: FileSpreadsheet },
    ...(isAdmin ? [
      { to: "/team", label: "Team", icon: Shield },
      { to: "/activity-logs", label: "Activity Logs", icon: History },
    ] : []),
    ...(isSuperAdmin ? [
      { to: "/evaluations", label: "AI Evaluations", icon: Sparkles },
    ] : []),
  ];

  const displayName = user?.name ?? "Guest";
  const displayRole = user?.role ?? "Not signed in";

  if (!mounted || loading || !isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.to, item.exact);
    const Icon = item.icon;
    return (
      <Link
        key={item.to}
        to={item.to}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        )}
      >
        {active && (
          <motion.span
            layoutId="nav-pill"
            className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <Icon className="h-4 w-4" />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground sticky top-0 h-screen">
        <div className="px-4 py-4">
          <KhaltiLogo />
        </div>
        <div className="px-3 pb-2">
          {isAdmin && (
            <button
              onClick={openCreateJob}
              className="group flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/30 transition hover:opacity-95"
            >
              <Plus className="h-4 w-4" /> New Job
            </button>
          )}
        </div>
        <nav className="flex-1 space-y-6 px-2 py-4 overflow-y-auto">
          {/* Section 1 */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Overview
            </div>
            <div className="space-y-0.5">
              {section1.map(renderNavItem)}
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Recruitment
            </div>
            <div className="space-y-0.5">
              {section2.map(renderNavItem)}
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Management & Reports
            </div>
            <div className="space-y-0.5">
              {section3.map(renderNavItem)}
            </div>
          </div>
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <Avatar name={displayName} size={32} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium">{displayName}</div>
              <div className="truncate text-[11px] text-muted-foreground">{displayRole}</div>
            </div>
            <button
              onClick={() => setChangePasswordOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              title="Change Password"
            >
              <KeyRound className="h-4 w-4" />
            </button>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>

      <CandidateModal />
      <CreateJobModal />
      <JobModal />
      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </div>
  );
}
