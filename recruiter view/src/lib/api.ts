import { API_BASE } from "@/lib/config";
import type { Job, Candidate } from "@/lib/data";
import { getToken } from "./auth";

const activeGetRequests = new Map<string, Promise<any>>();

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const method = opts.method || "GET";
  const cacheKey = `${method}:${path}`;

  if (method === "GET") {
    const active = activeGetRequests.get(cacheKey);
    if (active) {
      return active;
    }
  }

  const promise = (async () => {
    const headers: Record<string, string> = {
      ...(opts.headers as Record<string, string>),
    };
    if (!(opts.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, { 
      ...opts, 
      headers,
      credentials: "include"
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "API request failed");
    }
    return res.json();
  })();

  if (method === "GET") {
    activeGetRequests.set(cacheKey, promise);
    promise.finally(() => {
      activeGetRequests.delete(cacheKey);
    });
  }

  return promise;
}

export const api = {
  // Jobs
  getJobs: () => apiFetch<Job[]>("/jobs/fetch"),
  getActiveJobs: () => apiFetch<Job[]>("/jobs/active"),
  getClosedJobs: () => apiFetch<Job[]>("/jobs/closed"),
  getArchivedJobs: () => apiFetch<Job[]>("/jobs/archived"),
  createJob: (data: Partial<Job>) =>
    apiFetch<Job>("/jobs/create", { method: "POST", body: JSON.stringify(data) }),
  updateJobStatus: (id: string, status: string) =>
    apiFetch<Job>(`/jobs/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),

  // Candidates
  getCandidates: (params?: Record<string, any>) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          query.append(k, String(v));
        }
      });
    }
    const queryString = query.toString();
    return apiFetch<any>(`/candidates/fetch${queryString ? `?${queryString}` : ""}`);
  },
  getCandidateById: (id: string) =>
    apiFetch<Candidate>(`/candidates/${id}`),
  getCandidateFilterOptions: () =>
    apiFetch<{ stages: string[]; tiers: string[]; sources: string[] }>("/candidates/filters"),
  submitCandidate: (data: Partial<Candidate>) =>
    apiFetch<Candidate>("/candidates/submit", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  parseCv: async (file: File): Promise<Partial<Candidate>> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_BASE}/candidates/parse`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    if (!res.ok) throw new Error("CV parse failed");
    return res.json();
  },
  updateCandidateStage: (id: string, stage: string) =>
    apiFetch<Candidate>(`/candidates/${id}/stage`, {
      method: "POST",
      body: JSON.stringify({ stage }),
    }),
  addCandidateNote: (id: string, content: string) =>
    apiFetch<Candidate>(`/candidates/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  getReports: (start: string, end: string) =>
    apiFetch<{
      summaryStats: {
        jobs: number;
        applied: number;
        screened: number;
        shortlisted: number;
        interviewed: number;
        finalReview: number;
        offer: number;
        hired: number;
        rejected: number;
      };
      jobBreakdown: Array<{
        id: string;
        title: string;
        department: string;
        status: string;
        postedDate: string;
        applied: number;
        screened: number;
        shortlisted: number;
        interviewed: number;
        finalReview: number;
        offer: number;
        hired: number;
        rejected: number;
      }>;
    }>(`/candidates/reports?start=${start}&end=${end}`),

  // Evaluations (SUPERADMIN only)
  getEvaluations: (params: { page: number; size: number; date_range: string; job_scope: string }) => {
    const query = new URLSearchParams({
      page: String(params.page),
      size: String(params.size),
      date_range: params.date_range,
      job_scope: params.job_scope,
    });
    return apiFetch<{
      items: Candidate[];
      total: number;
      page: number;
      size: number;
      pages: number;
    }>(`/evaluations/fetch?${query.toString()}`);
  },
  retryEvaluation: (candidateId: string) =>
    apiFetch<Candidate>(`/evaluations/${candidateId}/retry`, { method: "POST" }),
  retryAllFailedEvaluations: (params: { date_range: string; job_scope: string }) => {
    const query = new URLSearchParams(params);
    return apiFetch<{ queued: number }>(`/evaluations/retry-failed?${query.toString()}`, {
      method: "POST",
    });
  },
};
