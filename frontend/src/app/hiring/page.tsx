"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ResultGrid } from "@/components/result-grid";
import { PageHeader, StatusPill } from "@/components/page-header";
import {
  api,
  type Agent,
  type CallRecord,
  type Candidate,
  type DashboardPayload,
  type IntegrationStatus,
} from "@/lib/api";

const selectClass =
  "mt-1 flex h-10 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

export default function HiringPage() {
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentId, setAgentId] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    title: "",
    location: "Bengaluru",
    headline: "",
  });
  const [context, setContext] = useState({
    company: "VoxHire",
    job_role: "Senior Backend Engineer",
    location: "Bengaluru",
    screening_focus: "Confirm interest, notice period, compensation, and joining timeline.",
    persona_name: "Asha",
    language: "ENGLISH",
    voice_persona: "NEHA",
    whatsapp_fallback: true,
  });

  async function refresh() {
    const [status, people, board] = await Promise.all([
      api<IntegrationStatus>("/api/integrations"),
      api<Candidate[]>("/api/candidates"),
      api<DashboardPayload>("/api/calls?purpose=hiring&sync=true"),
    ]);
    setIntegrations(status);
    setCandidates(people);
    setCalls(board.results);
    if (status.hunar) {
      try {
        const listed = await api<{ results: Agent[] }>("/api/agents");
        setAgents(listed.results || []);
        if (!agentId && listed.results?.[0]) setAgentId(listed.results[0].id);
      } catch {
        setAgents([]);
      }
    }
  }

  useEffect(() => {
    refresh().catch((err: Error) => setError(err.message));
    const timer = setInterval(() => {
      api<DashboardPayload>("/api/calls?purpose=hiring&sync=true")
        .then((board) => setCalls(board.results))
        .catch(() => undefined);
    }, 8000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(() => candidates.filter((item) => item.phone), [candidates]);

  async function addCandidate(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/candidates", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          source: "manual",
          skills: [],
          email: "",
          company: "",
          notes: "",
          profile_url: "",
        }),
      });
      setForm({ ...form, name: "", phone: "", headline: "" });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add candidate");
    } finally {
      setBusy(false);
    }
  }

  async function createAgent() {
    setError("");
    setBusy(true);
    try {
      const created = await api<Agent>("/api/agents", {
        method: "POST",
        body: JSON.stringify({
          name: "VoxHire Screening",
          purpose: "hiring",
          company: context.company,
          persona_name: context.persona_name,
          language: context.language,
          voice_persona: context.voice_persona,
        }),
      });
      setAgentId(created.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create agent");
    } finally {
      setBusy(false);
    }
  }

  async function screen(candidateIds?: number[]) {
    setError("");
    if (!agentId) {
      setError("Create or select a Hunar agent first.");
      return;
    }
    const ids =
      candidateIds ??
      selected.map((item) => item.id).filter((id): id is number => Boolean(id));
    if (!ids.length) {
      setError("Add at least one candidate with an E.164 phone number such as +9198XXXXXXX.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/hiring/screen", {
        method: "POST",
        body: JSON.stringify({
          agent_id: agentId,
          candidate_ids: ids,
          company: context.company,
          job_role: context.job_role,
          location: context.location,
          screening_focus: context.screening_focus,
          whatsapp_fallback: context.whatsapp_fallback,
        }),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start screening");
    } finally {
      setBusy(false);
    }
  }

  async function removeCandidate(candidateId: number) {
    setError("");
    setBusy(true);
    try {
      await api(`/api/candidates/${candidateId}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove candidate");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-shell space-y-6">
      <PageHeader
        eyebrow="Hiring"
        title="AI hiring assistant"
        description="Create a voice agent, add candidates, and run screening calls. Answers and recordings land on the results desk."
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusPill ok={Boolean(integrations?.hunar)} label={integrations?.hunar ? "Hunar connected" : "Hunar offline"} />
            <StatusPill ok={Boolean(integrations?.twilio_whatsapp)} label="WhatsApp fallback" />
          </div>
        }
      />

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Voice agent</CardTitle>
            <CardDescription>Configure company context, then create or select a Hunar agent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Company</Label>
                <Input className="mt-1" value={context.company} onChange={(e) => setContext({ ...context, company: e.target.value })} />
              </div>
              <div>
                <Label>Role</Label>
                <Input className="mt-1" value={context.job_role} onChange={(e) => setContext({ ...context, job_role: e.target.value })} />
              </div>
              <div>
                <Label>Location</Label>
                <Input className="mt-1" value={context.location} onChange={(e) => setContext({ ...context, location: e.target.value })} />
              </div>
              <div>
                <Label>Persona name</Label>
                <Input className="mt-1" value={context.persona_name} onChange={(e) => setContext({ ...context, persona_name: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Screening focus</Label>
              <Textarea
                className="mt-1"
                value={context.screening_focus}
                onChange={(e) => setContext({ ...context, screening_focus: e.target.value })}
              />
            </div>
            <div>
              <Label>Existing agent</Label>
              <select className={selectClass} value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                <option value="">Select an agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} · {agent.language}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button type="button" onClick={createAgent} disabled={busy || !integrations?.hunar}>
                Create screening agent
              </Button>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={context.whatsapp_fallback}
                  onChange={(e) => setContext({ ...context, whatsapp_fallback: e.target.checked })}
                />
                Queue WhatsApp follow-up
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add candidate</CardTitle>
            <CardDescription>Use an E.164 number (for example +91…) to place a live call.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={addCandidate}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Name</Label>
                  <Input className="mt-1" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    className="mt-1"
                    required
                    placeholder="+91..."
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Current title</Label>
                  <Input className="mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input className="mt-1" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Headline</Label>
                <Input className="mt-1" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
              </div>
              <Button type="submit" disabled={busy}>
                Save candidate
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Candidate board</CardTitle>
            <CardDescription>
              Call one person, or call all {selected.length} ready candidates.
            </CardDescription>
          </div>
          <Button onClick={() => screen()} disabled={busy || selected.length === 0}>
            Call all ready
          </Button>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No candidates yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {candidates.map((person) => (
                <li key={person.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{person.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {person.title || "Candidate"} · {person.phone || "add a phone number"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={person.phone ? "success" : "warning"}>
                      {person.phone ? "callable" : "needs phone"}
                    </Badge>
                    <Button
                      size="sm"
                      disabled={busy || !person.phone || !person.id || !integrations?.hunar}
                      onClick={() => person.id && screen([person.id])}
                    >
                      Call
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !person.id}
                      onClick={() => person.id && removeCandidate(person.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="font-display text-2xl tracking-tight">Live screening results</h2>
        <ResultGrid calls={calls} />
      </section>
    </main>
  );
}
