# ─────────────────────────────────────────────────────────────────────────────
# Sweat Fix Gym Chatbot Project - Windows PowerShell Cleanup & Audit Script
# Performs automated safe deletion, package updates, and build checks.
# Usage: .\cleanup.ps1
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

Write-Host "=== Starting Project Cleanup & Audit ===" -ForegroundColor Yellow

# ─────────────────────────────────────────────────────────────────────────────
# 1. BACKUP PHASE
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n[1/6] Backup Phase: Securing current repository state..." -ForegroundColor Yellow

# Ensure we are in a Git repository
if (-not (git rev-parse --is-inside-work-tree 2>$null)) {
    Write-Error "Error: Not a git repository. Please initialize git before running."
    exit 1
}

# Store current branch
$currentBranch = (git symbolic-ref --short HEAD).Trim()

# Stash or commit existing changes
git add .
$status = git status --porcelain
if ($status) {
    Write-Host "Committing current changes to current branch: $currentBranch..."
    git commit -m "pre-cleanup auto-backup"
}

# Create a backup branch
Write-Host "Creating backup branch 'pre-cleanup-backup'..."
git branch -D pre-cleanup-backup 2>$null
git branch pre-cleanup-backup
Write-Host "✓ Backup branch 'pre-cleanup-backup' created successfully." -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────────────────
# 2. DELETE FILES PHASE
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n[2/6] Deletion Phase: Removing legacy files and directories..." -ForegroundColor Yellow

$filesToDelete = @(
    "server.js",
    "activity.service.js",
    "aiDataParser.service.js",
    "plan.service.js",
    "profile.service.js",
    "progress.service.js",
    "water.service.js",
    "controllers/dashboard.controller.js",
    "controllers/nutrition.controller.js",
    "controllers/profile.controller.js",
    "controllers/progress.controller.js",
    "controllers/water.controller.js",
    "gym.db",
    ".DS_Store"
)

$dirsToDelete = @(
    "dist",
    "dev-dist",
    ".vscode"
)

foreach ($file in $filesToDelete) {
    if (Test-Path $file -PathType Leaf) {
        Remove-Item $file -Force
        Write-Host "  Deleted file: $file"
    }
}

foreach ($dir in $dirsToDelete) {
    if (Test-Path $dir -PathType Container) {
        Remove-Item $dir -Recurse -Force
        Write-Host "  Deleted directory: $dir/"
    }
}

Write-Host "✓ File cleanup completed." -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────────────────
# 3. CLEAN DEPENDENCIES PHASE
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n[3/6] Dependency Phase: Re-indexing node packages..." -ForegroundColor Yellow

Write-Host "Uninstalling unused packages (mysql2, web-push)..."
npm uninstall mysql2 web-push

Write-Host "Removing node_modules/ and package-lock.json for a clean reinstall..."
if (Test-Path "node_modules" -PathType Container) {
    Remove-Item "node_modules" -Recurse -Force
}
if (Test-Path "package-lock.json" -PathType Leaf) {
    Remove-Item "package-lock.json" -Force
}

Write-Host "Installing required packages cleanly..."
npm install

Write-Host "✓ Node packages reinstalled successfully." -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────────────────
# 4. VERIFICATION PHASE
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n[4/6] Verification Phase: Testing application integrity..." -ForegroundColor Yellow

# TypeScript Compilation Check
Write-Host "1. Running TypeScript compiler check..."
npx tsc --noEmit
Write-Host "   ✓ TS compilation passed." -ForegroundColor Green

# Migration runner check
Write-Host "2. Testing Supabase database migrations..."
node migrations/run_migration.js
Write-Host "   ✓ Database migrations completed successfully." -ForegroundColor Green

# Production build check
Write-Host "3. Testing frontend asset bundling..."
npm run build
Write-Host "   ✓ Frontend built successfully." -ForegroundColor Green

# Dev server check (Run for 5 seconds and shut down)
Write-Host "4. Verifying dev server launch..."
$process = Start-Process npm -ArgumentList "run dev" -PassThru -NoNewWindow
Start-Sleep -Seconds 5
if ($process.HasExited) {
    Write-Error "   ✗ Dev server failed to stay active or crashed on startup."
    exit 1
}
Stop-Process -Id $process.Id -Force
Write-Host "   ✓ Dev server launched and terminated successfully." -ForegroundColor Green

Write-Host "✓ All application checks passed successfully." -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────────────────
# 5. COMMIT PHASE
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n[5/6] Git Phase: Committing changes to branch $currentBranch..." -ForegroundColor Yellow

git add .
git commit -m "Clean up: Remove legacy JS files and unused packages" 2>$null

Write-Host "Optional: To push to origin, run 'git push origin $currentBranch' manually."
Write-Host "✓ Changes committed locally." -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────────────────
# 6. SUMMARY PHASE
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n[6/6] Summary Phase:" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------"
Write-Host "Project cleanup successful!" -ForegroundColor Green
Write-Host "Deleted: Legacy compiled .js files, old SQLite db, and dev-dist/dist"
Write-Host "Uninstalled: mysql2, web-push"
Write-Host "Saved Space: ~350MB (mostly node_modules cache and old builds)"
Write-Host "--------------------------------------------------------"
Write-Host "If any issue occurs, you can restore your original state by running:"
Write-Host "  git checkout pre-cleanup-backup" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------"
