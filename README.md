# VoxHire

**Voice-first hiring platform** powered by [Hunar Voice Agents](https://hunar.ai).

VoxHire helps recruiters screen candidates and reach out to talent over phone — then brings structured answers back into a live dashboard. WhatsApp/SMS is available as a fallback when a call does not connect.

---

## Features

### 1. AI Hiring Assistant
- Create Hunar voice agents for screening
- Add candidates and place **individual or bulk** calls
- Collect structured outcomes: interest, notice period, compensation, experience, recommendation
- View recordings and answers on the Results desk

### 2. People Search & Reachout
- Paste a job description
- Rank matching talent (People Data Labs / Apollo.io when API keys are set; otherwise a built-in ranked talent graph)
- Reach out via Voice AI with WhatsApp/SMS backup
- Conversation responses land on the same dashboard

### 3. Attendance without smartphones or apps
- Design for **1,000 people across 100 locations**
- USSD · site landline IVR · RFID gate kiosks · supervisor browser
- Interactive 100-site pulse map

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Python, FastAPI, SQLAlchemy, SQLite |
| Voice | Hunar Voice Agents API |
| Optional | People Data Labs, Apollo.io, Twilio (WhatsApp/SMS) |

---

## Architecture

```
┌─────────────────┐     /api/*      ┌──────────────────┐
│  Next.js (UI)   │ ───────────────► │  FastAPI backend │
└─────────────────┘                  └────────┬─────────┘
                                              │
                     ┌────────────────────────┼────────────────────────┐
                     ▼                        ▼                        ▼
              Hunar Voice API          PDL / Apollo              Twilio (optional)
              agents + calls           people search             WhatsApp / SMS
                     │
                     ▼
              Webhooks + polling  →  Results dashboard
```

Secrets stay on the server. The frontend never receives API keys.

---

## Quick start

### Prerequisites
- Python 3.11+
- Node.js 20+
- A Hunar API key

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env`:

```env
HUNAR_API_KEY=your_hunar_key_here
CORS_ORIGINS=http://localhost:3000
```

Optional:

```env
PDL_API_KEY=
APOLLO_API_KEY=
CALLBACK_BASE_URL=https://your-public-api.example.com
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
TWILIO_WHATSAPP_FROM=
```

Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

- API: http://127.0.0.1:8000  
- Docs: http://127.0.0.1:8000/docs  

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### Docker (optional)

```bash
# create backend/.env first
docker compose up --build
```

---

## Security

- **Never commit** `backend/.env` or any live API keys
- Keys are loaded only via environment variables
- Hunar webhook signatures are verified when callbacks are configured
- Demo search profiles ship **without phone numbers** so you never dial strangers by accident

---

## How voice results reach the dashboard

1. Create an agent (`POST /agents`) with a result schema  
2. Place a call (`POST /calls`) with `custom_data` (company, role, location, screening focus)  
3. If `CALLBACK_BASE_URL` is set, Hunar posts status/result/recording to `/api/webhooks/hunar`  
4. The UI also polls `/api/calls?sync=true` to refresh from Hunar  

Calling hours follow your Hunar org guardrails (typically **08:00–21:00 IST**).

---

## Project structure

```
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── main.py
│   │   ├── routers.py
│   │   ├── hunar.py         # Hunar Voice API client
│   │   ├── people/          # JD parsing + search providers
│   │   └── ...
│   ├── requirements.txt
│   └── .env.example
├── frontend/                # Next.js + TypeScript UI
│   └── src/app/
│       ├── hiring/
│       ├── search/
│       ├── results/
│       └── attendance/
├── docker-compose.yml
└── README.md
```

---

## App routes

| Route | Purpose |
| --- | --- |
| `/` | Overview |
| `/hiring` | Screening agents, candidates, individual/bulk calls |
| `/search` | JD → people search → reachout |
| `/results` | Conversation desk (answers + recordings) |
| `/attendance` | No-smartphone attendance design |

---

## Deploy

1. **API** — Render / Railway / Fly  
   - Set `HUNAR_API_KEY`, `CORS_ORIGINS`, `CALLBACK_BASE_URL`  
2. **Web** — Vercel  
   - Set `API_URL` to your backend URL (used by Next.js rewrites)

---

## License

Built as a selection assignment for Hunar.ai. Source provided for evaluation.
