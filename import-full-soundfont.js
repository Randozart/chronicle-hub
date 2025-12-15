// import-full-soundfont.js
const fs = require('fs');
const path = require('path');
const https = require('https');

// --- CONFIGURATION ---
const BASE_DIR = './public/sounds/musyng_kite';
const PUBLIC_URL_ROOT = '/sounds/musyng_kite/';
const PRESETS_FILE_PATH = './src/engine/audio/presets.ts';

// Full list of instruments in the MusyngKite repo
const INSTRUMENTS = [
    'accordion', 'acoustic_bass', 'acoustic_grand_piano', 'acoustic_guitar_nylon', 
    'acoustic_guitar_steel', 'agogo', 'alto_sax', 'applause', 'bagpipe', 'banjo', 
    'baritone_sax', 'bassoon', 'bird_tweet', 'blown_bottle', 'brass_section', 
    'breath_noise', 'bright_acoustic_piano', 'celesta', 'cello', 'choir_aahs', 
    'church_organ', 'clarinet', 'clavinet', 'contrabass', 'distortion_guitar', 
    'drawbar_organ', 'dulcimer', 'electric_bass_finger', 'electric_bass_pick', 
    'electric_grand_piano', 'electric_piano_1', 'electric_piano_2', 'english_horn', 
    'fiddle', 'flute', 'french_horn', 'fretless_bass', 'fx_1_rain', 'fx_2_soundtrack', 
    'fx_3_crystal', 'fx_4_atmosphere', 'fx_5_brightness', 'fx_6_goblins', 
    'fx_7_echoes', 'fx_8_scifi', 'glockenspiel', 'guitar_fret_noise', 'guitar_harmonics', 
    'gunshot', 'harmonica', 'harpsichord', 'helicopter', 'honkytonk_piano', 'kalimba', 
    'koto', 'lead_1_square', 'lead_2_sawtooth', 'lead_3_calliope', 'lead_4_chiff', 
    'lead_5_charang', 'lead_6_voice', 'lead_7_fifths', 'lead_8_bass__lead', 
    'marimba', 'melodic_tom', 'music_box', 'muted_trumpet', 'oboe', 'ocarina', 
    'orchestra_hit', 'orchestral_harp', 'overdriven_guitar', 'pad_1_new_age', 
    'pad_2_warm', 'pad_3_polysynth', 'pad_4_choir', 'pad_5_bowed', 'pad_6_metallic', 
    'pad_7_halo', 'pad_8_sweep', 'pan_flute', 'percussive_organ', 'pizzicato_strings', 
    'recorder', 'reed_organ', 'reverse_cymbal', 'rock_organ', 'seashore', 'shakuhachi', 
    'shamisen', 'shanai', 'sitar', 'slap_bass_1', 'slap_bass_2', 'soprano_sax', 
    'steel_drums', 'string_ensemble_1', 'string_ensemble_2', 'synth_bass_1', 
    'synth_bass_2', 'synth_brass_1', 'synth_brass_2', 'synth_choir', 'synth_drum', 
    'synth_strings_1', 'synth_strings_2', 'taiko_drum', 'tango_accordion', 
    'telephone_ring', 'tenor_sax', 'timpani', 'tinkle_bell', 'trombone', 'trumpet', 
    'tuba', 'tubular_bells', 'vibraphone', 'viola', 'violin', 'voice_oohs', 
    'whistle', 'woodblock', 'xylophone'
];

// A smaller, more practical set of notes for web use
const NOTES_TO_DOWNLOAD = ['A1', 'C2', 'G2', 'C3', 'G3', 'C4', 'G4', 'C5', 'G5', 'C6'];

// --- SCRIPT LOGIC ---

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                return reject(`Status ${response.statusCode}`);
            }
            const file = fs.createWriteStream(dest);
            response.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err.message);
        });
    });
}

async function main() {
    let existingIds = new Set();
    try {
        const existingContent = fs.readFileSync(PRESETS_FILE_PATH, 'utf-8');
        const idRegex = /id:\s*['"]([^'"]+)['"]/g;
        let match;
        while ((match = idRegex.exec(existingContent)) !== null) existingIds.add(match[1]);
        console.log(`Found ${existingIds.size} existing presets. New presets will be appended.`);
    } catch (e) {
        console.warn("Could not read presets file. Generating all found instruments.");
    }
    
    const newPresets = {};
    let newPresetCount = 0;

    for (const instrument of INSTRUMENTS) {
        const id = instrument;
        if (existingIds.has(id)) continue;

        const dir = path.join(BASE_DIR, `${instrument}-mp3`);
        fs.mkdirSync(dir, { recursive: true });

        const urls = {};
        let successCount = 0;

        console.log(`\nProcessing instrument: ${instrument}`);

        for (const note of NOTES_TO_DOWNLOAD) {
            const filename = `${note}.mp3`;
            const dest = path.join(dir, filename);
            const url = `https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/${instrument}-mp3/${filename}`;

            if (fs.existsSync(dest)) {
                urls[note] = filename;
                successCount++;
                continue;
            }

            try {
                process.stdout.write(`   Downloading ${note}... `);
                await downloadFile(url, dest);
                urls[note] = filename;
                successCount++;
                process.stdout.write('✓\n');
            } catch(e) {
                process.stdout.write(`✕ (${e})\n`);
            }
        }
        
        if (successCount > 0) {
            newPresets[id] = {
                id: id,
                name: instrument.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                category: 'Musyng Kite',
                type: 'sampler',
                config: {
                    baseUrl: `${PUBLIC_URL_ROOT}${instrument}-mp3/`,
                    urls: urls,
                    envelope: { attack: 0.05, release: 1.0 },
                    volume: -8
                }
            };
            newPresetCount++;
        } else {
            console.log(`   -> No samples found for ${instrument}, skipping preset generation.`);
        }
    }

    if (newPresetCount > 0) {
        console.log('\n// --- APPEND THIS BLOCK to your AUDIO_PRESETS object in presets.ts ---');
        
        const jsonStr = JSON.stringify(newPresets, null, 4);
        const jsObjStr = jsonStr.replace(/"([^"]+)":/g, (match, key) => {
            if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) return `${key}:`;
            return `'${key}':`;
        }).replace(/"/g, "'");
        
        const finalOutput = jsObjStr.substring(1, jsObjStr.length - 1).trim() + ',';
        console.log(finalOutput);

        console.log('// --------------------------------------------------------------------');
    } else {
        console.log("\n✅ All Musyng Kite presets are already in your library.");
    }
}

main();