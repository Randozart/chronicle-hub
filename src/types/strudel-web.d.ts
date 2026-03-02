declare module '@strudel/web' {
    export function initStrudel(options?: {
        prebake?: () => Promise<void>;
        audioContext?: AudioContext;
        [key: string]: unknown;
    }): Promise<unknown>;

    export function evaluate(code: string, autoplay?: boolean): Promise<void>;
    export function hush(): void;

    /** Load sample banks from a URL or inline object. */
    export function samples(src: string | Record<string, string | string[]>): Promise<void>;

    /** Returns the shared Web Audio AudioContext used by Strudel. */
    export function getAudioContext(): AudioContext;
}
