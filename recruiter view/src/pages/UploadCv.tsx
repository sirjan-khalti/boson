import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles, Plus, Trash, FileText, X, UploadCloud, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAts } from "@/lib/store";
import { FormField } from "@/components/ats/FormField";
import { API_BASE } from "@/lib/config";
import { getToken, useAuth } from "@/lib/auth";

const generateId = () => Math.random().toString(36).substring(2, 15);

type CandidateSchema = {
  personal_info: {
    full_name: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: {
      city: string;
      state: string;
      country: string;
    };
    profiles: {
      linkedin: string;
      github: string;
      portfolio: string;
    };
  };
  professional_summary: {
    summary: string;
    total_experience_years: number;
    notice_period_days: number;
    preferred_locations: string[];
    authorized_to_work_in_nepal: boolean;
    expected_salary: string;
  };
  skills: string[];
  experience: Array<{
    _key?: string;
    company_name: string;
    job_title: string;
    employment_type: string;
    location: string;
    start_date: string;
    end_date: string;
    currently_working: boolean;
    work_summary: string;
    technologies_used: string[];
  }>;
  education: Array<{
    _key?: string;
    degree: string;
    field_of_study: string;
    institution_name: string;
    location: string;
    start_date: string;
    end_date: string;
    grade: string;
  }>;
  projects: Array<{
    _key?: string;
    project_name: string;
    description: string;
    technologies_used: string[];
    github_url: string;
    live_url: string;
  }>;
  certifications: Array<{
    _key?: string;
    name: string;
    issuer: string;
    issue_date: string;
  }>;
  languages: Array<{
    _key?: string;
    language: string;
    proficiency: string;
  }>;
  achievements: Array<{ _key: string; value: string }>;
  awards: Array<{ _key: string; value: string }>;
  candidate_preferences: {
    preferred_roles: string[];
    preferred_locations: string[];
    preferred_employment_type: string[];
  };
  custom_fields: Record<string, any>;
};

const emptySchema: CandidateSchema = {
  personal_info: {
    full_name: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: {
      city: "",
      state: "",
      country: ""
    },
    profiles: {
      linkedin: "",
      github: "",
      portfolio: ""
    }
  },
  professional_summary: {
    summary: "",
    total_experience_years: 0,
    notice_period_days: 0,
    preferred_locations: [],
    authorized_to_work_in_nepal: true,
    expected_salary: ""
  },
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  languages: [],
  achievements: [],
  awards: [],
  candidate_preferences: {
    preferred_roles: [],
    preferred_locations: [],
    preferred_employment_type: []
  },
  custom_fields: {
    extraInformation: "",
    publications: ""
  }
};

