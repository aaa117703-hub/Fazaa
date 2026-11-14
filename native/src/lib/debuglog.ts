// سجل تشخيص داخل التطبيق: يلتقط console والأخطاء واللمسات ويعرضها بلوحة (DebugConsole).
type Line = { t: number; lvl: 'log' | 'warn' | 'error' | 'touch' | 'evt'; msg: string };
const MAX = 300;
const lines: Line[] = [];
const subs = new Set<() => void>();
export const touchStat = { n: 0, x: 0, y: 0, at: 0 };

function fmt(a: unknown): string {
  if (a instanceof Error) return a.name + ': ' + a.message + (a.stack ? '\n' + String(a.stack).split('\n').slice(0, 4).join('\n') : '');
  if (typeof a === 'string') return a;
  try { return JSON.stringify(a)?.slice(0, 600) ?? String(a); } catch { return String(a); }
}
export function dlog(lvl: Line['lvl'], ...args: unknown[]) {
  lines.push({ t: Date.now(), lvl, msg: args.map(fmt).join(' ').slice(0, 900) });
  if (lines.length > MAX) lines.shift();
  notify();
}
let pending = false;
export function notify() {
  if (pending) return; pending = true;
  setTimeout(() => { pending = false; subs.forEach((f) => { try { f(); } catch { /* */ } }); }, 50);
}
export const evt = (...a: unknown[]) => dlog('evt', ...a);
export const getLines = () => lines;
export const clearLines = () => { lines.length = 0; subs.forEach((f) => f()); };
export const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const asText = () => lines.map((l) => new Date(l.t).toISOString().slice(11, 19) + ' [' + l.lvl + '] ' + l.msg).join('\n');

let installed = false;
export function installDebug() {
  if (installed) return; installed = true;
  const c = console as unknown as Record<string, (...a: unknown[]) => void>;
  (['log', 'info', 'warn', 'error'] as const).forEach((k) => {
    const orig = c[k]?.bind(console);
    c[k] = (...a: unknown[]) => { dlog(k === 'warn' ? 'warn' : k === 'error' ? 'error' : 'log', ...a); try { orig?.(...a); } catch { /* */ } };
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const EU = (globalThis as any).ErrorUtils;
  if (EU?.setGlobalHandler) {
    EU.setGlobalHandler((e: unknown, fatal?: boolean) => { dlog('error', fatal ? 'FATAL' : 'JS error', e); });
  }
  // وعود مرفوضة بدون catch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tracking = require('promise/setimmediate/rejection-tracking');
    tracking.enable({ allRejections: true, onUnhandled: (_id: number, err: unknown) => dlog('error', 'unhandled promise', err) });
  } catch { void g; }
  dlog('evt', 'debug console installed');
}
