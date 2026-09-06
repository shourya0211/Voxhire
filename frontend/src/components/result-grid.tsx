import { Badge } from "@/components/ui/badge";
import type { CallRecord } from "@/lib/api";
import { EmptyState } from "@/components/page-header";

export function statusVariant(status: string): "default" | "secondary" | "outline" | "success" | "warning" {
  if (status === "COMPLETED" || status === "SENT") return "success";
  if (["FAILED", "NOT_CONNECTED", "CANCELLED"].includes(status)) return "warning";
  if (["IN_PROGRESS", "RINGING", "INITIATED", "SCHEDULED"].includes(status)) return "default";
  return "secondary";
}

export function ResultGrid({ calls }: { calls: CallRecord[] }) {
  if (!calls.length) {
    return (
      <EmptyState
        title="No conversations yet"
        body="Screen a candidate or run a reachout. Completed calls and structured answers will show up here."
      />
    );
  }

  return (
    <div className="grid gap-4">
      {calls.map((call) => (
        <article key={`${call.channel}-${call.id}`} className="surface overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
            <div>
              <h3 className="font-display text-2xl tracking-tight">{call.candidate_name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {call.channel} · {call.purpose} · {call.phone || "no number"}
              </p>
            </div>
            <Badge variant={statusVariant(call.status)}>{call.status}</Badge>
          </div>
          <div className="space-y-4 px-5 py-4 sm:px-6">
            {call.summary ? <p className="text-sm text-foreground/90">{call.summary}</p> : null}
            {call.message_body ? (
              <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{call.message_body}</p>
            ) : null}
            {Object.keys(call.result || {}).length > 0 ? (
              <dl className="grid gap-2 sm:grid-cols-2">
                {Object.entries(call.result).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-border bg-slate-50/70 px-3 py-2.5">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {key.replaceAll("_", " ")}
                    </dt>
                    <dd className="mt-1 text-sm font-medium">{String(value || "—")}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                Structured answers appear after the voice agent finishes.
              </p>
            )}
            {call.recording_url ? (
              <audio controls className="w-full" src={call.recording_url}>
                <track kind="captions" />
              </audio>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
