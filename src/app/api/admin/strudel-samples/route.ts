import { NextResponse } from 'next/server';
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
 * Format: { bankId: ["/sounds/relative/path.ext", ...] }
 *
 * The paths are absolute from the server root so that Strudel resolves them
 * correctly regardless of which URL this endpoint is called from.
 *
 * CORS headers are required so the strudel.cc embed iframe can fetch this.
 */
export async function GET() {
    const banks: Record<string, string[]> = {};

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
            banks[id] = files.map(f => `/sounds/custom/jazz_kit/${f}`);
        }
    }

    // ── Musyng Kite GM library ───────────────────────────────────────────────
    const musyng = join(SOUNDS_DIR, 'musyng_kite');
    for (const dir of listDirs(musyng)) {
        const id = dir.replace(/-mp3$/, '');
        const files = listAudioFiles(join(musyng, dir));
        if (files.length > 0) {
            banks[id] = files.map(f => `/sounds/musyng_kite/${dir}/${f}`);
        }
    }

    // ── Standard library ────────────────────────────────────────────────────
    const stdDir = join(SOUNDS_DIR, 'standard');
    for (const dir of listDirs(stdDir).filter(d => d !== 'tonejs')) {
        const files = listAudioFiles(join(stdDir, dir));
        if (files.length > 0) {
            banks[dir] = files.map(f => `/sounds/standard/${dir}/${f}`);
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
