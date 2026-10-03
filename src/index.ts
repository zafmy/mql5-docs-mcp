#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { explainCode, getFunction, MAX_RESULTS, search, type Fn } from './lookup.js';

const server = new McpServer({ name: 'mql5-docs-mcp', version: '0.1.0' });
const reply = (text: string) => ({ content: [{ type: 'text' as const, text }] });
const show = (f: Fn) => [`${f.name} (${f.section})`, ...(f.signatures.length ? f.signatures : ['(signature not indexed, see link)']), f.url].join('\n');

server.registerTool('search_reference', {
  description: `Search the official MQL5 (MetaTrader 5) function reference by name or section. Returns up to ${MAX_RESULTS} matches with signatures and doc links. Use before writing MQL5 calls to avoid MQL4 syntax or invented functions.`,
  inputSchema: { query: z.string().min(1).max(100), limit: z.number().int().min(1).max(MAX_RESULTS).optional() },
}, async ({ query, limit }) => {
  const hits = search(query, limit);
  return reply(hits.length ? hits.map(show).join('\n\n') : `No MQL5 function matches "${query}". It may not exist in MQL5.`);
});

server.registerTool('get_signature', {
  description: 'Get the exact MQL5 signature(s), section and official doc link for one function, e.g. CopyBuffer or OrderSend.',
  inputSchema: { name: z.string().min(1).max(100) },
}, async ({ name }) => {
  const f = getFunction(name);
  return reply(f ? show(f) : `"${name}" is not an MQL5 built-in function. Try search_reference.`);
});

server.registerTool('explain_code', {
  description: 'Explain an MQL5 trade server return code (MqlTradeResult.retcode, e.g. 10016) or runtime error (GetLastError(), e.g. 4014) by number or constant name.',
  inputSchema: { code: z.union([z.number().int(), z.string().min(1).max(80)]) },
}, async ({ code }) => {
  const hits = explainCode(code);
  return reply(hits.length
    ? hits.map((c) => `${c.code} ${c.constant} [${c.kind}]\n${c.meaning}\n${c.url}`).join('\n\n')
    : `Unknown MQL5 code "${code}".`);
});

await server.connect(new StdioServerTransport());
