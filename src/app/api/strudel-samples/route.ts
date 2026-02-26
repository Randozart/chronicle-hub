import { NextRequest, NextResponse } from 'next/server';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const SOUNDS_DIR = join(process.cwd(), 'public', 'sounds');

const AUDIO_EXTS = /\.(wav|mp3|ogg|flac|aiff|webm)$/i;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function listAudioFiles(dir: string): string[] {
    try {
        return readdirSync(dir).filter(f => AUDIO_EXTS.test(f));
    } catch { return []; }
}

function listDirs(dir: string): string[] {
    try {
        return readdirSync(dir).filter(f => {
            try { return statSync(join(dir, f)).isDirectory(); } catch { return false; }
        });
    } catch { return []; }
}

/**
 * Serves a strudel.json-compatible banks object for use with samples('url').
 *
 * Paths are returned as root-relative URLs (/sounds/...) so that Strudel
 * resolves them against the manifest URL's origin (chroniclehubgames.com),
 * not the internal reverse-proxy hostname. Absolute URLs constructed from
 * request.url would leak the container hostname behind a proxy and cause
 * Strudel to string-concatenate them with the manifest base, producing
 * broken URLs like "https://host.com/apihttps://internal:3000/sounds/...".
 *
 * Format: { "bankId": ["/sounds/path/file.ext", ...] }
 *
 * CORS headers are required so the strudel.cc embed iframe can fetch this.
 * This route is public (no auth required) so the strudel.cc embed can reach
 * it even when third-party cookies are blocked.
 */
export async function GET(_request: NextRequest) {
    const banks: Record<string, string[]> = {};

    const rel = (path: string) => `/sounds/${path}`;

    // ── Bittersweet Sleep Trumpet ────────────────────────────────────────────
    const bittersweet = join(SOUNDS_DIR, 'custom', 'bittersweet_trumpet');
    const bittersweetFiles = listAudioFiles(bittersweet);
    if (bittersweetFiles.length > 0) {
        banks['bittersweet_trumpet'] = bittersweetFiles
            .sort()
            .map(f => rel(`custom/bittersweet_trumpet/${f}`));
    }

    // ── Jazz Kit ────────────────────────────────────────────────────────────
    const jazzDir = join(SOUNDS_DIR, 'custom', 'jazz_kit');
    const jazzFiles = listAudioFiles(jazzDir);

    const jazzPrefixMap: Record<string, string> = {
        JK_BD:   'jazz_bd',
        JK_SNR:  'jazz_sn',
        JK_HH:   'jazz_hh',
        JK_BRSH: 'jazz_brush',
        JK_PRC:  'jazz_perc',
    };

    for (const [prefix, id] of Object.entries(jazzPrefixMap)) {
        const files = jazzFiles.filter(f => f.startsWith(prefix));
        if (files.length > 0) {
            banks[id] = files.map(f => rel(`custom/jazz_kit/${f}`));
        }
    }

    // ── Musyng Kite GM library ───────────────────────────────────────────────
    const musyng = join(SOUNDS_DIR, 'musyng_kite');
    for (const dir of listDirs(musyng)) {
        const id = dir.replace(/-mp3$/, '');
        const files = listAudioFiles(join(musyng, dir));
        if (files.length > 0) {
            banks[id] = files.map(f => rel(`musyng_kite/${dir}/${f}`));
        }
    }

    // ── Standard library ────────────────────────────────────────────────────
    const stdDir = join(SOUNDS_DIR, 'standard');
    for (const dir of listDirs(stdDir).filter(d => d !== 'tonejs')) {
        const files = listAudioFiles(join(stdDir, dir));
        if (files.length > 0) {
            banks[dir] = files.map(f => rel(`standard/${dir}/${f}`));
        }
    }

    return new NextResponse(JSON.stringify(banks), {
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
        },
    });
}

export async function OPTIONS() {
    return new NextResponse(null, { headers: CORS_HEADERS });
}
