# Boson v1

Full-stack AI-powered Applicant Tracking System (ATS) for Khalti Careers.
End-to-end recruitment platform built with FastAPI, React (TanStack Start),
PostgreSQL, and Groq LLM — containerized with Docker Compose.

---

## 🧠 AI-Powered Candidate Evaluation Engine

- LLM-driven candidate-to-job matching using Groq (Llama 3.3 70B Versatile)
  with structured JSON output and weighted multi-criteria scoring
- 7-dimension scoring rubric: Relevant Experience (25%), Years of Experience
  (20%), Education & Qualifications (15%), Trainings & Certifications (15%),
  Technical Knowledge (10%), Leadership & Strategic Ability (10%),
  Communication & Soft Skills (5%)
- Automatic tier classification (Strong Match / Good Match / Potential Match /
  Below Threshold) derived from composite weighted score
- Per-criterion reasoning with strengths/weaknesses extraction
- One-sentence executive summary generation per candidate
- Background task processing — evaluation runs asynchronously via FastAPI
  BackgroundTasks with isolated database sessions, returning instant HTTP
  responses to applicants while LLM scoring completes in ~5-15 seconds

## 📄 Intelligent CV Parsing & Form Pre-fill

- PDF upload with AI-powered structured data extraction via Groq LLM
- Extracts: personal info, professional summary, work history, education,
  projects, certifications, languages, achievements, awards, publications,
  and candidate preferences into a normalized JSON schema
- PyMuPDF (fitz) for PDF text extraction with thread-pool execution to
  avoid blocking the ASGI event loop
- Parsed CV data auto-populates the multi-section application form with
  visual highlighting of pre-filled fields
- Google reCAPTCHA Enterprise verification on parse and submit endpoints
- File upload security: 10MB size limit, PDF-only extension whitelist,
  UUID-randomized filenames to prevent path traversal

## 🏢 Customer-Facing Careers Portal (TanStack Start + React)

- Public job listing page with search, department/type/location filtering
- Individual job detail pages with full description rendering
- 7-section structured application form:
  - Personal information (name, email, phone, address, LinkedIn/GitHub)
  - Professional summary (experience, salary, notice period, work auth)
  - Skills management with tag-based input
  - Work experience entries (company, title, type, dates, technologies)
  - Education history (degree, field, institution, dates, GPA)
  - Projects portfolio (name, description, tech stack, URLs)
  - Certifications (name, issuer, date)
  - Achievements & Awards (dynamic lists)
  - Custom fields (key-value pairs for additional attributes)
- Client-side form validation with inline error messages
- CV upload → AI parse → form pre-fill workflow with highlighted fields
- Stable React rendering keys using client-side UUID generation for all
  dynamic list items (experience, education, projects, certs, achievements,
  awards, custom fields) — prevents state corruption on item deletion
- Responsive design with Tailwind CSS, dark mode support, glassmorphism
  cards, and smooth animations via Framer Motion
- Post-submission success page with application reference

## 🎯 Recruiter Dashboard (TanStack Start + React + Zustand)

### Dashboard Home
- KPI stat cards: Active Jobs, Total Candidates, Interviews, Hired, Avg Match
- Stacked bar chart: Applications per Job with per-stage breakdown
  (Applied → Screening → Shortlisted → Interview → Offer → Hired → Rejected)
- Horizontal funnel chart: Historical hiring pipeline visualization
- Recent applications table with avatar, role, match score, and stage chip
- High-match candidates leaderboard with tier badges

### Candidates Management
- Server-side paginated candidate table with configurable page sizes
- Multi-column sortable headers (name, match, experience, stage, date)
- Full-text search by name and skills with debounced queries
- Range slider filters for minimum match score and experience years
- Stage filter chips and tier filter dropdowns
- Cross-page checkbox selection preserved across pagination
- Bulk actions on selected candidates
- Inline stage chips with color-coded pipeline stages

### Candidate Detail View
- Full candidate profile with personal info, contact, and links
- AI evaluation results: match score gauge, tier badge, summary
- Per-criterion score breakdown with weight, score, and reasoning
- Strengths and weaknesses list
- Work history timeline with company, role, dates, and technologies
- Education history with degree, institution, and dates
- Projects portfolio with tech stacks and URLs
- Certifications and achievements lists
- Skills tag cloud
- Notes system: add timestamped recruiter notes per candidate
- Stage management: advance or move candidates through pipeline stages
  (Applied → Screening → Shortlisted → Interview → Offer → Hired / Rejected)
- Stage history timeline showing progression
- CV download link
- JSON profile export with structured candidate data

### Jobs Management
- Job listing with status indicators (Active/Closed)
- Create new job form: title, department, location, type, description, skills
- Job status toggle (Active ↔ Closed) with Pydantic-validated status updates
- Per-job applicant count with atomic database increment
- Job detail modal with description and candidate count

