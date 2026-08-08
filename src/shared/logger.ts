/**
 * The only sanctioned console user in the codebase. The no-console rule is
 * switched off for this file in eslint.config.ts.
 *
 * Debug output is off unless the user turns it on, because a content script that
 * chatters into the console of somebody's chat app is a bug. When a report comes
 * in that "it stopped working", turning this on should answer the question without
 * needing a reproduction.
 */

let debugEnabled = false;

export function setDebug(enabled: boolean): void {
  debugEnabled = enabled;
}

export function debug(...args: unknown[]): void {
  if (debugEnabled) console.debug('[GCCH]', ...args);
}

export function warn(...args: unknown[]): void {
  console.warn('[GCCH]', ...args);
}

export function error(...args: unknown[]): void {
  console.error('[GCCH]', ...args);
}

const warnedOnce = new Set<string>();

/** Emits a warning at most once per key, for conditions that would otherwise spam. */
export function warnOnce(key: string, ...args: unknown[]): void {
  if (warnedOnce.has(key)) return;
  warnedOnce.add(key);
  warn(...args);
}
