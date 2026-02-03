# Push AutoHeal to GitHub (run from time to time)
# Usage: .\push-to-github.ps1
# Optional: Schedule with Task Scheduler to run daily/weekly

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

Set-Location $repoRoot

# Only commit and push if there are changes
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No changes to push. Working tree clean."
    exit 0
}

git add -A
$date = Get-Date -Format "yyyy-MM-dd HH:mm"
git commit -m "AutoHeal sync: $date"
git push origin main

Write-Host "Pushed to https://github.com/sreenuti/AutoHeal.git (main)"
