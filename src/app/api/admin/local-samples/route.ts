import { NextResponse } from 'next/server';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const SOUNDS_DIR = join(process.cwd(), 'public', 'sounds');

const AUDIO_EXTS = /\.(wav|mp3|ogg|flac|aiff|webm)$/i;

/** Convert an absolute path inside `public/` to a `/`-relative URL */
function toUrl(abs: string): string {
    const norm = abs.replace(/\\/g, '/');
    const idx = norm.indexOf('/public/');
    return idx === -1 ? abs : norm.slice(idx + '/public'.length);
}

function listAudioFiles(dir: string): string[] {
    try {
        return readdirSync(dir)
            .filter(f => AUDIO_EXTS.test(f))
            .map(f => f);
    } catch { return []; }
}

function listDirs(dir: string): string[] {
    try {
        return readdirSync(dir).filter(f => {
            try { return statSync(join(dir, f)).isDirectory(); } catch { return false; }
        });
    } catch { return []; }
}

/** Pick a good preview file from a list (prefers C4 or C3 or C5, else first file) */
function pickPreview(files: string[]): string | null {
    if (!files.length) return null;
    const pref = ['C4', 'C3', 'C5', 'C2', 'A3', 'A4'];
    for (const p of pref) {
        const f = files.find(x => x.startsWith(p + '.') || x.startsWith(p.toLowerCase() + '.'));
        if (f) return f;
    }
    return files[0];
}

export async function GET() {
    const groups: any[] = [];

    // ── Jazz Kit ────────────────────────────────────────────────────────────
    const jazzDir = join(SOUNDS_DIR, 'custom', 'jazz_kit');
    const jazzFiles = listAudioFiles(jazzDir);

    if (jazzFiles.length > 0) {
        const prefixMap: Record<string, { strudelId: string; label: string; files: string[] }> = {
            JK_BD:   { strudelId: 'jazz_bd',    label: 'Bass Drum',  files: [] },
            JK_SNR:  { strudelId: 'jazz_sn',    label: 'Snare',      files: [] },
            JK_HH:   { strudelId: 'jazz_hh',    label: 'Hi-Hat',     files: [] },
            JK_BRSH: { strudelId: 'jazz_brush', label: 'Brushes',    files: [] },
            JK_PRC:  { strudelId: 'jazz_perc',  label: 'Percussion', files: [] },
        };

        for (const f of jazzFiles) {
            for (const [prefix, entry] of Object.entries(prefixMap)) {
                if (f.startsWith(prefix)) { entry.files.push(f); break; }
            }
        }

        groups.push({
            id: 'jazz_kit',
            name: 'Jazz Kit',
            category: 'Custom Samples',
            instruments: Object.values(prefixMap)
                .filter(e => e.files.length > 0)
                .map(e => ({
                    id: e.strudelId,
                    label: e.label,
                    preview: toUrl(join(jazzDir, e.files[0])),
                    files: e.files.map(f => toUrl(join(jazzDir, f))),
                    type: 'percussion',
                })),
        });
    }

    // ── Musyng Kite GM library ───────────────────────────────────────────────
    const musyng = join(SOUNDS_DIR, 'musyng_kite');
    const musyng_dirs = listDirs(musyng);

    if (musyng_dirs.length > 0) {
        const instruments = musyng_dirs.map(dir => {
            const name = dir.replace(/-mp3$/, '').replace(/_/g, ' ');
            const strudel_id = dir.replace(/-mp3$/, '');
            const allFiles = listAudioFiles(join(musyng, dir));
            const preview = pickPreview(allFiles);
            return {
                id: strudel_id,
                label: name,
                preview: preview ? toUrl(join(musyng, dir, preview)) : null,
                files: allFiles.map(f => ({ note: f.replace(/\.[^.]+$/, ''), url: toUrl(join(musyng, dir, f)) })),
                type: 'melodic',
            };
        }).filter(i => i.preview);

        groups.push({
            id: 'musyng_kite',
            name: 'Musyng Kite GM Library',
            category: 'Chronicle Hub',
            instruments,
        });
    }

    // ── Standard library ────────────────────────────────────────────────────
    const stdDir = join(SOUNDS_DIR, 'standard');
    const stdDirs = listDirs(stdDir).filter(d => d !== 'tonejs');

    if (stdDirs.length > 0) {
        const instruments = stdDirs.map(dir => {
            const name = dir.replace(/_/g, ' ');
            const allFiles = listAudioFiles(join(stdDir, dir));
            const preview = pickPreview(allFiles);
            return {
                id: dir,
                label: name,
                preview: preview ? toUrl(join(stdDir, dir, preview)) : null,
                files: allFiles.map(f => ({ note: f.replace(/\.[^.]+$/, ''), url: toUrl(join(stdDir, dir, f)) })),
                type: 'melodic',
            };
        }).filter(i => i.preview);

        groups.push({
            id: 'standard',
            name: 'Standard Orchestra',
            category: 'Chronicle Hub',
            instruments,
        });
    }

    // NOTE: tracker/ (de_*) and imported_sf2/ are intentionally excluded

    return NextResponse.json({ groups });
}
