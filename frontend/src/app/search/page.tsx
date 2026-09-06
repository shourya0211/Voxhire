"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatusPill } from "@/components/page-header";
import {
  SAMPLE_JD,
  api,
  type Agent,
  type Candidate,
  type IntegrationStatus,
} from "@/lib/api";

type SearchResponse = {
  provider: string;
  job: { title: string; location: string; skills: string[]; company: string };
  results: Candidate[];
};

const selectClass =
  "flex h-10 rounded-xl border border-input bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

export default function SearchPage() {
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentId, setAgentId] = useState("");
  const [jd, setJd] = useState(SAMPLE_JD);
  const [company, setCompany] = useState("VoxHire");
  const [hits, setHits] = useState<Candidate[]>([]);
  const [provider, setProvider] = useState("");
  const [job, setJob] = useState({ title: "Senior Backend Engineer", location: "Bengaluru" });
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [phones, setPhones] = useState<Record<string, string>>({});
  const [channels, setChannels] = useState({ voice: true, whatsapp: true, sms: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<IntegrationStatus>("/api/integrations")
      .then(async (status) => {
        setIntegrations(status);
        if (status.hunar) {
          const listed = await api<{ results: Agent[] }>("/api/agents");
          setAgents(listed.results || []);
          if (listed.results?.[0]) setAgentId(listed.results[0].id);
        }
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  async function runSearch() {
    setError("");
    setBusy(true);
    try {
      const data = await api<SearchResponse>("/api/search", {
        method: "POST",
        body: JSON.stringify({ job_description: jd, company, size: 10 }),
      });
      setProvider(data.provider);
      setJob({ title: data.job.title, location: data.job.location || "Bengaluru" });
      setHits(data.results);
      setSelected({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  async function createAgent() {
    setBusy(true);
    setError("");
    try {
      const created = await api<Agent>("/api/agents", {
        method: "POST",
        body: JSON.stringify({
          name: "VoxHire Reachout",
          purpose: "outreach",
          company,
          persona_name: "Kabir",
          voice_persona: "ROY",
        }),
      });
      setAgentId(created.id);
      const listed = await api<{ results: Agent[] }>("/api/agents");
      setAgents(listed.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create agent");
    } finally {
      setBusy(false);
    }
  }

  async function reachout() {
    const payload = hits
      .map((hit, index) => ({ hit, index }))
      .filter(({ hit, index }) => selected[`${hit.name}-${index}`])
      .map(({ hit, index }) => ({
        ...hit,
        phone: phones[`${hit.name}-${index}`] || hit.phone,
        source: hit.source,
      }));
    if (!payload.length) {
      setError("Select at least one person.");
      return;
    }
    if (channels.voice && !agentId) {
      setError("Create or select a reachout agent for voice.");
      return;
    }
    if (channels.voice && payload.some((item) => !item.phone)) {
      setError("Voice reachout needs an E.164 number on every selected row.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const activeChannels = [
        channels.voice ? "voice" : null,
        channels.whatsapp ? "whatsapp" : null,
        channels.sms ? "sms" : null,
      ].filter(Boolean);
      await api("/api/search/reachout", {
        method: "POST",
        body: JSON.stringify({
          agent_id: agentId || "unused",
          candidates: payload,
          job_description: jd,
          company,
          job_role: job.title,
          location: job.location,
          channels: activeChannels,
        }),
      });
      setMessage("Reachout queued. Open Results to watch answers as calls complete.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reachout failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-shell space-y-6">
      <PageHeader
        eyebrow="Search"
        title="People search & reachout"
        description="Paste a job description, rank matching talent, then reach out by voice with WhatsApp or SMS as backup."
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusPill ok label={`Provider: ${integrations?.people_search_provider || "…"}`} />
            <StatusPill ok={Boolean(integrations?.people_data_labs)} label="PDL" />
            <StatusPill ok={Boolean(integrations?.apollo)} label="Apollo" />
          </div>
        }
      />

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Job description</CardTitle>
          <CardDescription>Title, skills, and location are parsed server-side for matching.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Company</Label>
            <Input className="mt-1" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <Textarea rows={10} value={jd} onChange={(e) => setJd(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={runSearch} disabled={busy}>
              Search people
            </Button>
            <Button variant="outline" onClick={createAgent} disabled={busy || !integrations?.hunar}>
              Create reachout agent
            </Button>
          </div>
        </CardContent>
      </Card>

      {hits.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Matches {provider ? `via ${provider}` : ""}</CardTitle>
            <CardDescription>
              Demo profiles have no phones by default. Paste your number to test a live Hunar call.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Person</TableHead>
                  <TableHead>Why</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hits.map((hit, index) => {
                  const key = `${hit.name}-${index}`;
                  return (
                    <TableRow key={key}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={Boolean(selected[key])}
                          onChange={(e) => setSelected({ ...selected, [key]: e.target.checked })}
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{hit.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {hit.title} · {hit.company} · {hit.location}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {hit.skills?.slice(0, 4).map((skill) => (
                            <Badge key={skill} variant="outline">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {hit.why || `${hit.match_score} match`}
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="+91..."
                          value={phones[key] ?? hit.phone}
                          onChange={(e) => setPhones({ ...phones, [key]: e.target.value })}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center gap-4">
              <select className={selectClass} value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                <option value="">Voice agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              {(["voice", "whatsapp", "sms"] as const).map((channel) => (
                <label key={channel} className="flex items-center gap-2 text-sm capitalize text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={channels[channel]}
                    onChange={(e) => setChannels({ ...channels, [channel]: e.target.checked })}
                  />
                  {channel}
                </label>
              ))}
              <Button onClick={reachout} disabled={busy}>
                Reach out
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
