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
//   await engine.fadeVolume(0, 300); // ramp to silence over 300 ms
//   engine.hush();                   // then stop the scheduler

/** A character range in the evaluated source code. */
export type TriggerLocation = { start: number; end: number };

/** Callback fired (from the audio thread scheduler) each time a pattern event triggers. */
export type LocationCallback = (locations: TriggerLocation[]) => void;

export type StrudelEngine = {
    evaluate: (code: string, autoplay?: boolean) => Promise<void>;
    hush: () => void;
    /**
     * Frame-accurate volume ramp via the Web Audio API parameter scheduler.
     * Ramps the master gain node to `targetGain` (0–1) over `durationMs`.
     * Resolves when the ramp is complete (or immediately when durationMs = 0).
     * Cancels any in-progress ramp before starting the new one.
     */
    fadeVolume: (targetGain: number, durationMs: number) => Promise<void>;
    /** Current master gain value (0–1). */
    getMasterGain: () => number;
    /** The real AudioContext used by this engine (for state monitoring). */
    getAudioContext: () => AudioContext;
    /**
     * Register a callback that fires whenever a Strudel hap triggers and carries
     * source location data. Pass `null` to unregister.
     */
    setLocationCallback: (cb: LocationCallback | null) => void;
};

let _promise: Promise<StrudelEngine> | null = null;
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
 * ### Mobile buffering
 * The AudioContext is created with `latencyHint: 'playback'`, instructing the
 * browser to allocate a larger audio render buffer. This significantly reduces
 * dropouts when the browser throttles JavaScript timers under power-saving
 * mode or CPU load — the primary cause of mobile audio chopping.
 *
 * ### Frame-accurate crossfades
 * A master GainNode is inserted between Strudel's output bus and the hardware
 * destination using an AudioContext Proxy. When Strudel's internal nodes call
 * `audioCtx.destination`, the Proxy intercepts and returns our GainNode
 * instead. This means all Strudel audio routes through masterGain →
 * realDestination, giving us frame-accurate ramps via the Web Audio API
 * parameter scheduler — no re-evaluation of patterns needed.
 */
export function getStrudelEngine(origin?: string): Promise<StrudelEngine> {
    if (_promise) return _promise;
    _promise = (async (): Promise<StrudelEngine> => { try {
        const mod = await import('@strudel/web');

        // ----------------------------------------------------------------
        // AudioContext + master gain node
        // ----------------------------------------------------------------

        // 'playback' hint → browser allocates a larger render quantum / buffer.
        // The scheduler's setInterval (100 ms default) can be throttled on
        // mobile; a larger buffer means more audio is pre-rendered before the
        // next tick arrives, preventing dropouts.
        const realCtx = new AudioContext({ latencyHint: 'playback' });

        // Master gain node — all of Strudel's audio routes through here.
        const masterGain = realCtx.createGain();
        masterGain.gain.value = 1;
        masterGain.connect(realCtx.destination);

        // Resume AudioContext on first user interaction (since we provide a custom audioContext,
        // Strudel's internal initAudioOnFirstClick may be disabled).
        const resumeOnClick = () => {
            if (realCtx.state === 'suspended') {
                realCtx.resume().catch(() => {});
            }
            document.removeEventListener('click', resumeOnClick);
            document.removeEventListener('touchstart', resumeOnClick);
        };
        document.addEventListener('click', resumeOnClick);
        document.addEventListener('touchstart', resumeOnClick);

        // Proxy: intercepts audioCtx.destination so that when Strudel wires
        // its output bus via `audioCtx.destination`, it connects to masterGain
        // instead of the hardware destination directly.
        // All other accesses are transparently forwarded to realCtx.
        const proxyCtx = new Proxy(realCtx, {
            get(target, prop: string | symbol) {
                if (prop === 'destination') return masterGain;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const val = (target as any)[prop];
                return typeof val === 'function' ? val.bind(target) : val;
            },
        }) as AudioContext;

        // ----------------------------------------------------------------
        // Strudel init
        // ----------------------------------------------------------------

        const sampleUrl = origin ? `${origin}/strudel-samples` : undefined;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ls = await (mod.initStrudel as any)({
            audioContext: proxyCtx,
            prebake: sampleUrl
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? async () => {
                    try {
                        await (mod as any).samples(sampleUrl);
                    } catch (err) {
                        console.warn('[StrudelEngine] Failed to load sample banks:', err);
                    }
                }
                : undefined,
        });

        // ----------------------------------------------------------------
        // Live-highlight hook (monkey-patch scheduler.setPattern)
        //
        // WHY NOT getTriggerFunc / setTriggerFunc:
        // @strudel/web ships as a fully self-contained bundle. Its scheduler
        // captures `onTrigger` at construction time and calls it directly.
        // The exported getTriggerFunc/setTriggerFunc operate on a separate
        // variable that nothing in the scheduler ever reads — patching it
        // has no effect.
        //
        // CORRECT APPROACH — hap-level context.onTrigger:
        // The audio-trigger function checks `hap.context.onTrigger` for every
        // hap. We wrap scheduler.setPattern so every incoming pattern gets a
        // withContext() injecting our hook while preserving any existing chain.
        // ----------------------------------------------------------------

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scheduler = (ls as any)?.scheduler;
        if (scheduler && typeof scheduler.setPattern === 'function') {
            const origSetPattern = (scheduler.setPattern as Function).bind(scheduler); // eslint-disable-line @typescript-eslint/ban-types
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            scheduler.setPattern = async (pattern: any, start?: boolean) => {
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
                                        .filter((l: any) => typeof l?.start === 'number' && typeof l?.end === 'number');
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

        // ----------------------------------------------------------------
        // fadeVolume — Web Audio API parameter ramp on masterGain
        // ----------------------------------------------------------------

        let _currentGain = 1;
        // Incremented on every new fade so a superseded fade's setTimeout
        // doesn't resolve after a newer fade has taken over.
        let _fadeGen = 0;

        const fadeVolume = (targetGain: number, durationMs: number): Promise<void> => {
            _currentGain = targetGain;
            const gen = ++_fadeGen;
            const durationSec = Math.max(0, durationMs) / 1000;
            const gain = masterGain.gain;

            return new Promise<void>((resolve) => {
                if (durationSec === 0) {
                    gain.cancelScheduledValues(realCtx.currentTime);
                    gain.setValueAtTime(targetGain, realCtx.currentTime);
                    resolve();
                    return;
                }

                gain.cancelScheduledValues(realCtx.currentTime);
                // Anchor current value before ramping to avoid discontinuities.
                gain.setValueAtTime(gain.value, realCtx.currentTime);
                gain.linearRampToValueAtTime(targetGain, realCtx.currentTime + durationSec);

                // Resolve once the ramp has had time to complete.
                setTimeout(() => {
                    // Even if superseded, resolve so the caller's await unblocks.
                    void gen;
                    resolve();
                }, durationMs + 20);
            });
        };

        return {
            evaluate: mod.evaluate as StrudelEngine['evaluate'],
            hush: mod.hush,
            fadeVolume,
            getMasterGain: () => _currentGain,
            getAudioContext: () => realCtx,
            setLocationCallback: (cb) => { _locationCb = cb; },
        };
    } catch (err) {
        console.error('[StrudelEngine] Initialisation failed:', err);
        _promise = null;
        throw err;
    }
})();
    return _promise;
}
