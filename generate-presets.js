const fs = require('fs');
const path = require('path');

const BASE_DIR = './public/sounds/standard/tonejs';
const PUBLIC_URL_ROOT = '/sounds/standard/tonejs/';
const PRESETS_FILE_PATH = './src/engine/audio/presets.ts';

function generatePresets() {
    if (!fs.existsSync(BASE_DIR)) {
        console.error(`ERROR: Directory '${BASE_DIR}' not found.`);
        return;
    }

    // 1. Read existing presets to avoid duplicates
    let existingIds = new Set();
    try {
        const existingContent = fs.readFileSync(PRESETS_FILE_PATH, 'utf-8');
        const idRegex = /id:\s*'([^']+)'/g;
        let match;
        while ((match = idRegex.exec(existingContent)) !== null) {
            existingIds.add(match[1]);
        }
        console.log(`Found ${existingIds.size} existing presets. Will skip duplicates.`);
    } catch (e) {
        console.warn("Could not read existing presets file. Generating all found instruments.");
    }

    const newPresets = {};
    const instrumentDirs = fs.readdirSync(BASE_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    instrumentDirs.forEach(dirName => {
        const id = dirName.replace(/-/g, '_');
        
        // --- SKIP IF ALREADY EXISTS ---
        if (existingIds.has(id)) {
            // console.log(`   - Skipping '${id}' (already exists)`);
            return;
        }

        const name = dirName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const category = 'ToneJS Instruments';

        const instrumentPath = path.join(BASE_DIR, dirName);
        const files = fs.readdirSync(instrumentPath);

        const urls = {};
        let noteCount = 0;
        files.forEach(file => {
            if (file.endsWith('.mp3')) {
                const note = path.basename(file, '.mp3');
                urls[note] = file;
                noteCount++;
            }
        });

        if (noteCount > 0) {
            newPresets[id] = {
                id: id,
                name: name,
                category: category,
                type: 'sampler',
                config: {
                    baseUrl: `${PUBLIC_URL_ROOT}${dirName}/`,
                    urls: urls,
                    envelope: { attack: 0.05, release: 1.0 },
                    volume: -8
                }
            };
            console.log(`   ✓ Generated new preset for '${name}'`);
        }
    });

    if (Object.keys(newPresets).length > 0) {
        console.log('\n// --- APPEND THIS BLOCK TO YOUR AUDIO_PRESETS OBJECT in presets.ts ---');
        
        const jsonStr = JSON.stringify(newPresets, null, 4);
        const jsObjStr = jsonStr
            .replace(/"([^"]+)":/g, "'$1':") 
            .replace(/"/g, "'");              
    
        console.log(jsObjStr.substring(1, jsObjStr.length - 1) + ',');
        
        console.log('// --------------------------------------------------------------------');
    } else {
        console.log("\n✅ All presets are up-to-date. Nothing to add.");
    }
}

generatePresets();