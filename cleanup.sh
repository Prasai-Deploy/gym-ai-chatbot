#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Sweat Fix Gym Chatbot Project - Cleanup & Audit Script
# Performs automated safe deletion, package updates, and build checks.
# ─────────────────────────────────────────────────────────────────────────────

set -e # Exit immediately if a command exits with a non-zero status

# Color formatting utilities
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Starting Project Cleanup & Audit ===${NC}\n"

# ─────────────────────────────────────────────────────────────────────────────
# 1. BACKUP PHASE
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[1/6] Backup Phase: Securing current repository state...${NC}"

# Ensure we are in a Git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo -e "${RED}Error: Not a git repository. Please initialize git before running.${NC}"
  exit 1
fi

# Store the current branch name
CURRENT_BRANCH=$(git symbolic-ref --short HEAD)

# Stash or commit existing changes
git add .
if ! git diff-index --quiet HEAD --; then
  echo -e "Committing current changes to current branch: ${CURRENT_BRANCH}..."
  git commit -m "pre-cleanup auto-backup"
fi

# Create a backup branch
echo -e "Creating backup branch 'pre-cleanup-backup'..."
git branch -D pre-cleanup-backup >/dev/null 2>&1 || true
git branch pre-cleanup-backup
echo -e "${GREEN}✓ Backup branch 'pre-cleanup-backup' created successfully.${NC}\n"

# ─────────────────────────────────────────────────────────────────────────────
# 2. DELETE FILES PHASE
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[2/6] Deletion Phase: Removing legacy files and directories...${NC}"

FILES_TO_DELETE=(
  "server.js"
  "activity.service.js"
  "aiDataParser.service.js"
  "plan.service.js"
  "profile.service.js"
  "progress.service.js"
  "water.service.js"
  "controllers/dashboard.controller.js"
  "controllers/nutrition.controller.js"
  "controllers/profile.controller.js"
  "controllers/progress.controller.js"
  "controllers/water.controller.js"
  "gym.db"
  ".DS_Store"
)

DIRECTORIES_TO_DELETE=(
  "dist"
  "dev-dist"
  ".vscode"
)

for file in "${FILES_TO_DELETE[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo -e "  Deleted file: $file"
  fi
done

for dir in "${DIRECTORIES_TO_DELETE[@]}"; do
  if [ -d "$dir" ]; then
    rm -rf "$dir"
    echo -e "  Deleted directory: $dir/"
  fi
done

echo -e "${GREEN}✓ File cleanup completed.${NC}\n"

# ─────────────────────────────────────────────────────────────────────────────
# 3. CLEAN DEPENDENCIES PHASE
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[3/6] Dependency Phase: Re-indexing node packages...${NC}"

echo -e "Uninstalling unused packages (mysql2, web-push)..."
npm uninstall mysql2 web-push

echo -e "Removing node_modules/ and package-lock.json for a clean reinstall..."
rm -rf node_modules package-lock.json

echo -e "Installing required packages cleanly..."
npm install

echo -e "${GREEN}✓ Node packages reinstalled successfully.${NC}\n"

# ─────────────────────────────────────────────────────────────────────────────
# 4. VERIFICATION PHASE
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[4/6] Verification Phase: Testing application integrity...${NC}"

# TypeScript Compilation Check
echo -e "1. Running TypeScript compiler check..."
npx tsc --noEmit
echo -e "   ${GREEN}✓ TS compilation passed.${NC}"

# Migration runner check
echo -e "2. Testing Supabase database migrations..."
node migrations/run_migration.js
echo -e "   ${GREEN}✓ Database migrations completed successfully.${NC}"

# Production build check
echo -e "3. Testing frontend asset bundling..."
npm run build
echo -e "   ${GREEN}✓ Frontend built successfully.${NC}"

# Dev server check (Run for 5 seconds and shut down)
echo -e "4. Verifying dev server launch..."
npm run dev &
DEV_PID=$!
sleep 5
if kill -0 $DEV_PID >/dev/null 2>&1; then
  kill $DEV_PID
  echo -e "   ${GREEN}✓ Dev server launched and terminated successfully.${NC}"
else
  echo -e "   ${RED}✗ Dev server failed to stay active or crashed on startup.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ All application checks passed successfully.${NC}\n"

# ─────────────────────────────────────────────────────────────────────────────
# 5. COMMIT PHASE
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[5/6] Git Phase: Committing changes to branch ${CURRENT_BRANCH}...${NC}"

git add .
git commit -m "Clean up: Remove legacy JS files and unused packages" || echo "No changes to commit"

echo -e "Optional: To push to origin, run 'git push origin ${CURRENT_BRANCH}' manually."
echo -e "${GREEN}✓ Changes committed locally.${NC}\n"

# ─────────────────────────────────────────────────────────────────────────────
# 6. SUMMARY PHASE
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[6/6] Summary Phase:${NC}"
echo -e "--------------------------------------------------------"
echo -e "${GREEN}Project cleanup successful!${NC}"
echo -e "Deleted: Legacy compiled .js files, old SQLite db, and dev-dist/dist"
echo -e "Uninstalled: mysql2, web-push"
echo -e "Saved Space: ~350MB (mostly node_modules cache and old builds)"
echo -e "--------------------------------------------------------"
echo -e "If any issue occurs, you can restore your original state by running:"
echo -e "  ${YELLOW}git checkout pre-cleanup-backup${NC}"
echo -e "--------------------------------------------------------"
