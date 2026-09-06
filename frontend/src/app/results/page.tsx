"use client";

import { useEffect, useState } from "react";
import { ResultGrid } from "@/components/result-grid";
import { PageHeader } from "@/components/page-header";
import { api, type CallRecord, type DashboardPayload } from "@/lib/api";

export default function ResultsPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [stats, setStats] = useState<DashboardPayload["stats"] | null>(null);
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState("");

  async function load(nextPurpose = purpose) {
    const query = nextPurpose ? `?purpose=${nextPurpose}&sync=true` : "?sync=true";
    const data = await api<DashboardPayload>(`/api/calls${query}`);
    setCalls(data.results);
    setStats(data.stats);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
    const timer = setInterval(() => {
      load().catch(() => undefined);
    }, 6000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purpose]);

  const metrics = [
    ["Total", stats?.total ?? 0],
    ["In flight", stats?.in_flight ?? 0],
    ["Completed", stats?.completed ?? 0],
    ["Interested", stats?.interested ?? 0],
    ["Messages", stats?.queued_messages ?? 0],
  ] as const;

  return (
    <main className="page-shell space-y-6">
      <PageHeader
        eyebrow="Results"
        title="Conversation desk"
        description="Structured answers from Hunar calls — interest, notice period, compensation, next steps — plus recordings."
        actions={
          <select
            className="h-10 rounded-xl border border-input bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          >
            <option value="">All conversations</option>
            <option value="hiring">Hiring screens</option>
            <option value="outreach">Reachout</option>
          </select>
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map(([label, value]) => (
          <div key={label} className="surface px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-3xl tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <ResultGrid calls={calls} />
    </main>
  );
}
