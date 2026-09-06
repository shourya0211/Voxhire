import Link from "next/link";
import { ArrowRight, PhoneCall, Search, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";

const MODULES = [
  {
    href: "/hiring",
    icon: PhoneCall,
    title: "AI hiring assistant",
    copy: "Create a Hunar voice agent, screen candidates by phone, and collect structured hiring signals.",
  },
  {
    href: "/search",
    icon: Search,
    title: "People search & reachout",
    copy: "Paste a job description, find matching talent, and reach out by voice with WhatsApp fallback.",
  },
  {
    href: "/attendance",
    icon: MapPinned,
    title: "Attendance without apps",
    copy: "Track 1,000 people across 100 sites using USSD, site IVR, RFID kiosks, and a supervisor browser.",
  },
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="animate-fade-up overflow-hidden rounded-3xl border border-border bg-[linear-gradient(135deg,#0b1220_0%,#123044_55%,#0f766e_100%)] px-6 py-12 text-white sm:px-10 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-200/90">VoxHire</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight tracking-tight sm:text-5xl">
          Hire and follow up by conversation.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-base">
          Voice screening, talent reachout, and a results desk — with Hunar Voice Agents on the backend and
          secrets kept off the client.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/hiring">
            <Button className="bg-white text-slate-900 hover:bg-slate-100">Start screening</Button>
          </Link>
          <Link href="/results">
            <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
              View results
            </Button>
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {MODULES.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="surface group p-5 transition-all hover:-translate-y-0.5 hover:border-teal-300 animate-fade-up"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-display text-xl tracking-tight">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.copy}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal-800">
                Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
