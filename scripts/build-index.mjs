#!/usr/bin/env node
// Rebuilds data/functions.json and data/codes.json from the official MQL5 reference.
// Stores names, signatures, sections and links only; the prose stays on mql5.com.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const BASE = 'https://www.mql5.com';
const DELAY_MS = 4000; // mql5.com blocks faster crawls; ~35 min on a cold cache
const CACHE = new URL('../.cache/', import.meta.url); // reruns resume from here
const OFFLINE = process.argv.includes('--cache-only'); // never touch the network
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path) {
  const file = new URL(path.replace(/\W+/g, '_') + '.html', CACHE);
  try { return await readFile(file, 'utf8'); } catch {}
  if (OFFLINE) return null;
  await sleep(DELAY_MS);
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(BASE + path, { headers: { 'User-Agent': 'mql5-docs-mcp index builder' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      await mkdir(CACHE, { recursive: true });
      await writeFile(file, html);
      return html;
    } catch (error) {
      if (attempt === 4) throw new Error(`${path}: ${error.message}`);
      await sleep(60_000 * attempt); // 403s here mean rate limiting, so back off hard
    }
  }
}

const text = (html) => html.replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const rows = (html) => html.split('<tr class="EnumTable">').slice(1).map((row) => row.split('</tr>')[0]);
const cells = (row) => [...row.matchAll(/<td[\s\S]*?<\/td>/g)].map((m) => text(m[0]).trim());

export function signatures(html, name) {
  const own = parse(html, name);
  if (own.length) return own;
  const main = html.match(/f_Functions">(\w+)</)?.[1]; // alias entries link to another function's page
  return main ? parse(html, main) : [];
}

function parse(html, name) {
  const found = [...html.matchAll(/<p class="p_CodeExample"[^>]*>([\s\S]*?)<\/p>/g)]
    .filter((m) => m[1].includes(`f_Functions">${name}<`))
    .map((m) => text(m[1].replace(/<span class="f_Comments">[\s\S]*?<\/span>/g, '')).replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').replace(/ ,/g, ',').replace(/;$/, '').trim())
    .filter((s) => s.includes(`${name}(`) && s.endsWith(')'));
  return [...new Set(found)];
}

async function functions() {
  const out = [];
  for (const row of rows((await get('/en/docs/function_indices')) ?? '')) {
    const links = [...row.matchAll(/<a href="(\/en\/docs\/[^"]+)" class="topiclink">([^<]+)<\/a>/g)];
    if (links.length < 2) continue;
    const [, path, name] = links[0];
    const html = await get(path);
    const sigs = html ? signatures(html, name) : [];
    if (html && !sigs.length) console.warn(`no signature parsed: ${name}`);
    out.push({ name, section: links.at(-1)[2], signatures: sigs, url: BASE + path });
    if (out.length % 50 === 0) console.error(`${out.length} functions…`);
  }
  return out;
}

async function codes() {
  const out = [];
  for (const [kind, path] of [['trade_retcode', '/en/docs/constants/errorswarnings/enum_trade_return_codes'], ['runtime_error', '/en/docs/constants/errorswarnings/errorcodes']]) {
    for (const row of rows((await get(path)) ?? '')) {
      const c = cells(row);
      const code = c.find((v) => /^\d+$/.test(v));
      const constant = c.find((v) => /^[A-Z][A-Z0-9_]+$/.test(v));
      if (!code || !constant) continue;
      out.push({ code: Number(code), constant, kind, meaning: c.find((v) => v !== code && v !== constant) ?? '', url: BASE + path });
    }
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const c = await codes();
  const f = await functions();
  if (f.length < 400 || c.length < 200) throw new Error(`index looks truncated: ${f.length} functions, ${c.length} codes`);
  await writeFile(new URL('../data/functions.json', import.meta.url), JSON.stringify(f, null, 1));
  await writeFile(new URL('../data/codes.json', import.meta.url), JSON.stringify(c, null, 1));
  console.error(`wrote ${f.length} functions (${f.filter((x) => x.signatures.length).length} with signatures), ${c.length} codes`);
}
