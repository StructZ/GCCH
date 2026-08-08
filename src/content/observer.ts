import { SCAN_THROTTLE_MS, SEL } from '../shared/constants.js';
import * as log from '../shared/logger.js';

/**
 * Watches Chat for new code blocks.
 *
 * Scanning inside the MutationObserver callback would be a correctness bug and a
 * performance one: Chat's message list is virtualized, so scrolling produces a
 * continuous storm of mutations, and our own DOM insertions re-enter the callback.
 * Instead every burst sets a dirty flag and at most one scan runs per animation
 * frame, with a trailing throttle on top.
 */

export interface ObserverHandle {
  /** Forces a scan on the next frame, e.g. after a settings change. */
  requestScan(): void;
  disconnect(): void;
}

function observerRoot(): HTMLElement {
  return document.querySelector<HTMLElement>(SEL.MESSAGE_ROOT) ?? document.body;
}

export function startObserver(scan: () => void): ObserverHandle {
  let scheduled = false;
  let lastRun = 0;
  let frame: number | undefined;
  // Not `number`: this file is typechecked with Node types in scope, where
  // setTimeout returns a Timeout object. Infer it rather than asserting.
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disconnected = false;

  const run = (): void => {
    scheduled = false;
    lastRun = performance.now();
    const started = lastRun;
    try {
      scan();
    } catch (err) {
      // A scan that throws must not kill the observer for the rest of the session.
      log.error('scan failed', err);
    }
    log.debug(`scan took ${(performance.now() - started).toFixed(1)}ms`);
  };

  const schedule = (): void => {
    if (disconnected || scheduled) return;
    scheduled = true;

    const wait = Math.max(0, SCAN_THROTTLE_MS - (performance.now() - lastRun));
    timer = globalThis.setTimeout(() => {
      frame = requestAnimationFrame(run);
    }, wait);
  };

  let root = observerRoot();
  const observer = new MutationObserver(schedule);
  observer.observe(root, { childList: true, subtree: true });
  log.debug('observing', root === document.body ? 'body' : SEL.MESSAGE_ROOT);

  // Chat replaces the whole message root when you switch spaces, which silently
  // orphans the observer. Watching body for that swap is what keeps the extension
  // alive across navigation without a reload.
  const rootWatcher = new MutationObserver(() => {
    const current = observerRoot();
    if (current === root) return;
    root = current;
    observer.disconnect();
    observer.observe(root, { childList: true, subtree: true });
    log.debug('message root replaced, re-attached observer');
    schedule();
  });
  rootWatcher.observe(document.body, { childList: true, subtree: true });

  schedule();

  return {
    requestScan: schedule,
    disconnect(): void {
      disconnected = true;
      observer.disconnect();
      rootWatcher.disconnect();
      globalThis.clearTimeout(timer);
      if (frame !== undefined) cancelAnimationFrame(frame);
    },
  };
}
