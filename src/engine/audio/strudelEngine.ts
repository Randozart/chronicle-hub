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
     * The callback receives the character ranges (in the last evaluated code string)
     * that correspond to the playing event — use these for live highlighting.
     * dominant=false in the internal onTrigger call keeps webaudio output active.
     */
    setLocationCallback: (cb: LocationCallback | null) => void;
};

let _promise: Promise<StrudelEngine> | null = null;
// Module-level so the afterEval closure can always reach the latest callback
// without the callback itself being captured in a stale closure.
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (mod.initStrudel as any)({
            prebake: sampleUrl
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? async () => { await (mod as any).samples(sampleUrl); }
                : undefined,
            // afterEval fires after every evaluate() call with the resulting Pattern.
            // We attach a non-dominant onTrigger so our callback fires alongside the
            // default webaudio output (dominant=false keeps audio playing).
            afterEval: ({ pattern }: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                if (!pattern || typeof pattern.onTrigger !== 'function') return;
                pattern.onTrigger((hap: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                    if (!_locationCb) return;
                    const locs: TriggerLocation[] = (hap?.context?.locations ?? [])
                        .filter((l: any) => typeof l?.start === 'number' && typeof l?.end === 'number'); // eslint-disable-line @typescript-eslint/no-explicit-any
                    if (locs.length > 0) _locationCb(locs);
                }, false /* dominant=false → audio still plays */);
            },
        });
        return {
            evaluate: mod.evaluate as StrudelEngine['evaluate'],
            hush: mod.hush,
            setLocationCallback: (cb) => { _locationCb = cb; },
        };
    })();
    return _promise;
}
