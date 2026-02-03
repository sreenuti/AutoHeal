# AutoHeal

Agentic AI for Informatica log troubleshooting. This repo contains the **AutoHeal Dashboard** (Next.js) and related tooling.

- **Repo:** [github.com/sreenuti/AutoHeal](https://github.com/sreenuti/AutoHeal)
- **Dashboard:** See `autoheal-dashboard/` and its [README](autoheal-dashboard/README.md).

## Pushing to GitHub

To push your local changes from time to time:

```powershell
.\push-to-github.ps1
```

The script stages all changes, commits with a timestamp, and pushes to `origin main`. To run it on a schedule (e.g. daily), use **Task Scheduler** and set the action to:

- Program: `powershell.exe`
- Arguments: `-NoProfile -ExecutionPolicy Bypass -File "C:\AI Projects\Agentic AI\AutoHeal\push-to-github.ps1"`
