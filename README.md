# mql5-docs-mcp

[![CI](https://github.com/zafmy/mql5-docs-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/zafmy/mql5-docs-mcp/actions/workflows/ci.yml)

An MCP server that gives coding agents (Claude Code, Cursor, Claude Desktop) the **real** MQL5 function signatures and error-code meanings, so they stop writing MQL4 syntax or inventing functions when they build MetaTrader 5 EAs.

It runs locally over stdio with a prebuilt index. It makes no network calls at runtime and needs no API key.

## Tools

| Tool | What it does | Example |
|---|---|---|
| `search_reference` | Search built-in functions by name or section, up to 10 results | `Copy`, `Trade Functions` |
| `get_signature` | Exact signature(s), section and doc link for one function | `CopyBuffer` |
| `explain_code` | Trade server return codes and runtime errors, by number or constant | `10016`, `4014`, `TRADE_RETCODE_DONE` |

Example `get_signature("CopyBuffer")`:

```text
CopyBuffer (Timeseries and Indicators Access)
int CopyBuffer(int indicator_handle, int buffer_num, int start_pos, int count, double buffer[])
int CopyBuffer(int indicator_handle, int buffer_num, datetime start_time, int count, double buffer[])
int CopyBuffer(int indicator_handle, int buffer_num, datetime start_time, datetime stop_time, double buffer[])
https://www.mql5.com/en/docs/series/copybuffer
```

## Status (v0.1)

The index covers all **517** functions in the official function index (name, section and doc link) and all **296** trade return codes and runtime errors. Exact signatures are indexed for **203** functions so far, because mql5.com rate-limited the indexer partway through. For the rest, `get_signature` returns the doc link. Running `npm run build:index` again resumes from `.cache/` and fills in the gaps.

## Install

Claude Code:

```bash
claude mcp add mql5-docs -- npx -y github:zafmy/mql5-docs-mcp
```

Any other MCP client (`mcpServers` config):

```json
{ "mql5-docs": { "command": "npx", "args": ["-y", "github:zafmy/mql5-docs-mcp"] } }
```

## Scope

Covered: MQL5 built-in functions from the official function index, trade server return codes and runtime error codes.

Not covered: Standard Library classes (`CTrade` and friends), backtesting, broker connections and compiling. The index stores names, signatures, sections and links only. For the full explanation, follow the link to mql5.com.

## Develop

```bash
npm install
npm test               # builds and runs the tests against the bundled index
npx -y github:zafmy/mcp-smoke -- node dist/index.js   # smoke-tests the built server with mcp-smoke.json
npm run build:index    # re-scrapes the reference slowly (4 s/page), resumable via .cache/
npm run build:index:offline  # rebuilds data/ from .cache/ only, no network
```

## License

MIT for the code. MQL5 and MetaTrader are trademarks of MetaQuotes Ltd.; this project is not affiliated with them. Signatures and code descriptions come from the [official MQL5 reference](https://www.mql5.com/en/docs).
