declare module '@strudel/web' {
    export function initStrudel(options?: {
        prebake?: () => Promise<void>;
        [key: string]: unknown;
    }): Promise<unknown>;

    export function evaluate(code: string, autoplay?: boolean): Promise<void>;
    export function hush(): void;

    /** Load sample banks from a URL or inline object. */
    export function samples(src: string | Record<string, string | string[]>): Promise<void>;
}
