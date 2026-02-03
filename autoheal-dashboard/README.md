# AutoHeal – Informatica Log Troubleshooter

A Next.js 15 dashboard that uses the Vercel AI SDK to troubleshoot Informatica logs. An AI agent analyzes fatal errors, looks up SOP guidance by error code, and suggests fixes with confidence scores.

## Features

- **Mock Log API** – Synthetic Informatica logs with Node ID, Workflow Name, and Error Hex Codes (e.g. `0x80040115`)
- **Reasoning Loop Agent** – Uses `generateText` with `stopWhen: stepCountIs(5)` to think → call tools → think in a single request
- **Tools** – `get_sop_guidance` (SOP lookup by error code) and `simulate_fix` (success/fail for proposed actions)
- **Dashboard** – Banking-style layout with log table, KPIs, and AI reasoning panel

## Prerequisites

- Node.js 18+
- OpenAI API key (for the ops agent)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` and add your OpenAI API key:

   ```env
   OPENAI_API_KEY=sk-...
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Usage

1. View synthetic fatal logs in the table.
2. Select a log row.
3. Click **Troubleshoot**.
4. Review the agent’s explanation, confidence score, tool calls, and reasoning steps in the right panel.

## Project Structure

```
/app
  /api/logs/route.ts      – Mock endpoint returning synthetic logs
  /actions/ai-ops.ts      – Server action for troubleshooting
/lib
  /agents/ops-agent.ts    – Agent with get_sop_guidance & simulate_fix tools
  /data/synthetic-gen.ts  – Faker.js logic for Informatica logs
  /knowledge/sop-db.ts    – SOP entries keyed by error hex code
/components
  /dashboard/log-table.tsx
  /dashboard/reasoning-panel.tsx
  /dashboard/dashboard-client.tsx
```

## Tech Stack

- Next.js 16 (canary)
- Vercel AI SDK (`ai`, `@ai-sdk/openai`)
- Tailwind CSS
- Shadcn-style UI components
