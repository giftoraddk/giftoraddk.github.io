#!/bin/sh
# AI Operations — install the knowledge MCP server into every AI client found on this machine (macOS / Linux).
#
#   curl -fsSL https://<site>/mcp/install.sh | MCP_URL='https://<llm>/mcp' sh
#
# Environment:
#   MCP_URL    (required) the MCP endpoint — in your purchase email and on /system/docs
#   MCP_TOKEN  (optional) the mcp_… token — left empty, the script asks for it (hidden), so it stays out of shell history
#   MCP_NAME   (optional) the server name in each client, default astro-knowledge
#
# Writes to (only clients that are installed — their config folder exists):
#   Claude Code     `claude mcp add --scope user` (when the claude command exists)
#   Cursor          ~/.cursor/mcp.json                       mcpServers.<name> = { url, headers }
#   VS Code         <Code/User>/mcp.json                     servers.<name> = { type: http, url, headers }
#   Claude Desktop  <Claude>/claude_desktop_config.json      mcpServers.<name> = npx mcp-remote … (needs Node.js)
#   Windsurf        ~/.codeium/windsurf/mcp_config.json      mcpServers.<name> = { serverUrl, headers }
# Each file is backed up to <file>.bak before writing; every other server in it is kept. Editing JSON needs Node.js —
# without it the script only sets up Claude Code and points you to the configs to paste. The token sits in these config
# files (that is how the clients read it) — a file the script creates is readable by its owner only (chmod 600).
set -eu

NAME="${MCP_NAME:-astro-knowledge}"
URL="${MCP_URL:-}"
TOKEN="${MCP_TOKEN:-}"

say() { printf '%s\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
skip() { printf '  \033[2m· %s\033[0m\n' "$*"; }
fail() { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

case "$URL" in
	https://*/mcp | http://localhost:*/mcp | http://127.0.0.1:*/mcp) ;;
	*) fail "MCP_URL must be the .../mcp endpoint (https) — see your purchase email or /system/docs." ;;
esac

if [ -z "$TOKEN" ]; then
	# stdin is the script itself (curl | sh) — ask through the terminal.
	[ -r /dev/tty ] || fail "No terminal to ask for the token — set MCP_TOKEN and run again."
	printf 'Paste your MCP_TOKEN (mcp_…, hidden while typing): ' > /dev/tty
	stty -echo < /dev/tty 2>/dev/null || true
	IFS= read -r TOKEN < /dev/tty || true
	stty echo < /dev/tty 2>/dev/null || true
	printf '\n' > /dev/tty
fi
TOKEN=$(printf '%s' "$TOKEN" | tr -d '[:space:]')
printf '%s' "$TOKEN" | grep -Eq '^mcp_[0-9a-f]{64}$' || fail "A token is mcp_ followed by 64 hex characters."

AUTH="Bearer $TOKEN"
OS=$(uname -s)
case "$OS" in
	Darwin) CODE_DIR="$HOME/Library/Application Support/Code/User"; DESKTOP_DIR="$HOME/Library/Application Support/Claude" ;;
	*) CODE_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/Code/User"; DESKTOP_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/Claude" ;;
esac

say ""
say "Installing MCP server \"$NAME\" → $URL"
say ""

# ── Claude Code ─────────────────────────────────────────────────────────────
if command -v claude >/dev/null 2>&1; then
	claude mcp remove --scope user "$NAME" >/dev/null 2>&1 || true
	if claude mcp add --scope user --transport http "$NAME" "$URL" --header "Authorization: $AUTH" >/dev/null 2>&1; then
		ok "Claude Code"
	else
		skip "Claude Code: \"claude mcp add\" failed — run the command from /system/docs by hand"
	fi
else
	skip "Claude Code: not installed"
fi

# ── JSON config files (need Node.js) ────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
	say ""
	say "No Node.js — skipping Cursor / VS Code / Claude Desktop / Windsurf. Paste their configs from /system/docs (one tab per client)."
	exit 0
fi

# merge <file> <kind>: read the file (if any), set exactly one <NAME> entry, write it back — values go in through the
# environment, never interpolated into the code.
merge() {
	MI_FILE="$1" MI_KIND="$2" MI_NAME="$NAME" MI_URL="$URL" MI_AUTH="$AUTH" node -e '
const fs = require("fs");
const { MI_FILE: file, MI_KIND: kind, MI_NAME: name, MI_URL: url, MI_AUTH: auth } = process.env;
let data = {};
if (fs.existsSync(file)) {
	let text = fs.readFileSync(file, "utf8");
	if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
	if (text.trim()) {
		try { data = JSON.parse(text); } catch { console.error("Invalid JSON, left untouched: " + file); process.exit(2); }
	}
	fs.copyFileSync(file, file + ".bak");
}
const headers = { Authorization: auth };
const entry = {
	cursor: { url, headers },
	vscode: { type: "http", url, headers },
	desktop: { command: "npx", args: ["-y", "mcp-remote", url, "--header", "Authorization:${AUTH_HEADER}"], env: { AUTH_HEADER: auth } },
	windsurf: { serverUrl: url, headers },
}[kind];
const key = kind === "vscode" ? "servers" : "mcpServers";
data[key] = { ...(data[key] || {}), [name]: entry };
const fresh = !fs.existsSync(file);
fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", fresh ? { mode: 0o600 } : undefined);
'
}

install_json() { # <label> <dir> <file> <kind>
	if [ ! -d "$2" ]; then skip "$1: not installed"; return; fi
	if merge "$2/$3" "$4"; then ok "$1  ($2/$3)"; else skip "$1: could not update $2/$3"; fi
}

install_json "Cursor" "$HOME/.cursor" "mcp.json" cursor
install_json "VS Code" "$CODE_DIR" "mcp.json" vscode
install_json "Claude Desktop" "$DESKTOP_DIR" "claude_desktop_config.json" desktop
install_json "Windsurf" "$HOME/.codeium/windsurf" "mcp_config.json" windsurf

say ""
say "Done. Restart Claude Desktop / Windsurf if they are open; Cursor and VS Code pick it up on their own."
say "Try asking your AI: \"call hub_info on $NAME\"."