### Kanban Pipeline View
- Visual drag-and-drop pipeline board with stage columns
- Card-based candidate representation with avatar, match score, and tier
- Stage transitions via card drag between columns

### Reports & Analytics
- Recruitment reports with date range filtering
- CSV export of candidate data and recruitment metrics
- Analytics charts powered by Recharts

### Activity Audit Logs
- Server-side paginated activity log with configurable page sizes
- Action type filtering (job_created, candidate_submitted, stage_updated, etc.)
- Full-text search across log descriptions with debounced queries
- Timestamped entries with user attribution

### Team Management
- User listing with role display and avatar
- Role-based access control: SUPERADMIN > ADMIN > RECRUITER > VIEWER
- Role modification with privilege escalation prevention:
  - ADMIN cannot promote to SUPERADMIN or demote other ADMINs
  - Only SUPERADMIN can manage admin-level roles
- Password change modal

## 🔐 Authentication & Security

- JWT-based authentication with httpOnly cookie transport
- OAuth2 password flow with bcrypt password hashing
- Cookie-based session management (SameSite=Lax, httpOnly=true)
- Server-side token validation from cookies with Bearer header fallback
- Logout endpoint with cookie deletion
- Auto-SUPERADMIN assignment for first registered user
- Role-based route protection via FastAPI dependency injection (RequireRole)
- CORS restricted to explicit frontend origins with credentials support
- Rate limiting via slowapi on public endpoints, keyed by client IP
  (reads X-Forwarded-For when present — see the nginx note under
  Infrastructure & DevOps — falling back to the direct connection IP
  otherwise):
  - /candidates/parse: 10 requests/minute
  - /candidates/submit: 5 requests/minute
- Google reCAPTCHA Enterprise verification on candidate-facing endpoints
- Sort field whitelist validation to prevent attribute injection
- Pydantic schema validation on all API inputs

## 🗄️ Database & Data Layer

- PostgreSQL 15 (Alpine) with SQLAlchemy ORM
- Models: Job, Candidate, User, ActivityLog with UUID primary keys
- JSONB columns for nested structured data (skills, work history, education,
  scores, notes, stage history, custom fields)
- Database indexes on frequently queried columns:
  - candidates: email, jobId, stage, tier
  - activity_logs: action_type, job_id, timestamp
  - users: email (unique)
- Foreign key constraint: Candidate.jobId → Job.id
- Timezone-aware UTC datetime defaults across all models
- Alembic migration framework configured with autogenerated initial migration
  covering all tables and indexes
- Health check endpoint (/health) with database connectivity probe

## 🏗️ Infrastructure & DevOps

- Docker Compose orchestration with 4 services:
  - customer-page (Bun + TanStack Start, port 3000)
  - recruiter-view (Bun + TanStack Start, port 3001)
  - api (Python/Uvicorn, port 8000)
  - db (PostgreSQL 15 Alpine, port 5432)
- Network isolation: frontend-network (customer + recruiter + api) and
  backend-network (api + db) — database inaccessible to frontend containers
- Volume mounts for live development: source code, node_modules, CV storage
- PostgreSQL persistent volume (pgdata)
- Static file serving for uploaded CVs via FastAPI StaticFiles mount
- HMR disabled in both frontend Vite configurations for stability
- Environment-based configuration via .env file with settings for:
  database, JWT secret, Groq API key, reCAPTCHA credentials, API URLs
- **Production deployment behind nginx**: rate limiting trusts the
  `X-Forwarded-For` header to identify the real client IP (set nginx's
  `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`). This
  is only safe if nginx is the sole public entry point — the
  `customer-page`, `recruiter-view`, `api`, and `db` containers' ports
  must NOT be published to the public internet (bind them to
  `127.0.0.1` or drop the host port mapping and let nginx reach them
  over the Docker network instead), otherwise a client can bypass nginx
  and spoof `X-Forwarded-For` to defeat rate limiting entirely.

## 📦 Tech Stack

### Backend
- Python 3.11, FastAPI, Uvicorn
- SQLAlchemy ORM + Alembic migrations
- PostgreSQL 15 with JSONB support
- Groq SDK (AsyncGroq) for LLM inference
- PyMuPDF (fitz) for PDF text extraction
- slowapi for rate limiting
- python-jose for JWT, bcrypt for password hashing
- Pydantic v2 for request/response validation

### Frontend (both apps)
- React 19 + TypeScript
- TanStack Start (SSR framework) + TanStack Router
- Zustand for global state management
- Tailwind CSS v4 for styling
- Framer Motion for animations
- Recharts for data visualization
- Lucide React for iconography
- shadcn/ui component library
- Bun runtime + Vite bundler

### Infrastructure
- Docker + Docker Compose
- Cloudflare Workers (Wrangler) deployment target
- PostgreSQL 15 Alpine container
