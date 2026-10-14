import { readFileSync } from 'node:fs';

export type Fn = { name: string; section: string; signatures: string[]; url: string };
export type Code = { code: number; constant: string; kind: 'trade_retcode' | 'runtime_error'; meaning: string; url: string };

const load = <T>(file: string): T => JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8'));
export const functions = load<Fn[]>('functions.json');
export const codes = load<Code[]>('codes.json');

export const MAX_RESULTS = 10;

// Exact name first, then prefix, then substring in name, then section match.
export function search(query: string, limit = MAX_RESULTS): Fn[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  // Names have no spaces or underscores, so "copy buffer" and "order_send" should still match.
  const qn = q.replace(/[\s_]+/g, '');
  const rank = (f: Fn) => {
    const n = f.name.toLowerCase();
    if (n === qn) return 0;
    if (n.startsWith(qn)) return 1;
    if (n.includes(qn)) return 2;
    if (f.section.toLowerCase().includes(q)) return 3;
    return 9;
  };
  return functions
    .map((f) => [rank(f), f] as const)
    .filter(([r]) => r < 9)
    .sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name))
    .slice(0, Math.min(limit, MAX_RESULTS))
    .map(([, f]) => f);
}

export function getFunction(name: string): Fn | undefined {
  // Agents paste call syntax ("OrderSend (req, res)") or snake_case; names have neither spaces nor underscores.
  const n = name.replace(/\(.*$/s, '').replace(/[\s_]+/g, '').toLowerCase();
  return functions.find((f) => f.name.toLowerCase() === n);
}

// Accepts 10016, "4014" or a constant like TRADE_RETCODE_INVALID_STOPS.
// A number can match both tables only in theory; both are returned if so.
export function explainCode(input: string | number): Code[] {
  const s = String(input).trim();
  if (/^\d+$/.test(s)) return codes.filter((c) => c.code === Number(s));
  return codes.filter((c) => c.constant === s.toUpperCase());
}
