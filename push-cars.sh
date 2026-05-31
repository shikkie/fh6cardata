#!/usr/bin/env bash
# push-cars.sh — commit and push data/cars.json with a timestamped message.
# Use case: quickly publish newly discovered ordinal mappings.
#
# Usage:
#   ./push-cars.sh                     # auto message: "data: update cars.json (ordinals) [<date>]"
#   ./push-cars.sh "map ordinals 141, 2007"   # custom message suffix

set -euo pipefail

CARS_FILE="data/cars.json"
DATE=$(date '+%Y-%m-%d %H:%M')
SUFFIX="${1:-}"

if [ -n "$SUFFIX" ]; then
  MSG="data: $SUFFIX [$DATE]"
else
  MSG="data: update cars.json (ordinals) [$DATE]"
fi

# Verify the file exists and has changes
if ! git diff --quiet HEAD -- "$CARS_FILE" || git ls-files --others --exclude-standard | grep -q "^$CARS_FILE$"; then
  git add "$CARS_FILE"
  git commit -m "$MSG

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  git push
  echo "✅ Pushed: $MSG"
else
  echo "ℹ️  No changes in $CARS_FILE — nothing to push."
fi