export default function UploadCvPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const jobs = useAts((s) => s.jobs);
  const fetchJobs = useAts((s) => s.fetchJobs);

  const [selectedJobId, setSelectedJobId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [prefilledFields, setPrefilledFields] = useState<Set<string>>(new Set());

  // reCAPTCHA states
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState(false);
  const [recaptchaTokenState, setRecaptchaTokenState] = useState("");
  const [widgetId, setWidgetId] = useState<number | null>(null);

  // Form states
  const [formData, setFormData] = useState<CandidateSchema>(emptySchema);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customFieldsList, setCustomFieldsList] = useState<{ _key: string; key: string; value: string }[]>([]);

  // Drag & drop states
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  if (user?.role === "VIEWER") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold tracking-tight">Access Denied</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Your account role (Viewer) does not have permission to upload CVs.
        </p>
      </div>
    );
  }

  // Load reCAPTCHA Enterprise
  useEffect(() => {
    if (typeof window === "undefined") return;

    const scriptSrc = "https://www.google.com/recaptcha/enterprise.js";
    let script = document.querySelector(`script[src="${scriptSrc}"]`) as HTMLScriptElement;

    const handleLoad = () => setRecaptchaLoaded(true);
    const handleError = () => setRecaptchaError(true);

    if (!script) {
      script = document.createElement("script");
      script.src = scriptSrc;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", handleLoad);
      script.addEventListener("error", handleError);
      document.head.appendChild(script);
      return () => {
        script.removeEventListener("load", handleLoad);
        script.removeEventListener("error", handleError);
      };
    } else {
      if ((window as any).grecaptcha?.enterprise) {
        setRecaptchaLoaded(true);
      } else {
        script.addEventListener("load", handleLoad);
        script.addEventListener("error", handleError);
        return () => {
          script.removeEventListener("load", handleLoad);
          script.removeEventListener("error", handleError);
        };
      }
    }
  }, []);

  // Render Checkbox widget
  useEffect(() => {
    if (!recaptchaLoaded) return;

    const container = document.getElementById("recaptcha-checkbox-container-recruiter");
    if (!container) return;

    container.innerHTML = "";

    try {
      const grecaptcha = (window as any).grecaptcha;
      grecaptcha.enterprise.ready(() => {
        const id = grecaptcha.enterprise.render("recaptcha-checkbox-container-recruiter", {
          sitekey: "6LecX_YsAAAAAIFXLXBgd-lRbLKsryG_SzqQJwgw",
          theme: "light",
          callback: (token: string) => {
            setRecaptchaTokenState(token);
          },
          "expired-callback": () => setRecaptchaTokenState(""),
          "error-callback": () => setRecaptchaTokenState(""),
        });
        setWidgetId(id);
      });
    } catch (e) {
      console.error("Failed to render reCAPTCHA enterprise widget:", e);
    }
  }, [recaptchaLoaded, file, uploadState, selectedJobId]);

  useEffect(() => {
    if (uploadState === "done") {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }, [uploadState]);

  const activeJobs = jobs.filter((j) => j.status === "Active");

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (!selectedJobId) {
      alert("Please select a job first.");
      return;
    }
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndUpload(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedJobId) {
      alert("Please select a job first.");
      return;
    }
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndUpload(selectedFile);
    }
  };

  const validateAndUpload = (uploaded: File) => {
    if (!uploaded.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a PDF file.");
      return;
    }
    if (uploaded.size > 10 * 1024 * 1024) {
      alert("File is too large. Max size is 10 MB.");
      return;
    }
    handleUpload(uploaded);
  };

  const handleUpload = async (uploaded: File) => {
    setFile(uploaded);
    setUploadState("uploading");
    setProgress(10);

    let recaptchaToken = recaptchaTokenState;
    if (!recaptchaToken) {
      setUploadState("idle");
      setFile(null);
      setProgress(0);
      alert("Please complete the reCAPTCHA checkbox before uploading.");
      return;
    }

    const fd = new FormData();
    fd.append("file", uploaded);

    try {
      setProgress(40);
      const res = await fetch(`${API_BASE}/candidates/parse`, {
        method: "POST",
        body: fd,
        headers: {
          "X-Recaptcha-Token": recaptchaToken,
        },
      });
      if (!res.ok) {
        let errorMsg = "Failed to parse resume";
        try {
          const errorData = await res.json();
          if (errorData && errorData.detail) {
            errorMsg = errorData.detail;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }
      setProgress(80);
      const parsedData = await res.json();
      setProgress(100);

      const parsedSalary = parsedData.professional_summary?.expected_salary ||
                           parsedData.salaryExpectation ||
                           parsedData.custom_fields?.salaryExpectation || "";

      setFormData({
        ...emptySchema,
        ...parsedData,
        personal_info: {
          ...emptySchema.personal_info,
          ...(parsedData.personal_info || {}),
          address: {
            ...emptySchema.personal_info.address,
            ...(parsedData.personal_info?.address || {}),
          },
          profiles: {
            ...emptySchema.personal_info.profiles,
            ...(parsedData.personal_info?.profiles || {}),
          }
        },
        professional_summary: {
          ...emptySchema.professional_summary,
          ...(parsedData.professional_summary || {}),
          expected_salary: parsedSalary,
        },
        skills: parsedData.skills || [],
        experience: (parsedData.experience || []).map((exp: any) => ({ ...exp, _key: generateId() })),
        education: (parsedData.education || []).map((edu: any) => ({ ...edu, _key: generateId() })),
        projects: (parsedData.projects || []).map((proj: any) => ({ ...proj, _key: generateId() })),
        certifications: (parsedData.certifications || []).map((cert: any) => ({ ...cert, _key: generateId() })),
        languages: (parsedData.languages || []).map((lang: any) => ({ ...lang, _key: generateId() })),
        achievements: (parsedData.achievements || []).map((ach: string) => ({ _key: generateId(), value: ach })),
        awards: (parsedData.awards || []).map((aw: string) => ({ _key: generateId(), value: aw })),
        custom_fields: {
          ...emptySchema.custom_fields,
          ...(parsedData.custom_fields || {}),
        },
      });

      const parsedCustoms: { _key: string; key: string; value: string }[] = [];
      if (parsedData.custom_fields) {
        Object.entries(parsedData.custom_fields).forEach(([k, v]) => {
          if (
            k !== "extraInformation" &&
            k !== "publications" &&
            k !== "salaryExpectation"
          ) {
            parsedCustoms.push({ _key: generateId(), key: k, value: String(v) });
          }
        });
      }
      setCustomFieldsList(parsedCustoms);

      const prefilled = new Set<string>();
      if (parsedData.personal_info?.full_name) prefilled.add("personal_info.full_name");
      if (parsedData.personal_info?.email) prefilled.add("personal_info.email");
      if (parsedData.personal_info?.phone) prefilled.add("personal_info.phone");
      if (parsedData.personal_info?.address?.city) prefilled.add("personal_info.address.city");
      if (parsedData.personal_info?.address?.state) prefilled.add("personal_info.address.state");
      if (parsedData.personal_info?.address?.country) prefilled.add("personal_info.address.country");
      if (parsedData.personal_info?.profiles?.linkedin) prefilled.add("personal_info.profiles.linkedin");
      if (parsedData.personal_info?.profiles?.github) prefilled.add("personal_info.profiles.github");
      if (parsedData.personal_info?.profiles?.portfolio) prefilled.add("personal_info.profiles.portfolio");
      if (parsedData.professional_summary?.summary) prefilled.add("professional_summary.summary");
      if (parsedData.professional_summary?.total_experience_years) prefilled.add("professional_summary.total_experience_years");
      if (parsedData.professional_summary?.notice_period_days) prefilled.add("professional_summary.notice_period_days");
      if (parsedSalary) prefilled.add("professional_summary.expected_salary");
      if (parsedData.skills?.length) prefilled.add("skills");

      // Per-item field tracking so the "prefilled" badge actually shows up
      // on each individual Work Experience / Education / Language row, not
      // just a section-level flag that nothing renders.
      const markItems = (section: string, items: any[] | undefined, fields: string[]) => {
        (items || []).forEach((item, idx) => {
          fields.forEach((field) => {
            const v = item?.[field];
            const hasValue = Array.isArray(v) ? v.length > 0 : Boolean(v);
            if (hasValue) prefilled.add(`${section}.${idx}.${field}`);
          });
        });
      };
      markItems("experience", parsedData.experience, [
        "company_name", "job_title", "employment_type", "location", "start_date", "end_date", "work_summary", "technologies_used",
      ]);
      markItems("education", parsedData.education, [
        "degree", "field_of_study", "institution_name", "location", "start_date", "end_date", "grade",
      ]);
      markItems("languages", parsedData.languages, ["language", "proficiency"]);

      setPrefilledFields(prefilled);
      setUploadState("done");
    } catch (err: any) {
      console.error(err);
      setUploadState("error");
      alert(err.message || "Failed to parse resume. Please fill the form.");

      if (typeof window !== "undefined" && (window as any).grecaptcha?.enterprise && widgetId !== null) {
        try {
          (window as any).grecaptcha.enterprise.reset(widgetId);
        } catch (e) {}
      }
      setRecaptchaTokenState("");
    }
  };

  const handleRemove = () => {
    setFile(null);
    setUploadState("idle");
    setProgress(0);
    setPrefilledFields(new Set());
    setFormData(emptySchema);
    setCustomFieldsList([]);
    setErrors({});

    if (typeof window !== "undefined" && (window as any).grecaptcha?.enterprise && widgetId !== null) {
      try {
        (window as any).grecaptcha.enterprise.reset(widgetId);
      } catch (e) {}
    }
    setRecaptchaTokenState("");
  };

  // Updaters
  const updatePersonalInfo = (key: keyof CandidateSchema["personal_info"], value: any) => {
    let extraFields = {};
    if (key === "full_name") {
      const parts = value.trim().split(/\s+/);
      let first = "";
      let last = "";
      if (parts.length === 1) first = parts[0];
      else if (parts.length === 2) {
        first = parts[0];
        last = parts[1];
      } else if (parts.length > 2) {
        first = parts[0];
        last = parts.slice(1).join(" ");
      }
      extraFields = { first_name: first, last_name: last };
    }

    setFormData((prev) => ({
      ...prev,
      personal_info: {
        ...prev.personal_info,
        [key]: value,
        ...extraFields,
      },
    }));
    setPrefilledFields((prev) => {
      const next = new Set(prev);
      next.delete(`personal_info.${key}`);
      if (key === "full_name") {
        next.delete("personal_info.first_name");
        next.delete("personal_info.last_name");
      }
      return next;
    });
    if (errors[`personal_info.${key}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`personal_info.${key}`];
        return next;
      });
    }
  };

  const updateAddress = (key: keyof CandidateSchema["personal_info"]["address"], value: string) => {
    setFormData((prev) => ({
      ...prev,
      personal_info: {
        ...prev.personal_info,
        address: {
          ...prev.personal_info.address,
          [key]: value,
        },
      },
    }));
    setPrefilledFields((prev) => {
      const next = new Set(prev);
      next.delete(`personal_info.address.${key}`);
      return next;
    });
  };

  const updateProfiles = (key: keyof CandidateSchema["personal_info"]["profiles"], value: string) => {
    setFormData((prev) => ({
      ...prev,
      personal_info: {
        ...prev.personal_info,
        profiles: {
          ...prev.personal_info.profiles,
          [key]: value,
        },
      },
    }));
  };

  const updateSummary = (key: keyof CandidateSchema["professional_summary"], value: any) => {
    setFormData((prev) => ({
      ...prev,
      professional_summary: {
        ...prev.professional_summary,
        [key]: value,
      },
    }));
    setPrefilledFields((prev) => {
      const next = new Set(prev);
      next.delete(`professional_summary.${key}`);
      return next;
    });
  };

  const addExperience = () => {
    setFormData((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          _key: generateId(),
          company_name: "",
          job_title: "",
          employment_type: "Full-time",
          location: "",
          start_date: "",
          end_date: "",
          currently_working: false,
          work_summary: "",
          technologies_used: [],
        },
      ],
    }));
  };

  const updateExperience = (index: number, key: string, value: any) => {
    setFormData((prev) => {
      const list = [...prev.experience];
      list[index] = { ...list[index], [key]: value };
      return { ...prev, experience: list };
    });
    setPrefilledFields((prev) => {
      const next = new Set(prev);
      next.delete(`experience.${index}.${key}`);
      return next;
    });
  };

  const removeExperience = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  };

  const addEducation = () => {
    setFormData((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        {
          _key: generateId(),
          degree: "",
          field_of_study: "",
          institution_name: "",
          location: "",
          start_date: "",
          end_date: "",
          grade: "",
        },
      ],
    }));
  };

  const updateEducation = (index: number, key: string, value: any) => {
    setFormData((prev) => {
      const list = [...prev.education];
      list[index] = { ...list[index], [key]: value };
      return { ...prev, education: list };
    });
    setPrefilledFields((prev) => {
      const next = new Set(prev);
      next.delete(`education.${index}.${key}`);
      return next;
    });
  };

  const removeEducation = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  const addLanguage = () => {
    setFormData((prev) => ({
      ...prev,
      languages: [...prev.languages, { _key: generateId(), language: "", proficiency: "" }],
    }));
  };

  const updateLanguage = (index: number, key: string, value: any) => {
    setFormData((prev) => {
      const list = [...prev.languages];
      list[index] = { ...list[index], [key]: value };
      return { ...prev, languages: list };
    });
    setPrefilledFields((prev) => {
      const next = new Set(prev);
      next.delete(`languages.${index}.${key}`);
      return next;
    });
  };

  const removeLanguage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index),
    }));
  };

  const isPrefilled = (name: string) => prefilledFields.has(name);

  const validateForm = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!formData.personal_info.full_name.trim()) {
      nextErrors["personal_info.full_name"] = "Full name is required";
    }
    if (!formData.personal_info.email.trim()) {
      nextErrors["personal_info.email"] = "Email address is required";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.personal_info.email)) {
      nextErrors["personal_info.email"] = "Please enter a valid email address";
    }
    if (!formData.personal_info.phone.trim()) {
      nextErrors["personal_info.phone"] = "Phone number is required";
    }
    if (!formData.personal_info.address.city.trim()) {
      nextErrors["personal_info.address.city"] = "City is required";
    }
    if (!formData.personal_info.address.country.trim()) {
      nextErrors["personal_info.address.country"] = "Country is required";
    }
    if (!formData.professional_summary.summary.trim()) {
      nextErrors["professional_summary.summary"] = "Professional summary is required";
    }
    if (
      formData.professional_summary.total_experience_years === undefined ||
      formData.professional_summary.total_experience_years === null ||
      isNaN(formData.professional_summary.total_experience_years)
    ) {
      nextErrors["professional_summary.total_experience_years"] = "Years of experience is required";
    }
    if (formData.skills.length === 0) {
      nextErrors["skills"] = "At least one skill is required";
    }
    if (!formData.professional_summary.expected_salary?.toString().trim()) {
      nextErrors["professional_summary.expected_salary"] = "Expected salary is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!selectedJobId) {
      alert("Please select a job first.");
      setIsSubmitting(false);
      return;
    }

    const isValid = validateForm();
    if (isValid) {
      const builtCustomFields: Record<string, any> = {
        extraInformation: formData.custom_fields.extraInformation || "",
        publications: formData.custom_fields.publications || "",
      };

      customFieldsList.forEach(({ key, value }) => {
        if (key.trim()) {
          builtCustomFields[key.trim()] = value;
        }
      });

      const cleanExperience = formData.experience.map(({ _key, ...rest }) => rest);
      const cleanEducation = formData.education.map(({ _key, ...rest }) => rest);
      const cleanProjects = formData.projects.map(({ _key, ...rest }) => rest);
      const cleanCertifications = formData.certifications.map(({ _key, ...rest }) => rest);
      const cleanLanguages = formData.languages.map(({ _key, ...rest }) => rest);
      const cleanAchievements = formData.achievements.map((ach) => ach.value);
      const cleanAwards = formData.awards.map((aw) => aw.value);

      const candidateData = {
        ...formData,
        experience: cleanExperience,
        education: cleanEducation,
        projects: cleanProjects,
        certifications: cleanCertifications,
        languages: cleanLanguages,
        achievements: cleanAchievements,
        awards: cleanAwards,
        custom_fields: builtCustomFields,
        jobId: selectedJobId,
      };

      try {
        const formDataPayload = new FormData();
        formDataPayload.append("candidate", JSON.stringify(candidateData));
        if (file) {
          formDataPayload.append("file", file);
        }

        const headers: Record<string, string> = {};
        const token = getToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const submitRes = await fetch(`${API_BASE}/candidates/submit`, {
          method: "POST",
          headers,
          body: formDataPayload,
          credentials: "include"
        });

        if (!submitRes.ok) {
          const errData = await submitRes.json().catch(() => ({}));
          throw new Error(errData.detail || "Failed to submit application");
        }

        setIsSubmitting(false);
        alert("CV uploaded and candidate profile created successfully!");
        navigate(`/candidates?jobId=${selectedJobId}`);
      } catch (err: any) {
        console.error(err);
        alert(err.message || "Failed to submit application");
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(false);
      setTimeout(() => {
        const el = document.querySelector('[aria-invalid="true"]') as HTMLElement | null;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus({ preventScroll: true });
        }
      }, 50);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload CV</h1>
        <p className="text-sm text-muted-foreground">
          Select an active job and upload a candidate CV. The system will pre-fill the form using AI parser.
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="job-select">Select Active Job *</Label>
            <select
              id="job-select"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              <option value="">-- Choose an active job --</option>
              {activeJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.department} - {j.location})
                </option>
              ))}
            </select>
          </div>

          {/* Upload Dropzone Area */}
          {uploadState === "idle" || uploadState === "error" ? (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => selectedJobId && fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer
                  ${!selectedJobId ? "opacity-50 cursor-not-allowed border-border" : "hover:border-primary/50 hover:bg-muted/40"}
                  ${isDragActive ? "border-primary bg-primary/5" : "border-border bg-background"}`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="hidden"
                  disabled={!selectedJobId}
                />
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-primary">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold">
                  {isDragActive ? "Drop the resume here" : "Drag and drop resume here, or click to browse"}
                </h3>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  PDF format up to 10 MB. Selecting a job above is required.
                </p>
                <Button type="button" disabled={!selectedJobId} className="mt-4 text-xs">
                  Choose PDF file
                </Button>
              </div>

              {selectedJobId && (
                <div className="flex flex-col items-center p-4 rounded-xl border border-border bg-muted/20">
                  <span className="text-xs font-semibold text-muted-foreground mb-3">Verification Required</span>
                  <div id="recaptcha-checkbox-container-recruiter" />
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground text-sm">{file?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {file ? (file.size / 1024 / 1024).toFixed(2) : 0} MB
                      </div>
                    </div>
                    {uploadState === "done" && (
                      <button
                        onClick={handleRemove}
                        className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {uploadState === "uploading" && (
                    <div className="mt-3">
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Parsing resume {progress}%
                      </div>
                    </div>
                  )}

                  {uploadState === "done" && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Upload complete — review parsed information below.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {uploadState === "done" && (
        <div ref={formRef} className="space-y-6">
          <form onSubmit={handleFormSubmit} className="space-y-6">

            {/* Work Authorization — asked first since it gates submission,
                and resume parsing always resets it to "No" (a resume can
                never truthfully confirm this), so it needs to be seen and
                addressed before filling out the rest. */}
            <Card className="border-primary/30 bg-primary/5 p-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Is the candidate legally authorized to work in Nepal? <span className="text-primary">*</span>
                </Label>
                <RadioGroup
                  value={formData.professional_summary.authorized_to_work_in_nepal ? "yes" : "no"}
                  onValueChange={(v) => updateSummary("authorized_to_work_in_nepal", v === "yes")}
                  className="flex gap-3"
                >
                  {[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ].map((o) => (
                    <Label
                      key={o.value}
                      htmlFor={`auth-${o.value}`}
                      className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${(formData.professional_summary.authorized_to_work_in_nepal ? "yes" : "no") === o.value
                        ? "border-primary bg-background text-foreground"
                        : "border-border bg-background hover:border-primary/40"
                        }`}
                    >
                      <RadioGroupItem id={`auth-${o.value}`} value={o.value} />
                      {o.label}
                    </Label>
                  ))}
                </RadioGroup>
                {!formData.professional_summary.authorized_to_work_in_nepal && (
                  <p className="text-xs text-destructive mt-1.5 font-medium">
                    ⚠️ This must be set to "Yes" before the candidate profile can be created.
                    {file && " Uploading a resume resets this — please confirm again."}
                  </p>
                )}
              </div>
            </Card>

            {/* Personal Details */}
            <Card className="p-6">
              <div className="mb-4 pb-2 border-b border-border">
                <h2 className="text-base font-semibold tracking-tight">Personal Information</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="full_name"
                  label="Full Name"
                  required
                  prefilled={isPrefilled("personal_info.full_name")}
                  value={formData.personal_info.full_name}
                  onChange={(e) => updatePersonalInfo("full_name", e.target.value)}
                  error={errors["personal_info.full_name"]}
                />
                <FormField
                  id="email"
                  label="Email Address"
                  required
                  prefilled={isPrefilled("personal_info.email")}
                  value={formData.personal_info.email}
                  onChange={(e) => updatePersonalInfo("email", e.target.value)}
                  error={errors["personal_info.email"]}
                />
                <FormField
                  id="phone"
                  label="Phone Number"
                  required
                  prefilled={isPrefilled("personal_info.phone")}
                  value={formData.personal_info.phone}
                  onChange={(e) => updatePersonalInfo("phone", e.target.value)}
                  error={errors["personal_info.phone"]}
                />
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    id="city"
                    label="City"
                    required
                    prefilled={isPrefilled("personal_info.address.city")}
                    value={formData.personal_info.address.city}
                    onChange={(e) => updateAddress("city", e.target.value)}
                    error={errors["personal_info.address.city"]}
                  />
                  <FormField
                    id="country"
                    label="Country"
                    required
                    prefilled={isPrefilled("personal_info.address.country")}
                    value={formData.personal_info.address.country}
                    onChange={(e) => updateAddress("country", e.target.value)}
                    error={errors["personal_info.address.country"]}
                  />
                </div>
              </div>
            </Card>

            {/* Profiles & Salary */}
            <Card className="p-6">
              <div className="mb-4 pb-2 border-b border-border">
                <h2 className="text-base font-semibold tracking-tight">Professional Profile Details</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="linkedin"
                  label="LinkedIn URL"
                  prefilled={isPrefilled("personal_info.profiles.linkedin")}
                  value={formData.personal_info.profiles.linkedin}
                  onChange={(e) => updateProfiles("linkedin", e.target.value)}
                />
                <FormField
                  id="github"
                  label="GitHub URL"
                  prefilled={isPrefilled("personal_info.profiles.github")}
                  value={formData.personal_info.profiles.github}
                  onChange={(e) => updateProfiles("github", e.target.value)}
                />
                <FormField
                  id="portfolio"
                  label="Portfolio URL"
                  prefilled={isPrefilled("personal_info.profiles.portfolio")}
                  value={formData.personal_info.profiles.portfolio}
                  onChange={(e) => updateProfiles("portfolio", e.target.value)}
                />
                <FormField
                  id="expected_salary"
                  label="Expected Salary (monthly, NPR)"
                  required
                  prefilled={isPrefilled("professional_summary.expected_salary")}
                  value={formData.professional_summary.expected_salary}
                  onChange={(e) => updateSummary("expected_salary", e.target.value)}
                  error={errors["professional_summary.expected_salary"]}
                />
                <FormField
                  id="total_exp"
                  label="Total Experience (years)"
                  type="number"
                  step="0.1"
                  required
                  prefilled={isPrefilled("professional_summary.total_experience_years")}
                  value={formData.professional_summary.total_experience_years || ""}
                  onChange={(e) => updateSummary("total_experience_years", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                  error={errors["professional_summary.total_experience_years"]}
                />
                <FormField
                  id="notice_period"
                  label="Notice Period (days)"
                  type="number"
                  prefilled={isPrefilled("professional_summary.notice_period_days")}
                  value={formData.professional_summary.notice_period_days || 0}
                  onChange={(e) => updateSummary("notice_period_days", e.target.value === "" ? 0 : parseInt(e.target.value))}
                />
              </div>
            </Card>

            {/* Summary & Skills */}
            <Card className="p-6">
              <div className="mb-4 pb-2 border-b border-border">
                <h2 className="text-base font-semibold tracking-tight">Summary & Skills</h2>
              </div>
              <div className="space-y-4">
                <FormField
                  id="summary"
                  as="textarea"
                  label="Professional Summary"
                  required
                  prefilled={isPrefilled("professional_summary.summary")}
                  value={formData.professional_summary.summary}
                  onChange={(e) => updateSummary("summary", e.target.value)}
                  error={errors["professional_summary.summary"]}
                />
                <FormField
                  id="skills"
                  as="textarea"
                  label="Skills & Expertise"
                  required
                  prefilled={isPrefilled("skills")}
                  value={formData.skills.join(", ")}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      skills: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }))
                  }
                  error={errors["skills"]}
                  hint="Comma-separated items (e.g. Python, React, AWS)"
                />
              </div>
            </Card>

            {/* Work Experience */}
            <Card className="p-6">
              <div className="mb-4 pb-2 border-b border-border flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-tight">Work Experience</h2>
                <Button type="button" variant="outline" size="sm" onClick={addExperience}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Job
                </Button>
              </div>
              <div className="space-y-6">
                {formData.experience.map((exp, idx) => (
                  <div key={exp._key || idx} className="p-4 rounded-xl border border-border bg-muted/10 relative space-y-4">
                    <button
                      type="button"
                      onClick={() => removeExperience(idx)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-destructive"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        id={`exp-title-${idx}`}
                        label="Job Title"
                        required
                        prefilled={isPrefilled(`experience.${idx}.job_title`)}
                        value={exp.job_title}
                        onChange={(e) => updateExperience(idx, "job_title", e.target.value)}
                      />
                      <FormField
                        id={`exp-company-${idx}`}
                        label="Company Name"
                        required
                        prefilled={isPrefilled(`experience.${idx}.company_name`)}
                        value={exp.company_name}
                        onChange={(e) => updateExperience(idx, "company_name", e.target.value)}
                      />
                      <FormField
                        id={`exp-start-${idx}`}
                        label="Start Date"
                        placeholder="YYYY-MM"
                        prefilled={isPrefilled(`experience.${idx}.start_date`)}
                        value={exp.start_date}
                        onChange={(e) => updateExperience(idx, "start_date", e.target.value)}
                      />
                      <FormField
                        id={`exp-end-${idx}`}
                        label="End Date"
                        placeholder="YYYY-MM (or blank if current)"
                        disabled={exp.currently_working}
                        prefilled={isPrefilled(`experience.${idx}.end_date`)}
                        value={exp.currently_working ? "Present" : exp.end_date}
                        onChange={(e) => updateExperience(idx, "end_date", e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`exp-current-${idx}`}
                        checked={exp.currently_working}
                        onChange={(e) => updateExperience(idx, "currently_working", e.target.checked)}
                        className="rounded border-border bg-background"
                      />
                      <Label htmlFor={`exp-current-${idx}`}>I am currently working in this role</Label>
                    </div>
                    <FormField
                      id={`exp-desc-${idx}`}
                      as="textarea"
                      label="Job Summary"
                      prefilled={isPrefilled(`experience.${idx}.work_summary`)}
                      value={exp.work_summary}
                      onChange={(e) => updateExperience(idx, "work_summary", e.target.value)}
                    />
                  </div>
                ))}
                {formData.experience.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No work experience added.</p>
                )}
              </div>
            </Card>

            {/* Education History */}
            <Card className="p-6">
              <div className="mb-4 pb-2 border-b border-border flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-tight">Education</h2>
                <Button type="button" variant="outline" size="sm" onClick={addEducation}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Education
                </Button>
              </div>
              <div className="space-y-6">
                {formData.education.map((edu, idx) => (
                  <div key={edu._key || idx} className="p-4 rounded-xl border border-border bg-muted/10 relative space-y-4">
                    <button
                      type="button"
                      onClick={() => removeEducation(idx)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-destructive"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        id={`edu-degree-${idx}`}
                        label="Degree/Qualification"
                        required
                        prefilled={isPrefilled(`education.${idx}.degree`)}
                        value={edu.degree}
                        onChange={(e) => updateEducation(idx, "degree", e.target.value)}
                      />
                      <FormField
                        id={`edu-school-${idx}`}
                        label="Institution Name"
                        required
                        prefilled={isPrefilled(`education.${idx}.institution_name`)}
                        value={edu.institution_name}
                        onChange={(e) => updateEducation(idx, "institution_name", e.target.value)}
                      />
                      <FormField
                        id={`edu-start-${idx}`}
                        label="Start Date"
                        placeholder="YYYY-MM"
                        prefilled={isPrefilled(`education.${idx}.start_date`)}
                        value={edu.start_date}
                        onChange={(e) => updateEducation(idx, "start_date", e.target.value)}
                      />
                      <FormField
                        id={`edu-end-${idx}`}
                        label="End Date"
                        placeholder="YYYY-MM"
                        prefilled={isPrefilled(`education.${idx}.end_date`)}
                        value={edu.end_date}
                        onChange={(e) => updateEducation(idx, "end_date", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
                {formData.education.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No education details added.</p>
                )}
              </div>
            </Card>

            {/* Languages */}
            <Card className="p-6">
              <div className="mb-4 pb-2 border-b border-border flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-tight">Languages</h2>
                <Button type="button" variant="outline" size="sm" onClick={addLanguage}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Language
                </Button>
              </div>
              <div className="space-y-6">
                {formData.languages.map((lang, idx) => (
                  <div key={lang._key || idx} className="p-4 rounded-xl border border-border bg-muted/10 relative space-y-4">
                    <button
                      type="button"
                      onClick={() => removeLanguage(idx)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-destructive"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        id={`lang-name-${idx}`}
                        label="Language"
                        prefilled={isPrefilled(`languages.${idx}.language`)}
                        value={lang.language}
                        onChange={(e) => updateLanguage(idx, "language", e.target.value)}
                      />
                      <FormField
                        id={`lang-prof-${idx}`}
                        label="Proficiency"
                        placeholder="e.g. Native, Fluent, Conversational"
                        prefilled={isPrefilled(`languages.${idx}.proficiency`)}
                        value={lang.proficiency}
                        onChange={(e) => updateLanguage(idx, "proficiency", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
                {formData.languages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No languages added.</p>
                )}
              </div>
            </Card>

            {/* Submit Action */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={handleRemove}>
                Clear / Reset
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.professional_summary.authorized_to_work_in_nepal}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Submitting...
                  </>
                ) : (
                  "Create Candidate Profile"
                )}
              </Button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
}
