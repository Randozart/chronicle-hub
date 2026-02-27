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

export type StrudelEngine = {
    evaluate: (code: string, autoplay?: boolean) => Promise<void>;
    hush: () => void;
};

let _promise: Promise<StrudelEngine> | null = null;

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
        await mod.initStrudel({
            prebake: sampleUrl
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? async () => { await (mod as any).samples(sampleUrl); }
                : undefined,
        });
        return {
            evaluate: mod.evaluate as StrudelEngine['evaluate'],
            hush: mod.hush,
        };
    })();
    return _promise;
}
