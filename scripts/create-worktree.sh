#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: npm run worktree -- <branch-name> <path>"
  exit 1
fi

BRANCH="$1"
WORKTREE_PATH="$2"

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git worktree add "$WORKTREE_PATH" "$BRANCH"
else
  git worktree add -b "$BRANCH" "$WORKTREE_PATH"
fi

if [[ -f ".env.local" ]]; then
  cp .env.local "$WORKTREE_PATH/.env.local"
else
  echo "Warning: .env.local not found, skipping copy"
fi

if [[ -f "data/memory-lane.db" ]]; then
  mkdir -p "$WORKTREE_PATH/data"
  cp data/memory-lane.db "$WORKTREE_PATH/data/memory-lane.db"
else
  echo "Warning: data/memory-lane.db not found, skipping copy"
fi

npm install --prefix "$WORKTREE_PATH"

echo ""
echo "Worktree ready at $WORKTREE_PATH (branch: $BRANCH)"
echo "Run: cd $WORKTREE_PATH && npm run dev -- --port <PORT>"
