const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : JSON.stringify(detail));
    this.status = status;
    this.detail = detail;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new ApiError(response.status, data?.detail ?? data?.message ?? text);
  }
  return data as T;
}

export type IntegrationStatus = {
  hunar: boolean;
  people_data_labs: boolean;
  apollo: boolean;
  twilio_sms: boolean;
  twilio_whatsapp: boolean;
  webhooks: boolean;
  people_search_provider: string;
};

export type Agent = {
  id: string;
  name: string;
  language?: string;
  voice_persona?: string;
  persona_name?: string;
  status?: string;
  custom_variables?: string[];
  result_schema?: Record<string, unknown>;
};

export type Candidate = {
  id?: number;
  job_id?: number | null;
  source: string;
  name: string;
  phone: string;
  email: string;
  title: string;
  company: string;
  location: string;
  headline: string;
  skills: string[];
  profile_url: string;
  notes?: string;
  match_score: number;
  why?: string;
};

export type CallRecord = {
  id: number;
  candidate_id: number;
  candidate_name: string;
  phone: string;
  channel: string;
  purpose: string;
  agent_id: string;
  hunar_call_id: string;
  request_id: string;
  status: string;
  lifecycle_status: string;
  result: Record<string, unknown>;
  recording_url: string;
  summary: string;
  message_body: string;
  error: string;
  created_at?: string;
};

export type DashboardPayload = {
  stats: {
    total: number;
    completed: number;
    in_flight: number;
    interested: number;
    queued_messages: number;
  };
  results: CallRecord[];
};

export const SAMPLE_JD = `Senior Backend Engineer — Bengaluru / Hybrid

We are hiring a Senior Backend Engineer to own APIs that power hiring workflows.

Requirements
- 4+ years with Python (FastAPI or Django)
- PostgreSQL, Redis, and production AWS
- Experience with webhooks, queues, and observability
- Bonus: voice/telephony, LLM tooling, or Next.js familiarity

Nice to have: TypeScript, Kubernetes, Kafka.
`;
