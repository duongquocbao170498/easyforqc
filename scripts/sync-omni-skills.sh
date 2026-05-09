#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OMNI_ROOT="${OMNIAGENT_REPO_ROOT:-$HOME/Vexere/knowledge_base/omniagent}"
SOURCE_ROOT="$OMNI_ROOT/.agent/skills"
DEST_ROOT="$ROOT_DIR/vendor/qa-source"

if [[ ! -d "$SOURCE_ROOT" ]]; then
  echo "OmniAgent skills folder not found: $SOURCE_ROOT" >&2
  exit 1
fi

mkdir -p "$DEST_ROOT"

rsync -a --delete \
  --exclude ".DS_Store" \
  --exclude ".jira.local.json" \
  "$SOURCE_ROOT/create-jira-test-cases/" \
  "$DEST_ROOT/create-jira-test-cases/"

rsync -a --delete \
  --exclude ".DS_Store" \
  --exclude ".jira.local.json" \
  --exclude "__pycache__" \
  --exclude "assets/output" \
  "$SOURCE_ROOT/chatwoot-test-uat/" \
  "$DEST_ROOT/chatwoot-test-uat/"

if [[ "${SYNC_XMIND_SKILL:-false}" == "true" ]]; then
  rsync -a --delete \
    --exclude ".DS_Store" \
    --exclude ".jira.local.json" \
    "$SOURCE_ROOT/create-xmind-test-design/" \
    "$DEST_ROOT/create-xmind-test-design/"
else
  echo "Skipped create-xmind-test-design. Set SYNC_XMIND_SKILL=true only after preserving EasyForQC Docker-safe PNG conversion fallback."
fi

echo "Synced Omni skills into $DEST_ROOT"
