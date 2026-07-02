import { Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import LoginPage from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import CandidatesPage from "@/pages/Candidates";
import CandidateDetail from "@/pages/CandidateDetail";
import JobsPage from "@/pages/Jobs";
import PipelinePage from "@/pages/Pipeline";
import ActivityLogsPage from "@/pages/ActivityLogs";
import UploadCvPage from "@/pages/UploadCv";
import TeamPage from "@/pages/Team";
import ReportsPage from "@/pages/Reports";
import EvaluationsPage from "@/pages/Evaluations";

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <a href="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95">
          Go home
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/candidates" element={<CandidatesPage />} />
        <Route path="/candidates/:candidateId" element={<CandidateDetail />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/activity-logs" element={<ActivityLogsPage />} />
        <Route path="/upload-cv" element={<UploadCvPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/evaluations" element={<EvaluationsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
