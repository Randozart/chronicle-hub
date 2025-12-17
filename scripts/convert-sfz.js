const fs = require('fs');
const path = require('path');

// CONFIG
const SOURCE_DIR = './public/sounds/imported_sf2'; 
const PUBLIC_URL_ROOT = '/sounds/imported_sf2/';
const MAX_DEPTH = 10; // Safety brake

function midiToNote(midi) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    const note = notes[midi % 12];
    return `${note}${octave}`;
}

// Fixed Recursive Scanner
function getAllFiles(dirPath, arrayOfFiles, depth = 0) {
    if (depth > MAX_DEPTH) {
        console.warn(`⚠ Max depth reached at ${dirPath}, skipping...`);
        return arrayOfFiles || [];
    }

    try {
        const files = fs.readdirSync(dirPath);
        arrayOfFiles = arrayOfFiles || [];

        files.forEach(function(file) {
            const fullPath = path.join(dirPath, file);
            
            // Use lstatSync instead of statSync to detect Symlinks/Shortcuts without following them
            const stat = fs.lstatSync(fullPath);

            if (stat.isDirectory()) {
                // Determine if this is a real directory or a link
                if (!stat.isSymbolicLink()) {
                    arrayOfFiles = getAllFiles(fullPath, arrayOfFiles, depth + 1);
                } else {
                    console.log(`   → Skipping symlink: ${file}`);
                }
            } else {
                if (file.toLowerCase().endsWith('.sfz')) {
                    arrayOfFiles.push(fullPath);
                }
            }
        });
    } catch (e) {
        console.warn(`   ⚠ Could not read directory ${dirPath}: ${e.message}`);
    }

    return arrayOfFiles;
}

function parseSfz(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const urls = {};
    
    const sfzDir = path.dirname(filePath);
    let currentSample = null;
    let currentKey = null;

    const tryCommit = () => {
        if (currentSample && currentKey !== null) {
            const noteName = midiToNote(currentKey);
            
            // 1. Construct absolute path
            // Handle both \ and / from SFZ files
            let sampleRelPath = currentSample.replace(/\\/g, path.sep).replace(/\//g, path.sep);
            let fullSystemPath = path.join(sfzDir, sampleRelPath);

            // 2. Check if file exists
            if (fs.existsSync(fullSystemPath)) {
                // 3. Convert to Web URL
                const absSourceDir = path.resolve(SOURCE_DIR);
                const relFromRoot = path.relative(absSourceDir, fullSystemPath);
                // Web URLs must always use forward slashes
                const finalWebPath = relFromRoot.replace(/\\/g, '/');
                
                urls[noteName] = finalWebPath;
            }
            currentKey = null;
            currentSample = null; 
        }
    };

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return;
        if (trimmed.startsWith('<region>')) { currentSample = null; currentKey = null; }

        const sampleMatch = trimmed.match(/sample=([^=]+?)(?:\s+\w+=|$)/);
        if (sampleMatch) currentSample = sampleMatch[1].trim();

        const keyMatch = trimmed.match(/(?:pitch_keycenter|key|lokey)=(\d+)/);
        if (keyMatch) currentKey = parseInt(keyMatch[1]);

        tryCommit();
    });

    return urls;
}

function generatePresets() {
    if (!fs.existsSync(SOURCE_DIR)) {
        console.error(`ERROR: Directory '${SOURCE_DIR}' not found.`);
        return;
    }

    console.log(`Scanning '${SOURCE_DIR}' recursively...`);
    const sfzFiles = getAllFiles(SOURCE_DIR);
    const presets = {};
    let count = 0;

    sfzFiles.forEach(file => {
        const filename = path.basename(file);
        const id = filename.replace('.sfz', '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const name = filename.replace('.sfz', '').replace(/_/g, ' ');

        // Category from folder name
        const parentDir = path.basename(path.dirname(file));
        const category = parentDir === 'imported_sf2' ? 'Imported' : parentDir;
        
        try {
            const urls = parseSfz(file);
            if (Object.keys(urls).length > 0) {
                presets[id] = {
                    id: id,
                    name: name,
                    category: category,
                    type: 'sampler',
                    config: {
                        baseUrl: PUBLIC_URL_ROOT,
                        urls: urls,
                        envelope: { attack: 0.1, release: 0.5 },
                        volume: -5
                    }
                };
                count++;
                console.log(`   ✓ Mapped: ${name} (${category})`);
            }
        } catch (e) {
            console.error(`   ✕ Error: ${filename}`);
        }
    });

    if (count > 0) {
        console.log('\n// --- PASTE INTO src/engine/audio/presets.ts ---');
        
        const output = JSON.stringify(presets, null, 4);
        console.log(output.substring(1, output.lastIndexOf('}')) + ',');
        
        console.log('// ----------------------------------------------');
    } else {
        console.log("No valid SFZ files found.");
    }
}

generatePresets();