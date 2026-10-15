# AI Operations - install the knowledge MCP server into every AI client found on this machine
# (Windows PowerShell 5.1+ / PowerShell 7).
#
#   $env:MCP_URL='https://<llm>/mcp'; irm https://<site>/mcp/install.ps1 | iex
#
# Environment:
#   MCP_URL    (required) the MCP endpoint - in your purchase email and on /system/docs
#   MCP_TOKEN  (optional) the mcp_... token - left empty, the script asks for it (hidden), so it stays out of shell history
#   MCP_NAME   (optional) the server name in each client, default astro-knowledge
#
# Writes to (only clients that are installed - their config folder exists), backing each file up to <file>.bak first and
# keeping every other server in it:
#   Claude Code     `claude mcp add --scope user` (when the claude command exists)
#   Cursor          %USERPROFILE%\.cursor\mcp.json
#   VS Code         %APPDATA%\Code\User\mcp.json
#   Claude Desktop  %APPDATA%\Claude\claude_desktop_config.json   (npx mcp-remote - needs Node.js)
#   Windsurf        %USERPROFILE%\.codeium\windsurf\mcp_config.json
#
# ASCII only, on purpose: `irm` may decode a download without a charset as ANSI, and UTF-8 bytes read that way can turn
# into "smart quotes" - which PowerShell parses as real quotes. Run through `irm | iex`, so everything sits in one
# scriptblock and only ever `return`s - `exit` would close the user's PowerShell window.

& {
    $ErrorActionPreference = 'Stop'
    $name = if ($env:MCP_NAME) { $env:MCP_NAME } else { 'astro-knowledge' }
    $url = "$env:MCP_URL".Trim()
    $token = "$env:MCP_TOKEN".Trim()

    function Ok($text) { Write-Host "  [ok] $text" -ForegroundColor Green }
    function Skip($text) { Write-Host "  [--] $text" -ForegroundColor DarkGray }

    if ($url -notmatch '^(https://.+|http://(localhost|127\.0\.0\.1):\d+)/mcp$') {
        Write-Host 'MCP_URL must be the .../mcp endpoint (https) - see your purchase email or /system/docs.' -ForegroundColor Red
        return
    }
    if (-not $token) {
        $secure = Read-Host 'Paste your MCP_TOKEN (mcp_..., hidden while typing)' -AsSecureString
        $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        try { $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr).Trim() }
        finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
    }
    if ($token -notmatch '^mcp_[0-9a-f]{64}$') {
        Write-Host 'A token is mcp_ followed by 64 hex characters.' -ForegroundColor Red
        return
    }
    $auth = "Bearer $token"

    Write-Host ''
    Write-Host "Installing MCP server '$name' -> $url"
    Write-Host ''

    # -- Claude Code -----------------------------------------------------------
    if (Get-Command claude -ErrorAction SilentlyContinue) {
        try { & claude mcp remove --scope user $name 2>$null | Out-Null } catch {}
        $added = $false
        try {
            & claude mcp add --scope user --transport http $name $url --header "Authorization: $auth" 2>$null | Out-Null
            $added = $LASTEXITCODE -eq 0
        } catch {}
        if ($added) { Ok 'Claude Code' } else { Skip 'Claude Code: "claude mcp add" failed - run the command from /system/docs by hand' }
    } else { Skip 'Claude Code: not installed' }

    # -- JSON config files -----------------------------------------------------
    $headers = [ordered]@{ Authorization = $auth }
    $entries = @{
        cursor   = [ordered]@{ url = $url; headers = $headers }
        vscode   = [ordered]@{ type = 'http'; url = $url; headers = $headers }
        desktop  = [ordered]@{ command = 'npx'; args = @('-y', 'mcp-remote', $url, '--header', 'Authorization:${AUTH_HEADER}'); env = [ordered]@{ AUTH_HEADER = $auth } }
        windsurf = [ordered]@{ serverUrl = $url; headers = $headers }
    }
    $utf8 = New-Object System.Text.UTF8Encoding $false # no BOM - Claude Desktop (JSON.parse) rejects one

    function Install-Json($label, $dir, $file, $kind) {
        if (-not (Test-Path -LiteralPath $dir -PathType Container)) { Skip "${label}: not installed"; return }
        $path = Join-Path $dir $file
        $data = [ordered]@{}
        if (Test-Path -LiteralPath $path) {
            $text = [IO.File]::ReadAllText($path).TrimStart([char]0xFEFF)
            if ($text.Trim()) {
                try { $parsed = $text | ConvertFrom-Json } catch { Skip "${label}: invalid JSON, left untouched: $path"; return }
                foreach ($p in $parsed.PSObject.Properties) { $data[$p.Name] = $p.Value }
            }
            Copy-Item -LiteralPath $path -Destination "$path.bak" -Force
        }
        $key = if ($kind -eq 'vscode') { 'servers' } else { 'mcpServers' }
        $servers = [ordered]@{}
        if ($data.Contains($key) -and $data[$key]) { foreach ($p in $data[$key].PSObject.Properties) { $servers[$p.Name] = $p.Value } }
        $servers[$name] = $entries[$kind]
        $data[$key] = $servers
        [IO.File]::WriteAllText($path, ($data | ConvertTo-Json -Depth 20) + "`n", $utf8)
        Ok "$label  ($path)"
    }

    Install-Json 'Cursor' (Join-Path $env:USERPROFILE '.cursor') 'mcp.json' 'cursor'
    Install-Json 'VS Code' (Join-Path $env:APPDATA 'Code\User') 'mcp.json' 'vscode'
    Install-Json 'Claude Desktop' (Join-Path $env:APPDATA 'Claude') 'claude_desktop_config.json' 'desktop'
    Install-Json 'Windsurf' (Join-Path $env:USERPROFILE '.codeium\windsurf') 'mcp_config.json' 'windsurf'

    if (-not (Get-Command npx -ErrorAction SilentlyContinue)) { Skip 'Claude Desktop needs Node.js (npx) to run mcp-remote - get it from nodejs.org' }
    Write-Host ''
    Write-Host 'Done. Restart Claude Desktop / Windsurf if they are open; Cursor and VS Code pick it up on their own.'
    Write-Host "Try asking your AI: `"call hub_info on $name`"."
}
