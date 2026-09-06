"use client";

import { useMemo, useState } from "react";
import { buildSites, IVR_SCRIPT } from "@/lib/attendance";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

const CHANNELS = [
  {
    title: "USSD on any GSM phone",
    body: "Workers dial a short code from a feature phone. Tower location plus a rotating site PIN binds the punch to a place — no smartphone, no data pack.",
  },
  {
    title: "Voice IVR in local languages",
    body: "Each site landline is the location identity. A voice agent confirms name out loud, supports Hindi, Tamil, Marathi and more, and logs the punch.",
  },
  {
    title: "Gate kiosk with RFID",
    body: "A cheap Linux terminal at the gate — device, not an app. Badge tap + PIN, offline queue, sync when the line is up.",
  },
  {
    title: "Supervisor browser",
    body: "Shift leads clear exceptions on a desktop browser. HQ watches one board for 1,000 people across 100 sites.",
  },
];

export default function AttendancePage() {
  const sites = useMemo(() => buildSites(), []);
  const [filter, setFilter] = useState<"all" | "alert" | "watch">("all");
  const visible = sites.filter((site) => (filter === "all" ? true : site.risk === filter));
  const present = sites.reduce((sum, site) => sum + site.present, 0);
  const headcount = sites.reduce((sum, site) => sum + site.headcount, 0);

  return (
    <main className="page-shell space-y-8">
      <PageHeader
        eyebrow="Attendance"
        title="1,000 people, 100 sites — no smartphones"
        description="LLMs and telephony still exist. Apps do not. Attendance lives on the network, the gate, and a shared voice line."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Sites", "100"],
          ["Punched in", `${present}/${headcount}`],
          ["Needs human", String(sites.filter((site) => site.risk === "alert").length)],
        ].map(([label, value]) => (
          <div key={label} className="surface px-5 py-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-4xl tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {CHANNELS.map((channel) => (
          <Card key={channel.title}>
            <CardHeader>
              <CardTitle>{channel.title}</CardTitle>
              <CardDescription>{channel.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl tracking-tight">Pulse map</h2>
            <p className="text-sm text-muted-foreground">Simulated live board. Color is fill rate, not geography.</p>
          </div>
          <div className="flex gap-2">
            {(["all", "watch", "alert"] as const).map((item) => (
              <button
                key={item}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs capitalize transition-colors",
                  filter === item ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-10">
          {visible.map((site) => (
            <div
              key={site.id}
              title={`${site.name}: ${site.present}/${site.headcount} via ${site.method}`}
              className={cn(
                "aspect-square rounded-lg transition-transform hover:scale-105",
                site.risk === "clear" ? "bg-emerald-600" : site.risk === "watch" ? "bg-amber-500" : "bg-rose-600",
              )}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Clear</Badge>
          <Badge variant="warning">Watch</Badge>
          <Badge>Alert</Badge>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>How a morning runs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              06:30 — Site landlines are known to the IVR. Late workers missed-call a short code; the system calls back in their language.
            </p>
            <p>
              07:45 — USSD peaks. The LLM sits behind the gateway, not on the handset, and flags clone punches across towers.
            </p>
            <p>
              08:30 — HQ sees 100 tiles. Only red sites need a human. Payroll gets a clean file by evening.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>IVR transcript</CardTitle>
            <CardDescription>Same voice-agent idea as hiring, pointed at attendance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {IVR_SCRIPT.map((line) => (
              <div key={line.text} className="rounded-xl bg-muted/60 px-3 py-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-teal-800">{line.who}</span>
                <p className={cn("mt-1 text-sm", line.who === "Pulse" ? "text-foreground" : "text-muted-foreground")}>
                  {line.text}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
