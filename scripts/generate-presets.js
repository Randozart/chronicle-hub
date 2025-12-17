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

    let existingIds = new Set();
    try {
        const existingContent = fs.readFileSync(PRESETS_FILE_PATH, 'utf-8');
        const idRegex = /id:\s*['"]([^'"]+)['"]/g;
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
        if (existingIds.has(id)) return;

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
        
        // --- THE FIX ---
        // 1. Generate standard JSON
        const jsonStr = JSON.stringify(newPresets, null, 4);

        // 2. Intelligently remove quotes from valid JS object keys, and convert others to single quotes.
        const jsObjStr = jsonStr.replace(/"([^"]+)":/g, (match, key) => {
            // If the key is a valid identifier (letters, numbers, underscore, not starting with a number),
            // it can be unquoted.
            if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
                return `${key}:`;
            }
            // Otherwise (e.g., keys with '#', or starting with a number like "C#4"),
            // keep it quoted, but with single quotes for consistency.
            return `'${key}':`;
        }).replace(/"/g, "'"); // Convert all remaining double quotes (values) to single quotes.
        
        // 3. Remove outer braces
        const finalOutput = jsObjStr.substring(1, jsObjStr.length - 1).trim() + ',';
        
        console.log(finalOutput);
        console.log('// --------------------------------------------------------------------');
    } else {
        console.log("\n✅ All presets are up-to-date. Nothing to add.");
    }
}

generatePresets();