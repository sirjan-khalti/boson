import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Home, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/jobs/JobCard";
import { API_BASE } from "@/lib/constants";

export default function SuccessPage() {
  const [jobsList, setJobsList] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/jobs/fetch`)
      .then((res) => res.json())
      .then((data) => setJobsList(data.filter((j: any) => j.status === "Active")))
      .catch((err) => console.error("Failed to fetch jobs", err));
  }, []);

  const related = jobsList.slice(0, 3);
  return (
    <div>
      <section className="hero-gradient">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-khalti text-khalti-foreground shadow-elevated">
            <PartyPopper className="h-9 w-9" />
          </div>
          <h1 className="mt-8 text-3xl font-bold tracking-tight sm:text-5xl">
            Application Submitted{" "}
            <span className="text-gradient-khalti">Successfully</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-muted-foreground sm:text-lg">
            Thank you for applying to Khalti. A real person on our recruiting team will review your
            application carefully and reach out within the next few business days.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-khalti text-khalti-foreground hover:bg-khalti/90">
              <Link to="/"><Home className="mr-2 h-4 w-4" /> Back to Careers</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/jobs"><ArrowLeft className="mr-2 h-4 w-4" /> Browse more roles</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">You might also like</h2>
          <p className="mt-2 text-muted-foreground">Other roles open at Khalti right now.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {related.map((j) => <JobCard key={j.id} job={j} />)}
        </div>
      </section>
    </div>
  );
}
