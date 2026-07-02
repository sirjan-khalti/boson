import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles, Plus, Trash, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ResumeDropzone, type UploadState } from "@/components/application/ResumeDropzone";
import { FormField } from "@/components/application/FormField";
import { API_BASE } from "@/lib/constants";

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

function SectionHeader({ step, title, desc }: { step: string; title: string; desc?: string }) {
  return (
    <div className="mb-6 border-b border-border/60 pb-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-khalti">{step}</div>
      <h2 className="mt-1 text-lg font-semibold tracking-tight">{title}</h2>
      {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
    </div>
  );
}

export default function ApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [jobLoading, setJobLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/jobs/fetch`)
      .then((res) => res.json())
      .then((jobs) => {
        const found = jobs.find((j: any) => j.id === jobId);
        if (!found || found.status !== "Active") { navigate("/jobs", { replace: true }); return; }
        setJob(found);
      })
      .catch(() => navigate("/jobs", { replace: true }))
      .finally(() => setJobLoading(false));
  }, [jobId, navigate]);

  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [prefilledFields, setPrefilledFields] = useState<Set<string>>(new Set());

  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState(false);
  const [recaptchaTokenState, setRecaptchaTokenState] = useState("");
  const [widgetId, setWidgetId] = useState<number | null>(null);

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

  // Effect to render the Checkbox widget once script is loaded and container exists
  useEffect(() => {
    if (!recaptchaLoaded) return;

    const container = document.getElementById("recaptcha-checkbox-container");
    if (!container) return;

    // Clear to avoid duplicate rendering
    container.innerHTML = "";

    try {
      const grecaptcha = (window as any).grecaptcha;
      grecaptcha.enterprise.ready(() => {
        const id = grecaptcha.enterprise.render("recaptcha-checkbox-container", {
          sitekey: "6LecX_YsAAAAAIFXLXBgd-lRbLKsryG_SzqQJwgw",
          theme: "light",
          callback: (token: string) => {
            setRecaptchaTokenState(token);
          },
          "expired-callback": () => {
            setRecaptchaTokenState("");
          },
          "error-callback": () => {
            setRecaptchaTokenState("");
          },
        });
        setWidgetId(id);
      });
    } catch (e) {
      console.error("Failed to render reCAPTCHA enterprise widget:", e);
    }
  }, [recaptchaLoaded, file, uploadState]);

  const [formData, setFormData] = useState<CandidateSchema>(emptySchema);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customFieldsList, setCustomFieldsList] = useState<{ _key: string; key: string; value: string }[]>([]);

  const addCustomField = () => {
    setCustomFieldsList((prev) => [...prev, { _key: generateId(), key: "", value: "" }]);
  };

  const updateCustomFieldItem = (index: number, field: "key" | "value", val: string) => {
    setCustomFieldsList((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: val,
      };
      return next;
    });
  };

  const removeCustomField = (index: number) => {
    setCustomFieldsList((prev) => prev.filter((_, i) => i !== index));
  };

  const formRef = useRef<HTMLDivElement | null>(null);

  const handleUpload = async (uploaded: File) => {
    setFile(uploaded);
    setUploadState("uploading");
    setProgress(10);

    let recaptchaToken = recaptchaTokenState;
    let isRecaptchaOk = !!recaptchaToken;
    let recaptchaErrMsg = "";

    if (!isRecaptchaOk) {
      recaptchaErrMsg = "Please check the 'I am not a robot' checkbox before uploading your resume.";
      setUploadState("idle");
      setFile(null);
      setProgress(0);
      alert(recaptchaErrMsg);
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
        achievements: (parsedData.achievements || []).map((ach: string) => ({ _key: generateId(), value: ach })),
        awards: (parsedData.awards || []).map((aw: string) => ({ _key: generateId(), value: aw })),
        custom_fields: {
          ...emptySchema.custom_fields,
          ...(parsedData.custom_fields || {}),
        },
      });

      // Extract custom fields excluding extraInformation, publications, salaryExpectation
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
      if (parsedData.experience?.length) prefilled.add("experience");
      if (parsedData.education?.length) prefilled.add("education");
      if (parsedData.projects?.length) prefilled.add("projects");
      if (parsedData.certifications?.length) prefilled.add("certifications");
      if (parsedData.achievements?.length) prefilled.add("achievements");
      if (parsedData.awards?.length) prefilled.add("awards");
      if (parsedData.custom_fields?.extraInformation) prefilled.add("custom_fields.extraInformation");
      if (parsedData.custom_fields?.publications) prefilled.add("custom_fields.publications");

      setPrefilledFields(prefilled);
      setUploadState("done");
    } catch (err: any) {
      console.error(err);
      setUploadState("error");
      alert(err.message || "Failed to parse resume. Please fill the form.");

      // Reset reCAPTCHA widget on parse error
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

    // Reset recaptcha widget and state
    if (typeof window !== "undefined" && (window as any).grecaptcha?.enterprise && widgetId !== null) {
      try {
        (window as any).grecaptcha.enterprise.reset(widgetId);
      } catch (e) {
        console.error("Failed to reset recaptcha widget:", e);
      }
    }
    setRecaptchaTokenState("");
  };

  useEffect(() => {
    if (uploadState === "done") {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }, [uploadState]);

  // Nested property updaters
  const updatePersonalInfo = (key: keyof CandidateSchema["personal_info"], value: any) => {
    let extraFields = {};
    if (key === "full_name") {
      const parts = value.trim().split(/\s+/);
      let first = "";
      let last = "";
      if (parts.length === 1) {
        first = parts[0];
      } else if (parts.length === 2) {
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
    // Remove "prefilled" highlight when the user edits
    setPrefilledFields((prev) => {
      const next = new Set(prev);
      next.delete(`personal_info.${key}`);
      if (key === "full_name") {
        next.delete("personal_info.first_name");
        next.delete("personal_info.last_name");
      }
      return next;
    });
    // Clear error
    if (errors[`personal_info.${key}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`personal_info.${key}`];
        return next;
      });
    }
    if (key === "full_name") {
      setErrors((prev) => {
        const next = { ...prev };
        delete next["personal_info.first_name"];
        delete next["personal_info.last_name"];
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
    if (errors[`personal_info.address.${key}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`personal_info.address.${key}`];
        return next;
      });
    }
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
    setPrefilledFields((prev) => {
      const next = new Set(prev);
      next.delete(`personal_info.profiles.${key}`);
      return next;
    });
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
    if (errors[`professional_summary.${key}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`professional_summary.${key}`];
        return next;
      });
    }
  };

  // Dynamic experience list functions
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
      list[index] = {
        ...list[index],
        [key]: value,
      };
      return { ...prev, experience: list };
    });
    if (errors[`experience.${index}.${key}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`experience.${index}.${key}`];
        return next;
      });
    }
  };

  const removeExperience = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  };

  // Dynamic education list functions
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
      list[index] = {
        ...list[index],
        [key]: value,
      };
      return { ...prev, education: list };
    });
    if (errors[`education.${index}.${key}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`education.${index}.${key}`];
        return next;
      });
    }
  };

  const removeEducation = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  // Dynamic projects list functions
  const addProject = () => {
    setFormData((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        {
          _key: generateId(),
          project_name: "",
          description: "",
          technologies_used: [],
          github_url: "",
          live_url: "",
        },
      ],
    }));
  };

  const updateProject = (index: number, key: string, value: any) => {
    setFormData((prev) => {
      const list = [...prev.projects];
      list[index] = {
        ...list[index],
        [key]: value,
      };
      return { ...prev, projects: list };
    });
    if (errors[`projects.${index}.${key}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`projects.${index}.${key}`];
        return next;
      });
    }
  };

  const removeProject = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  // Dynamic certifications list
  const addCertification = () => {
    setFormData((prev) => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        {
          _key: generateId(),
          name: "",
          issuer: "",
          issue_date: "",
        },
      ],
    }));
  };

  const updateCertification = (index: number, key: string, value: any) => {
    setFormData((prev) => {
      const list = [...prev.certifications];
      list[index] = {
        ...list[index],
        [key]: value,
      };
      return { ...prev, certifications: list };
    });
    if (errors[`certifications.${index}.${key}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`certifications.${index}.${key}`];
        return next;
      });
    }
  };

  const removeCertification = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  const updateCustomField = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      custom_fields: {
        ...prev.custom_fields,
        [key]: value,
      },
    }));
    setPrefilledFields((prev) => {
      const next = new Set(prev);
      next.delete(`custom_fields.${key}`);
      return next;
    });
    if (errors[`custom_fields.${key}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`custom_fields.${key}`];
        return next;
      });
    }
  };

  const addAchievement = () => {
    setFormData((prev) => ({
      ...prev,
      achievements: [...prev.achievements, { _key: generateId(), value: "" }],
    }));
  };

  const updateAchievement = (index: number, value: string) => {
    setFormData((prev) => {
      const list = [...prev.achievements];
      list[index] = { ...list[index], value };
      return { ...prev, achievements: list };
    });
  };

  const removeAchievement = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index),
    }));
  };

  const addAward = () => {
    setFormData((prev) => ({
      ...prev,
      awards: [...prev.awards, { _key: generateId(), value: "" }],
    }));
  };

  const updateAward = (index: number, value: string) => {
    setFormData((prev) => {
      const list = [...prev.awards];
      list[index] = { ...list[index], value };
      return { ...prev, awards: list };
    });
  };

  const removeAward = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      awards: prev.awards.filter((_, i) => i !== index),
    }));
  };

  const isPrefilled = (name: string) => prefilledFields.has(name);
  const ready = true;

  const validateForm = (): boolean => {
    const nextErrors: Record<string, string> = {};

    // Personal Info
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

    // Address
    if (!formData.personal_info.address.city.trim()) {
      nextErrors["personal_info.address.city"] = "City is required";
    }
    if (!formData.personal_info.address.country.trim()) {
      nextErrors["personal_info.address.country"] = "Country is required";
    }

    // Professional Summary
    if (!formData.professional_summary.summary.trim()) {
      nextErrors["professional_summary.summary"] = "Professional summary is required";
    }
    if (
      formData.professional_summary.total_experience_years === undefined ||
      formData.professional_summary.total_experience_years === null ||
      isNaN(formData.professional_summary.total_experience_years)
    ) {
      nextErrors["professional_summary.total_experience_years"] = "Years of experience is required";
    } else if (formData.professional_summary.total_experience_years < 0) {
      nextErrors["professional_summary.total_experience_years"] = "Years of experience cannot be negative";
    }

    // Skills
    if (formData.skills.length === 0) {
      nextErrors["skills"] = "At least one skill is required";
    }

    // Experience (Optional, but validate elements if added)
    formData.experience.forEach((exp, idx) => {
      if (!exp.company_name.trim()) {
        nextErrors[`experience.${idx}.company_name`] = "Company name is required";
      }
      if (!exp.job_title.trim()) {
        nextErrors[`experience.${idx}.job_title`] = "Job title is required";
      }
    });

    // Projects (Optional, but validate elements if added)
    formData.projects.forEach((proj, idx) => {
      if (!proj.project_name.trim()) {
        nextErrors[`projects.${idx}.project_name`] = "Project name is required";
      }
    });

    // Academic History (Education - Optional, validate items if added)
    formData.education.forEach((edu, idx) => {
      if (!edu.degree.trim()) {
        nextErrors[`education.${idx}.degree`] = "Degree is required";
      }
      if (!edu.institution_name.trim()) {
        nextErrors[`education.${idx}.institution_name`] = "Institution name is required";
      }
    });

    // Certifications (Optional)
    formData.certifications.forEach((cert, idx) => {
      if (!cert.name.trim()) {
        nextErrors[`certifications.${idx}.name`] = "Certification name is required";
      }
    });

    // Expected Salary (Required)
    if (!formData.professional_summary.expected_salary?.toString().trim()) {
      nextErrors["professional_summary.expected_salary"] = "Expected salary is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onInvalid = () => {
    setTimeout(() => {
      const el = document.querySelector('[aria-invalid="true"]') as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus({ preventScroll: true });
      }
    }, 50);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
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
      const cleanAchievements = formData.achievements.map((ach) => ach.value);
      const cleanAwards = formData.awards.map((aw) => aw.value);

      const candidateData = {
        ...formData,
        experience: cleanExperience,
        education: cleanEducation,
        projects: cleanProjects,
        certifications: cleanCertifications,
        achievements: cleanAchievements,
        awards: cleanAwards,
        custom_fields: builtCustomFields,
        jobId: job.id,
      };

      try {
        const formDataPayload = new FormData();
        formDataPayload.append("candidate", JSON.stringify(candidateData));
        if (file) {
          formDataPayload.append("file", file);
        }

        const submitRes = await fetch(`${API_BASE}/candidates/submit`, {
          method: "POST",
          body: formDataPayload,
        });
        if (!submitRes.ok) {
          const errData = await submitRes.json().catch(() => ({}));
          throw new Error(errData.detail || "Failed to submit application");
        }
        setIsSubmitting(false);
        navigate("/success");
      } catch (err: any) {
        console.error(err);
        alert(err.message || "Failed to submit application");
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(false);
      onInvalid();
    }
  };

  if (jobLoading || !job) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="text-muted-foreground">Loading role...</div>
      </div>
    );
  }

  return (
    <div className="bg-secondary/30 min-h-screen pb-12">
      <section className="border-b border-border/60 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4 text-muted-foreground">
            <Link to={`/jobs/${job.id}`}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to role
            </Link>
          </Button>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{job.title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {job.department} • {job.location} • {job.employmentType}
          </p>

          {/* Steps */}
          <ol className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              { n: 1, label: "Review & Fill Info", active: true, done: uploadState === "done" },
              { n: 2, label: "Submit application", active: false, done: false },
            ].map((s) => (
              <li
                key={s.n}
                className={`flex items-center gap-3 rounded-xl border p-3 text-sm transition-colors ${s.done
                  ? "border-khalti/30 bg-khalti/5 text-foreground"
                  : s.active
                    ? "border-border bg-white text-foreground"
                    : "border-border bg-secondary/50 text-muted-foreground"
                  }`}
              >
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${s.done
                    ? "bg-khalti text-khalti-foreground"
                    : s.active
                      ? "bg-foreground text-background"
                      : "bg-border text-muted-foreground"
                    }`}
                >
                  {s.done ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                </span>
                {s.label}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Optional CV Autofill Assistant */}
        <Card className="rounded-2xl border-border/70 p-6 sm:p-8 mb-8">
          <div className="flex flex-col gap-6">
            <div className="flex-1 w-full mx-auto space-y-4">
              <ResumeDropzone
                onComplete={handleUpload}
                state={file ? uploadState : "idle"}
                progress={progress}
                file={file}
                onRemove={handleRemove}
                disabled={!recaptchaTokenState}
              />

              {!file && uploadState === "idle" && (
                <div className="flex flex-col items-center justify-center p-5 border border-dashed border-border/75 rounded-2xl bg-secondary/10 backdrop-blur-sm transition-all duration-300">

                  <div id="recaptcha-checkbox-container" className="min-h-[78px] flex items-center justify-center"></div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Master Form & Live JSON Preview Split Layout */}
        <div
          ref={formRef}
          className="mt-8 transition-opacity opacity-100"
        >
          {file && uploadState === "done" && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-khalti/20 bg-khalti/5 p-4 text-sm">
              <Sparkles className="mt-0.5 h-4 w-4 text-khalti" />
              <div>
                <div className="font-medium text-foreground">
                  CV parsing successful!
                </div>
                <div className="mt-0.5 text-muted-foreground">
                  Review prefilled data below and adjust where necessary.
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="mx-auto w-full space-y-6">
            {/* Personal Info Section */}
            <Card className="rounded-2xl border-border/70 p-6 sm:p-8">
              <SectionHeader step="Section 1" title="Personal Information" />
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FormField
                    id="personal_info.full_name"
                    label="Full Name"
                    required
                    prefilled={isPrefilled("personal_info.full_name")}
                    value={formData.personal_info.full_name}
                    onChange={(e) => updatePersonalInfo("full_name", e.target.value)}
                    error={errors["personal_info.full_name"]}
                  />
                </div>
                <FormField
                  id="personal_info.email"
                  label="Email Address"
                  required
                  type="email"
                  prefilled={isPrefilled("personal_info.email")}
                  value={formData.personal_info.email}
                  onChange={(e) => updatePersonalInfo("email", e.target.value)}
                  error={errors["personal_info.email"]}
                />
                <FormField
                  id="personal_info.phone"
                  label="Phone Number"
                  required
                  prefilled={isPrefilled("personal_info.phone")}
                  value={formData.personal_info.phone}
                  onChange={(e) => updatePersonalInfo("phone", e.target.value)}
                  error={errors["personal_info.phone"]}
                />
                {/* Removed Date of Birth, Gender, Nationality */}
              </div>

              <div className="mt-6 border-t pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Address</h4>
                <div className="grid gap-5 sm:grid-cols-3">
                  <FormField
                    id="personal_info.address.city"
                    label="City"
                    required
                    prefilled={isPrefilled("personal_info.address.city")}
                    value={formData.personal_info.address.city}
                    onChange={(e) => updateAddress("city", e.target.value)}
                    error={errors["personal_info.address.city"]}
                  />
                  <FormField
                    id="personal_info.address.state"
                    label="State / Province"
                    prefilled={isPrefilled("personal_info.address.state")}
                    value={formData.personal_info.address.state}
                    onChange={(e) => updateAddress("state", e.target.value)}
                    error={errors["personal_info.address.state"]}
                  />
                  <FormField
                    id="personal_info.address.country"
                    label="Country"
                    required
                    prefilled={isPrefilled("personal_info.address.country")}
                    value={formData.personal_info.address.country}
                    onChange={(e) => updateAddress("country", e.target.value)}
                    error={errors["personal_info.address.country"]}
                  />
                </div>
              </div>

              <div className="mt-6 border-t pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Online Profiles (Optional)</h4>
                <div className="grid gap-5 sm:grid-cols-3">
                  <FormField
                    id="personal_info.profiles.linkedin"
                    label="LinkedIn"
                    prefilled={isPrefilled("personal_info.profiles.linkedin")}
                    value={formData.personal_info.profiles.linkedin}
                    onChange={(e) => updateProfiles("linkedin", e.target.value)}
                  />
                  <FormField
                    id="personal_info.profiles.github"
                    label="GitHub"
                    prefilled={isPrefilled("personal_info.profiles.github")}
                    value={formData.personal_info.profiles.github}
                    onChange={(e) => updateProfiles("github", e.target.value)}
                  />
                  <FormField
                    id="personal_info.profiles.portfolio"
                    label="Portfolio / Site"
                    prefilled={isPrefilled("personal_info.profiles.portfolio")}
                    value={formData.personal_info.profiles.portfolio}
                    onChange={(e) => updateProfiles("portfolio", e.target.value)}
                  />
                </div>
              </div>
            </Card>

            {/* Professional Profile Section */}
            <Card className="rounded-2xl border-border/70 p-6 sm:p-8">
              <SectionHeader step="Section 2" title="Professional Profile" />
              <div className="grid gap-5">
                <FormField
                  id="professional_summary.summary"
                  as="textarea"
                  label="Professional Summary"
                  required
                  prefilled={isPrefilled("professional_summary.summary")}
                  value={formData.professional_summary.summary}
                  onChange={(e) => updateSummary("summary", e.target.value)}
                  error={errors["professional_summary.summary"]}
                />
                <div className="grid gap-5 sm:grid-cols-3">
                  <FormField
                    id="professional_summary.total_experience_years"
                    label="Total Experience (Years)"
                    required
                    type="number"
                    step="any"
                    min="0"
                    prefilled={isPrefilled("professional_summary.total_experience_years")}
                    value={formData.professional_summary.total_experience_years ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                      updateSummary("total_experience_years", val);
                    }}
                    error={errors["professional_summary.total_experience_years"]}
                  />
                  <FormField
                    id="professional_summary.expected_salary"
                    label="Expected Salary"
                    required
                    prefilled={isPrefilled("professional_summary.expected_salary")}
                    value={formData.professional_summary.expected_salary || ""}
                    onChange={(e) => updateSummary("expected_salary", e.target.value)}
                    error={errors["professional_summary.expected_salary"]}
                    placeholder="e.g. NPR 80,000 / month, Negotiable"
                  />
                  <FormField
                    id="professional_summary.notice_period_days"
                    label="Notice Period (Days)"
                    type="number"
                    prefilled={isPrefilled("professional_summary.notice_period_days")}
                    value={formData.professional_summary.notice_period_days || ""}
                    onChange={(e) => updateSummary("notice_period_days", parseInt(e.target.value, 10))}
                  />
                </div>

                <div className="space-y-1.5">
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
                    hint="Enter comma-separated items (e.g. Python, React, PostgreSQL)"
                  />
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label className="text-sm font-medium">
                    Are you legally authorized to work in Nepal? <span className="text-khalti">*</span>
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
                          ? "border-khalti bg-khalti/5 text-foreground"
                          : "border-border bg-white hover:border-khalti/40"
                          }`}
                      >
                        <RadioGroupItem id={`auth-${o.value}`} value={o.value} />
                        {o.label}
                      </Label>
                    ))}
                  </RadioGroup>
                  {!formData.professional_summary.authorized_to_work_in_nepal && (
                    <p className="text-xs text-destructive mt-1.5 font-medium">
                      ⚠️ You must be legally authorized to work in Nepal to submit your application.
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Dynamic Work Experience Section */}
            <Card className="rounded-2xl border-border/70 p-6 sm:p-8">
              <div className="flex items-center justify-between border-b pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Work Experience</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">List professional experience or corporate history.</p>
                </div>
                <Button
                  type="button"
                  onClick={addExperience}
                  size="sm"
                  className="bg-khalti text-khalti-foreground hover:bg-khalti/90 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Work
                </Button>
              </div>

              {errors["experience_or_projects"] && (
                <div className="mb-4 text-sm font-medium text-destructive bg-destructive/5 border border-destructive/10 rounded-xl px-4 py-3">
                  ⚠️ {errors["experience_or_projects"]}
                </div>
              )}

              {formData.experience.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-xl border-border/50">
                  No work experiences added yet. Click "+ Add Work" to populate experience fields.
                </div>
              )}

              <div className="space-y-6">
                {formData.experience.map((exp, idx) => (
                  <div key={exp._key} className="relative p-5 rounded-xl border border-border/80 bg-muted/20 space-y-4">
                    <button
                      type="button"
                      onClick={() => removeExperience(idx)}
                      className="absolute top-4 right-4 text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-muted"
                    >
                      <Trash className="h-4 w-4" />
                    </button>

                    <div className="text-xs font-bold uppercase tracking-wider text-khalti/90">Entry #{idx + 1}</div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        id={`experience.${idx}.company_name`}
                        label="Company Name"
                        required
                        value={exp.company_name}
                        onChange={(e) => updateExperience(idx, "company_name", e.target.value)}
                        error={errors[`experience.${idx}.company_name`]}
                      />
                      <FormField
                        id={`experience.${idx}.job_title`}
                        label="Job Title"
                        required
                        value={exp.job_title}
                        onChange={(e) => updateExperience(idx, "job_title", e.target.value)}
                        error={errors[`experience.${idx}.job_title`]}
                      />
                      <FormField
                        id={`experience.${idx}.employment_type`}
                        label="Employment Type"
                        value={exp.employment_type}
                        onChange={(e) => updateExperience(idx, "employment_type", e.target.value)}
                        hint="e.g. Full-time, Part-time, Internship"
                      />
                      <FormField
                        id={`experience.${idx}.location`}
                        label="Location"
                        value={exp.location}
                        onChange={(e) => updateExperience(idx, "location", e.target.value)}
                      />
                      <FormField
                        id={`experience.${idx}.start_date`}
                        label="Start Date"
                        type="date"
                        value={exp.start_date}
                        onChange={(e) => updateExperience(idx, "start_date", e.target.value)}
                        error={errors[`experience.${idx}.start_date`]}
                      />
                      <FormField
                        id={`experience.${idx}.end_date`}
                        label="End Date"
                        type="date"
                        value={exp.end_date}
                        disabled={exp.currently_working}
                        onChange={(e) => updateExperience(idx, "end_date", e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`exp-curr-${idx}`}
                        checked={exp.currently_working}
                        onChange={(e) => {
                          updateExperience(idx, "currently_working", e.target.checked);
                          if (e.target.checked) updateExperience(idx, "end_date", "");
                        }}
                        className="accent-[oklch(0.52_0.22_295)]"
                      />
                      <Label htmlFor={`exp-curr-${idx}`} className="text-xs select-none">I am currently working here</Label>
                    </div>

                    <FormField
                      id={`experience.${idx}.work_summary`}
                      as="textarea"
                      label="Work Summary / Duties"
                      value={exp.work_summary}
                      onChange={(e) => updateExperience(idx, "work_summary", e.target.value)}
                    />

                    <FormField
                      id={`experience.${idx}.technologies_used`}
                      label="Skills"
                      value={exp.technologies_used.join(", ")}
                      onChange={(e) =>
                        updateExperience(
                          idx,
                          "technologies_used",
                          e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean)
                        )
                      }
                      hint="Skills used (comma separated)"
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* Dynamic Education Section */}
            <Card className="rounded-2xl border-border/70 p-6 sm:p-8">
              <div className="flex items-center justify-between border-b pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Academic History</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Degrees, qualifications, and institutions.</p>
                </div>
                <Button
                  type="button"
                  onClick={addEducation}
                  size="sm"
                  className="bg-khalti text-khalti-foreground hover:bg-khalti/90 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Academic
                </Button>
              </div>

              {errors["education"] && (
                <div className="mb-4 text-sm font-medium text-destructive bg-destructive/5 border border-destructive/10 rounded-xl px-4 py-3">
                  ⚠️ {errors["education"]}
                </div>
              )}

              {formData.education.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-xl border-border/50">
                  No education listings yet. Click "+ Add Academic" to enter qualifications.
                </div>
              )}

              <div className="space-y-6">
                {formData.education.map((edu, idx) => (
                  <div key={edu._key} className="relative p-5 rounded-xl border border-border/80 bg-muted/20 space-y-4">
                    <button
                      type="button"
                      onClick={() => removeEducation(idx)}
                      className="absolute top-4 right-4 text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-muted"
                    >
                      <Trash className="h-4 w-4" />
                    </button>

                    <div className="text-xs font-bold uppercase tracking-wider text-khalti/90">Degree #{idx + 1}</div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        id={`education.${idx}.degree`}
                        label="Degree / Qualification"
                        required
                        value={edu.degree}
                        onChange={(e) => updateEducation(idx, "degree", e.target.value)}
                        error={errors[`education.${idx}.degree`]}
                        hint="e.g. B.E. Computer Engineering, High School Degree"
                      />
                      <FormField
                        id={`education.${idx}.institution_name`}
                        label="Institution Name"
                        required
                        value={edu.institution_name}
                        onChange={(e) => updateEducation(idx, "institution_name", e.target.value)}
                        error={errors[`education.${idx}.institution_name`]}
                      />
                      <FormField
                        id={`education.${idx}.field_of_study`}
                        label="Field of Study"
                        value={edu.field_of_study}
                        onChange={(e) => updateEducation(idx, "field_of_study", e.target.value)}
                        hint="e.g. Informatics, Science, Humanities"
                      />
                      <FormField
                        id={`education.${idx}.grade`}
                        label="Grade / GPA"
                        value={edu.grade}
                        onChange={(e) => updateEducation(idx, "grade", e.target.value)}
                        hint="e.g. GPA 3.8/4.0, 85%"
                      />
                      <FormField
                        id={`education.${idx}.start_date`}
                        label="Start Date"
                        type="date"
                        value={edu.start_date}
                        onChange={(e) => updateEducation(idx, "start_date", e.target.value)}
                        error={errors[`education.${idx}.start_date`]}
                      />
                      <FormField
                        id={`education.${idx}.end_date`}
                        label="End Date"
                        type="date"
                        value={edu.end_date}
                        onChange={(e) => updateEducation(idx, "end_date", e.target.value)}
                      />
                      <FormField
                        id={`education.${idx}.location`}
                        label="Location"
                        value={edu.location}
                        onChange={(e) => updateEducation(idx, "location", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Dynamic Projects Section */}
            <Card className="rounded-2xl border-border/70 p-6 sm:p-8">
              <div className="flex items-center justify-between border-b pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Projects</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Showcase portfolios, open source, or professional projects.</p>
                </div>
                <Button
                  type="button"
                  onClick={addProject}
                  size="sm"
                  className="bg-khalti text-khalti-foreground hover:bg-khalti/90 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Project
                </Button>
              </div>

              {errors["experience_or_projects"] && (
                <div className="mb-4 text-sm font-medium text-destructive bg-destructive/5 border border-destructive/10 rounded-xl px-4 py-3">
                  ⚠️ {errors["experience_or_projects"]}
                </div>
              )}

              {formData.projects.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-xl border-border/50">
                  No projects listed. Click "+ Add Project" to insert custom works.
                </div>
              )}

              <div className="space-y-6">
                {formData.projects.map((proj, idx) => (
                  <div key={proj._key} className="relative p-5 rounded-xl border border-border/80 bg-muted/20 space-y-4">
                    <button
                      type="button"
                      onClick={() => removeProject(idx)}
                      className="absolute top-4 right-4 text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-muted"
                    >
                      <Trash className="h-4 w-4" />
                    </button>

                    <div className="text-xs font-bold uppercase tracking-wider text-khalti/90">Project #{idx + 1}</div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        id={`projects.${idx}.project_name`}
                        label="Project Name"
                        required
                        value={proj.project_name}
                        onChange={(e) => updateProject(idx, "project_name", e.target.value)}
                        error={errors[`projects.${idx}.project_name`]}
                      />
                      <FormField
                        id={`projects.${idx}.github_url`}
                        label="GitHub URL"
                        value={proj.github_url}
                        onChange={(e) => updateProject(idx, "github_url", e.target.value)}
                      />
                      <FormField
                        id={`projects.${idx}.live_url`}
                        label="Live URL"
                        value={proj.live_url}
                        onChange={(e) => updateProject(idx, "live_url", e.target.value)}
                      />
                      <FormField
                        id={`projects.${idx}.technologies_used`}
                        label="Skills"
                        value={proj.technologies_used.join(", ")}
                        onChange={(e) =>
                          updateProject(
                            idx,
                            "technologies_used",
                            e.target.value
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean)
                          )
                        }
                        hint="Skills used (comma separated)"
                      />
                    </div>
                    <FormField
                      id={`projects.${idx}.description`}
                      as="textarea"
                      label="Project Description"
                      value={proj.description}
                      onChange={(e) => updateProject(idx, "description", e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* Certifications Section */}
            <Card className="rounded-2xl border-border/70 p-6 sm:p-8">
              <SectionHeader step="Section 5" title="Certifications" />

              <div className="space-y-6">
                {/* Dynamic Certifications */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Label className="text-sm font-semibold">Certifications</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Add professional credentials or licenses.</p>
                    </div>
                    <Button
                      type="button"
                      onClick={addCertification}
                      variant="outline"
                      size="xs"
                      className="h-7 text-xs flex items-center gap-1 hover:bg-muted"
                    >
                      <Plus className="h-3 w-3" /> Add Certificate
                    </Button>
                  </div>
                  {formData.certifications.length === 0 && (
                    <p className="text-xs text-muted-foreground italic bg-muted/20 p-3 rounded-lg border border-dashed">No certifications added. Click "Add Certificate" to register your achievements.</p>
                  )}
                  <div className="space-y-4">
                    {formData.certifications.map((cert, idx) => (
                      <div key={cert._key} className="relative p-5 rounded-xl border border-border/80 bg-muted/10 space-y-4">
                        <button
                          type="button"
                          onClick={() => removeCertification(idx)}
                          className="absolute top-4 right-4 text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-muted"
                        >
                          <Trash className="h-4 w-4" />
                        </button>

                        <div className="text-xs font-bold uppercase tracking-wider text-khalti/80">Certification #{idx + 1}</div>

                        <div className="grid gap-4 sm:grid-cols-3">
                          <FormField
                            id={`certifications.${idx}.name`}
                            label="Certification Name"
                            required
                            value={cert.name}
                            onChange={(e) => updateCertification(idx, "name", e.target.value)}
                            error={errors[`certifications.${idx}.name`]}
                          />
                          <FormField
                            id={`certifications.${idx}.issuer`}
                            label="Issuer"
                            value={cert.issuer}
                            onChange={(e) => updateCertification(idx, "issuer", e.target.value)}
                          />
                          <FormField
                            id={`certifications.${idx}.issue_date`}
                            label="Issue Date"
                            type="date"
                            value={cert.issue_date}
                            onChange={(e) => updateCertification(idx, "issue_date", e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Dynamic Achievements list */}
            <Card className="rounded-2xl border-border/70 p-6 sm:p-8">
              <SectionHeader step="Section 6" title="Achievements & Awards" />
              <div className="space-y-6">
                {/* Achievements List */}
                <div className="border-b pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label className="text-sm font-semibold">Achievements</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Enter any prominent milestones, hackathons, or records.</p>
                    </div>
                    <Button
                      type="button"
                      onClick={addAchievement}
                      variant="outline"
                      size="xs"
                      className="h-7 text-xs flex items-center gap-1 hover:bg-muted"
                    >
                      <Plus className="h-3 w-3" /> Add Achievement
                    </Button>
                  </div>
                  {formData.achievements.length === 0 && (
                    <p className="text-xs text-muted-foreground italic bg-muted/20 p-3 rounded-lg border border-dashed">No achievements added. Click "Add Achievement" to get started.</p>
                  )}
                  <div className="space-y-2">
                    {formData.achievements.map((ach, idx) => (
                      <div key={ach._key} className="flex items-center gap-2">
                        <div className="flex-1 w-full">
                          <FormField
                            id={`achievements.${idx}`}
                            label=""
                            value={ach.value}
                            onChange={(e) => updateAchievement(idx, e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAchievement(idx)}
                          className="text-muted-foreground hover:text-destructive p-2 rounded-md hover:bg-muted mt-1"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Awards List */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label className="text-sm font-semibold">Awards & Honors</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">List awards, honors, or scholarships received.</p>
                    </div>
                    <Button
                      type="button"
                      onClick={addAward}
                      variant="outline"
                      size="xs"
                      className="h-7 text-xs flex items-center gap-1 hover:bg-muted"
                    >
                      <Plus className="h-3 w-3" /> Add Award
                    </Button>
                  </div>
                  {formData.awards.length === 0 && (
                    <p className="text-xs text-muted-foreground italic bg-muted/20 p-3 rounded-lg border border-dashed">No awards added. Click "Add Award" to get started.</p>
                  )}
                  <div className="space-y-2">
                    {formData.awards.map((aw, idx) => (
                      <div key={aw._key} className="flex items-center gap-2">
                        <div className="flex-1 w-full">
                          <FormField
                            id={`awards.${idx}`}
                            label=""
                            value={aw.value}
                            onChange={(e) => updateAward(idx, e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAward(idx)}
                          className="text-muted-foreground hover:text-destructive p-2 rounded-md hover:bg-muted mt-1"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Additional Information Section */}
            <Card className="rounded-2xl border-border/70 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6 border-b border-border/60 pb-4">
                <div className="flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-khalti">Section 7</div>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight">Additional Information</h2>
                </div>
                <Button
                  type="button"
                  onClick={addCustomField}
                  variant="outline"
                  size="sm"
                  className="text-xs flex items-center gap-1 hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Custom Field
                </Button>
              </div>

              <div className="grid gap-5">
                {customFieldsList.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic bg-muted/20 p-4 rounded-xl border border-dashed text-center">
                    No custom fields added. Click "+ Add Custom Field" to provide specific attributes.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {customFieldsList.map((item, idx) => (
                      <div key={item._key} className="flex gap-4 items-start bg-muted/10 p-5 rounded-xl border border-border/60 relative">
                        <button
                          type="button"
                          onClick={() => removeCustomField(idx)}
                          className="absolute top-4 right-4 text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-muted"
                        >
                          <X className="h-4 w-4" />
                        </button>

                        <div className="space-y-4 w-full pt-2">
                          <FormField
                            id={`custom_fields_key_${idx}`}
                            label="Field Name"
                            required
                            placeholder="e.g. Expected Joining Date, Availability"
                            value={item.key}
                            onChange={(e) => updateCustomFieldItem(idx, "key", e.target.value)}
                          />
                          <FormField
                            id={`custom_fields_value_${idx}`}
                            label="Field Description"
                            as="textarea"
                            required
                            placeholder="e.g. 1st June, Immediate"
                            value={item.value}
                            onChange={(e) => updateCustomFieldItem(idx, "value", e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Submit Buttons */}
            <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-between">
              <p className="text-xs text-muted-foreground">
                By submitting, you agree that our recruiting team will review your CV.
              </p>
              <Button
                type="submit"
                size="lg"
                disabled={!ready || isSubmitting || !formData.professional_summary.authorized_to_work_in_nepal}
                className="w-full bg-khalti text-khalti-foreground hover:bg-khalti/90 sm:w-auto"
              >
                {isSubmitting ? "Submitting…" : "Submit Application"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
