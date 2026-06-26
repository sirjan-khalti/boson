import { Link } from "react-router-dom";
import { Github, Linkedin, Twitter, Mail } from "lucide-react";
import { KhaltiLogo } from "./KhaltiLogo";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="border-t border-border bg-navy text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="[&_*]:!text-white">
              <KhaltiLogo />
            </div>
            <p className="max-w-xs text-sm text-white/70">
              Building Nepal's digital payments rail. Join a team that's redefining how the country
              moves money.
            </p>
            <div className="flex gap-3 pt-2">
              {[Twitter, Linkedin, Github, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition-colors hover:bg-khalti"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">
              Company
            </h4>
            <ul className="space-y-3 text-sm text-white/80">
              <li><a href="#" className="hover:text-white">About Khalti</a></li>
              <li><a href="#" className="hover:text-white">Newsroom</a></li>
              <li><a href="#" className="hover:text-white">Investors</a></li>
              <li><a href="#" className="hover:text-white">Press</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">
              Careers
            </h4>
            <ul className="space-y-3 text-sm text-white/80">
              <li><Link to="/jobs" className="hover:text-white">All Openings</Link></li>
              <li><a href="#" className="hover:text-white">Life at Khalti</a></li>
              <li><a href="#" className="hover:text-white">Benefits</a></li>
              <li><a href="#" className="hover:text-white">Interview Process</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">
              Don't see your role?
            </h4>
            <p className="mb-4 text-sm text-white/70">
              We're always meeting great people. Send us a note.
            </p>
            <Button asChild className="bg-khalti text-khalti-foreground hover:bg-khalti/90">
              <a href="mailto:careers@khalti.com">Get in touch</a>
            </Button>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-white/60">© {new Date().getFullYear()} Khalti by IME. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-white/60">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
