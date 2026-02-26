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

        const jazzInstruments = Object.values(prefixMap)
            .filter(e => e.files.length > 0)
            .map(e => ({
                id: e.strudelId,
                label: e.label,
                preview: toUrl(join(jazzDir, e.files[0])),
                files: e.files.map(f => toUrl(join(jazzDir, f))),
                type: 'percussion',
            }));

        // ── Bittersweet Trumpet ──────────────────────────────────────────────
        const bittersweetDir = join(SOUNDS_DIR, 'custom', 'bittersweet_trumpet');
        const bittersweetFiles = listAudioFiles(bittersweetDir).sort();
        if (bittersweetFiles.length > 0) {
            const preview = pickPreview(bittersweetFiles) ?? bittersweetFiles[0];
            jazzInstruments.push({
                id: 'bittersweet_trumpet',
                label: 'Bittersweet Trumpet',
                preview: toUrl(join(bittersweetDir, preview)),
                files: bittersweetFiles.map(f => toUrl(join(bittersweetDir, f))),
                type: 'melodic',
            });
        }

        groups.push({
            id: 'jazz_kit',
            name: 'Jazz Kit',
            category: 'Custom Samples',
            instruments: jazzInstruments,
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

    // ── Tone.js high-quality library ─────────────────────────────────────────
    const toneDir = join(SOUNDS_DIR, 'standard', 'tonejs');
    const toneDirs = listDirs(toneDir);

    if (toneDirs.length > 0) {
        const instruments = toneDirs.map(dir => {
            const id = 'tonejs_' + dir.replace(/-/g, '_');
            const label = dir.replace(/-/g, ' ');
            const allFiles = listAudioFiles(join(toneDir, dir));
            const preview = pickPreview(allFiles);
            return {
                id,
                label,
                preview: preview ? toUrl(join(toneDir, dir, preview)) : null,
                files: allFiles.sort().map(f => ({ note: f.replace(/\.[^.]+$/, ''), url: toUrl(join(toneDir, dir, f)) })),
                type: 'melodic',
            };
        }).filter(i => i.preview);

        groups.push({
            id: 'tonejs',
            name: 'Tone.js Orchestra',
            category: 'Chronicle Hub',
            instruments,
        });
    }

    // ── Ancient Instruments of the World ─────────────────────────────────────
    const ancientSamplesDir = join(SOUNDS_DIR, 'imported_sf2', 'Ancient Instruments Of The World', 'samples');
    const ancientDefs: { id: string; label: string; files: string[] }[] = [
        { id: 'ancient_bodhran',         label: 'Bodhran',           files: ['Bodhran SideL.wav', 'Bodran SkinL.wav'] },
        { id: 'ancient_bukkehorn',        label: 'Bukkehorn',         files: ['BukkehornL.wav', 'BukkehornStartL.wav'] },
        { id: 'ancient_conch',            label: 'Conch',             files: ['ConchL.wav', 'ConchContinueL.wav'] },
        { id: 'ancient_cornemuse',        label: 'Cornemuse',         files: ['cornemuseStartL.wav', 'cornemuseContinueL.wav'] },
        { id: 'ancient_crwth',            label: 'Crwth',             files: ['CrwthR.wav'] },
        { id: 'ancient_celtic_harp',      label: 'Celtic Harp',       files: ['celtic harp-c2L.wav'] },
        { id: 'ancient_irish_harp',       label: 'Irish Harp',        files: ['IRISH LYRE HARPL.wav'] },
        { id: 'ancient_jaw_harp',         label: 'Jaw Harp',          files: ['jaw harp.wav'] },
        { id: 'ancient_jouhikko',         label: 'Jouhikko',          files: ['JouhikkoL.wav'] },
        { id: 'ancient_brass_lure',       label: 'Brass Lure',        files: ['brass-lure start.wav'] },
        { id: 'ancient_nyckelharpa',      label: 'Nyckelharpa',       files: ['Nyckelharpa2L.wav'] },
        { id: 'ancient_prillarhorn',      label: 'Prillarhorn',       files: ['PrillarhornL.wav', 'PrillarhornContinueL.wav'] },
        { id: 'ancient_psalmodikon',      label: 'Psalmodikon',       files: ['PsalmodikonL.wav'] },
        { id: 'ancient_sheepbone_flute',  label: 'Sheepbone Flute',   files: ['sheepboneflutestartL.wav', 'sheepboneflutecontiL.wav'] },
        { id: 'ancient_tagelharpa',       label: 'Tagelharpa',        files: ['tagelharpa2L.wav', 'tagelharpa3L.wav'] },
        { id: 'ancient_tin_whistle',      label: 'Tin Whistle',       files: ['tin whistle startL.wav'] },
    ];
    const ancientOnDisk = new Set(listAudioFiles(ancientSamplesDir));
    const ancientInstruments = ancientDefs
        .map(def => {
            const existing = def.files.filter(f => ancientOnDisk.has(f));
            if (!existing.length) return null;
            return {
                id: def.id,
                label: def.label,
                preview: toUrl(join(ancientSamplesDir, existing[0])),
                files: existing.map(f => toUrl(join(ancientSamplesDir, f))),
                type: 'oneshot',
            };
        })
        .filter(Boolean);

    if (ancientInstruments.length > 0) {
        groups.push({
            id: 'ancient_instruments',
            name: 'Ancient Instruments of the World',
            category: 'Chronicle Hub',
            instruments: ancientInstruments,
        });
    }

    // NOTE: tracker/ (de_* Deus Ex samples) are intentionally excluded

    return NextResponse.json({ groups });
}
