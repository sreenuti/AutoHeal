# AutoHeal

Agentic AI for Informatica log troubleshooting. Next.js dashboard at repo root — ready for Vercel (default root directory).

- **Repo:** [github.com/sreenuti/AutoHeal](https://github.com/sreenuti/AutoHeal)

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

## Pushing to GitHub

```powershell
.\push-to-github.ps1
```

To run on a schedule (e.g. daily), use **Task Scheduler** with:

- Program: `powershell.exe`
- Arguments: `-NoProfile -ExecutionPolicy Bypass -File "C:\AI Projects\Agentic AI\AutoHeal\push-to-github.ps1"`

## Deploying to Vercel

The app lives at the **repo root**. If you see **404 NOT_FOUND**:

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → your **AutoHeal** project → **Settings** → **General**.
2. Find **Root Directory**. If it is set to `autoheal-dashboard` (or anything else), **clear it** or set it to **`.`** so Vercel uses the repo root.
3. Click **Save**, then go to **Deployments** → **Redeploy** the latest deployment.

`vercel.json` at repo root tells Vercel to use Next.js and `npm run build`.
