// src/engine/audio/strudelEngine.ts
//
// Singleton wrapper around @strudel/web so that initStrudel() is called
// exactly once per browser session regardless of how many components import it.
// Both AudioProvider (game mode background music) and StrudelEditor (creator
// studio preview) share the same REPL instance.
//
// Usage (inside useEffect or event handlers only — never during SSR):
//
//   const engine = await getStrudelEngine(window.location.origin);
//   await engine.evaluate('note("c3 e3").s("piano")');
//   engine.hush(); // stop

/** A character range in the evaluated source code. */
export type TriggerLocation = { start: number; end: number };

/** Callback fired (from the audio thread scheduler) each time a pattern event triggers. */
export type LocationCallback = (locations: TriggerLocation[]) => void;

export type StrudelEngine = {
    evaluate: (code: string, autoplay?: boolean) => Promise<void>;
    hush: () => void;
    /**
     * Register a callback that fires whenever a Strudel hap triggers and carries
     * source location data. Pass `null` to unregister.
     *
     * Implemented by wrapping the global Cyclist trigger function once at init
     * time — this is the only reliable hook because pattern.onTrigger() returns
     * a *new* pattern that the scheduler never plays.
     */
    setLocationCallback: (cb: LocationCallback | null) => void;
};

let _promise: Promise<StrudelEngine> | null = null;
// Module-level so the trigger wrapper closure can always reach the latest
// callback without being captured in a stale closure.
let _locationCb: LocationCallback | null = null;

/**
 * Returns (and lazily initialises) the shared Strudel engine.
 * Must be called from client-side code only (useEffect / event handlers).
 *
 * Pass `origin` (window.location.origin) on the first call so that the
 * local sample banks are pre-loaded via the /strudel-samples manifest before
 * the first evaluate(). Subsequent calls with a different or missing origin
 * reuse the already-initialised engine.
 *
 * initStrudel() calls initAudioOnFirstClick() internally, which registers a
 * one-time listener that resumes the AudioContext on the first user interaction
 * anywhere on the page — so no specific "unlock" button is required.
 */
export function getStrudelEngine(origin?: string): Promise<StrudelEngine> {
    if (_promise) return _promise;
    _promise = (async (): Promise<StrudelEngine> => {
        const mod = await import('@strudel/web');
        const sampleUrl = origin ? `${origin}/strudel-samples` : undefined;
        // initStrudel() returns the `ls` repl object which has `ls.scheduler`
        // (the Cyclist instance, `D`).  globalThis.repl is never set by
        // @strudel/web because its inner XX class is always instantiated with
        // localScope:true, skipping the globalThis.repl assignment.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ls = await (mod.initStrudel as any)({
            prebake: sampleUrl
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? async () => { await (mod as any).samples(sampleUrl); }
                : undefined,
        });

        // Hook into live highlighting by monkey-patching scheduler.setPattern.
        //
        // WHY NOT getTriggerFunc / setTriggerFunc:
        // @strudel/web ships as a fully self-contained bundle.  Its scheduler
        // captures `onTrigger` at construction time and calls it directly
        // (`n?.(V, Z, X, this.cps, D)` in Db constructor).  The exported
        // getTriggerFunc/setTriggerFunc operate on a separate variable `Bb`
        // that nothing in the scheduler ever reads — patching it has no effect.
        //
        // CORRECT APPROACH — hap-level context.onTrigger:
        // The audio-trigger function (s2) checks `hap.context.onTrigger` for
        // every hap.  When set (without dominantTrigger), it calls BOTH the
        // default audio output AND context.onTrigger.  We wrap scheduler.setPattern
        // so every incoming pattern gets a withContext() that injects our hook
        // while preserving any existing per-hap onTrigger chain.
        //
        // We access the scheduler via the initStrudel() return value (ls.scheduler)
        // rather than globalThis.repl (which @strudel/web never populates).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scheduler = (ls as any)?.scheduler;
        if (scheduler && typeof scheduler.setPattern === 'function') {
            const origSetPattern = (scheduler.setPattern as Function).bind(scheduler); // eslint-disable-line @typescript-eslint/ban-types
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            scheduler.setPattern = async (pattern: any, start?: boolean) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const wrapped = typeof pattern?.withContext === 'function'
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ? pattern.withContext((ctx: any) => {
                        const prevOnTrigger = ctx.onTrigger;
                        return {
                            ...ctx,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onTrigger: async (hap: any, ...args: any[]) => {
                                if (_locationCb) {
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const locs: TriggerLocation[] = (hap?.context?.locations ?? [])
                                        .filter((l: any) => typeof l?.start === 'number' && typeof l?.end === 'number'); // eslint-disable-line @typescript-eslint/no-explicit-any
                                    if (locs.length > 0) _locationCb(locs);
                                }
                                if (prevOnTrigger) await prevOnTrigger(hap, ...args);
                            },
                        };
                    })
                    : pattern;
                return origSetPattern(wrapped, start);
            };
        }

        return {
            evaluate: mod.evaluate as StrudelEngine['evaluate'],
            hush: mod.hush,
            setLocationCallback: (cb) => { _locationCb = cb; },
        };
    })();
    return _promise;
}
