#!/bin/bash
#
# Shipmate Self-Learning Hooks Installer
#
# Installs self-learning hooks to .cursor/hooks/ in the current project
# and sets up the global diary directory at ~/.shipmate/diary/
#
# Compatible with Cursor IDE hooks system (v1.7+)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${1:-.}"
CURSOR_HOOKS_DIR="${PROJECT_DIR}/.cursor/hooks"
DIARY_DIR="${HOME}/.shipmate/diary"

# Check for Bun (preferred) or auto-install
if command -v bun &> /dev/null; then
    HOOK_RUNTIME="bun"
    HOOK_EXT="ts"
    HOOK_SRC_DIR="${SCRIPT_DIR}/ts"
    echo "✓ Bun detected ($(bun --version)) - using TypeScript hooks (~5ms startup)"
else
    echo "📦 Bun not found - installing for fast hooks (~5ms vs ~50ms startup)..."
    curl -fsSL https://bun.sh/install | bash

    # Source the updated PATH
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"

    if command -v bun &> /dev/null; then
        echo "✓ Bun installed successfully ($(bun --version))"
        HOOK_RUNTIME="bun"
        HOOK_EXT="ts"
        HOOK_SRC_DIR="${SCRIPT_DIR}/ts"
    else
        echo "⚠ Bun installation completed but not in PATH yet."
        echo "  Please restart your terminal and run this script again."
        echo "  Or run: source ~/.bashrc (or ~/.zshrc)"
        exit 1
    fi
fi

echo ""
echo "🚀 Installing Shipmate Self-Learning Hooks"
echo "   Project: ${PROJECT_DIR}"
echo "   Hooks:   ${CURSOR_HOOKS_DIR}"
echo "   Runtime: ${HOOK_RUNTIME}"
echo "   Diary:   ${DIARY_DIR}"
echo ""

# Create directories
echo "📁 Creating directories..."
mkdir -p "${CURSOR_HOOKS_DIR}"
mkdir -p "${DIARY_DIR}/entries"
mkdir -p "${DIARY_DIR}/summaries"
mkdir -p "${DIARY_DIR}/improvements"
mkdir -p "${HOME}/.shipmate/context"

# Hook files to install
HOOKS=(
    "detect-correction"
    "detect-tooling-hints"
    "capture-success"
    "detect-struggling"
    "track-errors"
    "track-file-edits"
    "code-quality-gate"
    "completion-reflection"
)

# Copy hook scripts
echo "📋 Copying ${HOOK_EXT} hook scripts..."
for hook in "${HOOKS[@]}"; do
    src="${HOOK_SRC_DIR}/${hook}.${HOOK_EXT}"
    if [ -f "$src" ]; then
        cp "$src" "${CURSOR_HOOKS_DIR}/"
        chmod +x "${CURSOR_HOOKS_DIR}/${hook}.${HOOK_EXT}"
    else
        echo "   ⚠ Missing: ${hook}.${HOOK_EXT}"
    fi
done

# Generate hooks.json
HOOKS_JSON="${PROJECT_DIR}/.cursor/hooks.json"

generate_hooks_json() {
    local runtime="$1"
    local ext="$2"

    cat << EOF
{
  "version": 1,
  "hooks": {
    "beforeSubmitPrompt": [
      { "command": "${runtime} .cursor/hooks/detect-correction.${ext}" },
      { "command": "${runtime} .cursor/hooks/capture-success.${ext}" },
      { "command": "${runtime} .cursor/hooks/detect-tooling-hints.${ext}" }
    ],
    "beforeShellExecution": [
      { "command": "${runtime} .cursor/hooks/detect-struggling.${ext}" }
    ],
    "afterShellExecution": [
      { "command": "${runtime} .cursor/hooks/track-errors.${ext}" }
    ],
    "afterFileEdit": [
      { "command": "${runtime} .cursor/hooks/track-file-edits.${ext}" },
      { "command": "${runtime} .cursor/hooks/code-quality-gate.${ext}" }
    ],
    "afterAgentResponse": [
      { "command": "${runtime} .cursor/hooks/capture-success.${ext}" }
    ],
    "stop": [
      { "command": "${runtime} .cursor/hooks/completion-reflection.${ext}" }
    ]
  }
}
EOF
}

if [ -f "${HOOKS_JSON}" ]; then
    echo "⚠️  ${HOOKS_JSON} already exists"
    echo "   Please manually merge or replace with:"
    echo ""
    generate_hooks_json "${HOOK_RUNTIME}" "${HOOK_EXT}"
    echo ""
    read -p "   Overwrite existing hooks.json? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        generate_hooks_json "${HOOK_RUNTIME}" "${HOOK_EXT}" > "${HOOKS_JSON}"
        echo "   ✓ hooks.json overwritten"
    fi
else
    echo "📝 Creating hooks.json..."
    generate_hooks_json "${HOOK_RUNTIME}" "${HOOK_EXT}" > "${HOOKS_JSON}"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "Hooks installed (${HOOK_RUNTIME}):"
echo "   - detect-correction.${HOOK_EXT}     (beforeSubmitPrompt)   - Detect user corrections"
echo "   - capture-success.${HOOK_EXT}       (beforeSubmitPrompt,   - Capture successful patterns"
echo "                                afterAgentResponse)"
echo "   - detect-tooling-hints.${HOOK_EXT}  (beforeSubmitPrompt)   - Remind about CLI tools"
echo "   - detect-struggling.${HOOK_EXT}     (beforeShellExecution) - Detect repeated commands"
echo "   - track-errors.${HOOK_EXT}          (afterShellExecution)  - Track command errors"
echo "   - track-file-edits.${HOOK_EXT}      (afterFileEdit)        - Track file modifications"
echo "   - code-quality-gate.${HOOK_EXT}     (afterFileEdit)        - Quick quality checks"
echo "   - completion-reflection.${HOOK_EXT} (stop)                 - Session reflection"
echo ""
echo "Diary location: ${DIARY_DIR}"
echo ""
echo "To process learnings, use: /shipmate-digest"
