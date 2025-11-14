# Jira MCP Quickstart

Use this playbook whenever a new session starts so the Jira MCP server is obviously ready.

## 1. Load credentials
- Keep `/Users/greghogue/Leora2/.jira.env` up to date with `ATLASSIAN_SITE`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`, `ATLASSIAN_PROJECT_KEY`, and `ATLASSIAN_BOARD_ID`.
- Never commit this file (it’s ignored) and rotate the API token if you ever share the repo.

## 2. Confirm MCP configs are present
- **Codex CLI:** `/Users/greghogue/.codex/config.toml` should have a `[mcp_servers.jira-board]` block pointing at `/Users/greghogue/Leora2/mcp/jira-board-mcp/jira_mcp.py`.
- **Claude desktop:** `/Users/greghogue/.claude.json` must include the same `jira-board` entry under `"mcpServers"`.
- **Repo defaults:** `/Users/greghogue/Leora2/.mcp.json` mirrors the config so future agents inherit it automatically.

If any of those blocks disappear, re-run:
```bash
codex mcp add jira-board \
  /Users/greghogue/Leora2/mcp/jira-board-mcp/.venv/bin/python \
  /Users/greghogue/Leora2/mcp/jira-board-mcp/jira_mcp.py \
  --env ATLASSIAN_SITE=https://greghogue.atlassian.net \
  --env ATLASSIAN_EMAIL=greg.hogue@gmail.com \
  --env ATLASSIAN_API_TOKEN=<token> \
  --env ATLASSIAN_PROJECT_KEY=CRM \
  --env ATLASSIAN_BOARD_ID=1
```

## 3. Verify the server responds
From the web repo root:
```bash
../mcp/jira-board-mcp/.venv/bin/python - <<'PY'
import anyio, json
from pathlib import Path
from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.client.session import ClientSession

env_path = Path("/Users/greghogue/Leora2/.jira.env")
env = dict(
    line.split("=", 1)
    for line in env_path.read_text().splitlines()
    if line and not line.lstrip().startswith("#")
)

async def main():
    params = StdioServerParameters(
        command="/Users/greghogue/Leora2/mcp/jira-board-mcp/.venv/bin/python",
        args=["/Users/greghogue/Leora2/mcp/jira-board-mcp/jira_mcp.py"],
        env={k: v.strip('\"') for k, v in env.items()},
    )
    async with stdio_client(params) as (rs, ws):
        async with ClientSession(rs, ws) as session:
            await session.initialize()
            tools = await session.list_tools()
            print("Jira tools:", [t.name for t in tools.tools])

anyio.run(main)
PY
```
You should see the tool list (`jira_project_overview`, `jira_search_issues`, etc.). If not, re-check the env file/token.

## 4. Use the tools
- After Codex/Claude reloads, the `jira-board` MCP server appears automatically; call tools via the built-in MCP wrappers.
- Until reload finishes, run quick operations with the snippet above (e.g., `session.call_tool("jira_search_issues", {"params": {...}})`).

## 5. Operational tips
- The default project key is `CRM`; override per call with `params.project_key`.
- `ATLASSIAN_BOARD_ID=1` targets the CRM board; run `jira_list_boards` if you need another board id.
- Keep API responses short (`response_format: "markdown"`) unless you really need JSON.
- Treat `jira.md`, `.jira.env`, and both config files as sensitive—the API token grants full Jira access.
