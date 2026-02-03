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

The app lives at the **repo root**, so Vercel’s default Root Directory works. Connect the repo and deploy; no Root Directory change needed.
