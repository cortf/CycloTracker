#!/usr/bin/env bash
# PostToolUse hook: after editing a .ts/.tsx file, run the TypeScript typecheck.
# On failure it feeds the errors back (exit 2) so they get fixed immediately.
set -uo pipefail

payload="$(cat)"
file="$(printf '%s' "$payload" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input.file_path)||"")}catch{process.stdout.write("")}})' 2>/dev/null)"

case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;  # only typecheck TypeScript edits
esac

dir="${CLAUDE_PROJECT_DIR:-.}"
cd "$dir" || exit 0

if ! out="$(npx --no-install tsc --noEmit 2>&1)"; then
  {
    echo "❌ tsc failed after editing ${file}:"
    printf '%s\n' "$out" | tail -30
  } >&2
  exit 2
fi
exit 0
