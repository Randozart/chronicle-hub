declare module '@strudel/web' {
    export function initStrudel(options?: {
        prebake?: () => Promise<void>;
        [key: string]: unknown;
    }): Promise<unknown>;

    export function evaluate(code: string, autoplay?: boolean): Promise<void>;
    export function hush(): void;

    /** Load sample banks from a URL or inline object. */
    export function samples(src: string | Record<string, string | string[]>): Promise<void>;

    /** Returns the current global trigger function used by the scheduler. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function getTriggerFunc(): ((hap: any, ...args: any[]) => unknown) | undefined;

    /** Replaces the global trigger function used by the scheduler. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function setTriggerFunc(fn: (hap: any, ...args: any[]) => unknown): void;
}
