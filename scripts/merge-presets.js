// scripts/merge-presets.js
const fs = require('fs');
const path = require('path');

const targetPath = process.argv[2]; 
const sourcePath = process.argv[3];

if (!targetPath || !sourcePath) {
    console.error("Usage: node scripts/merge-presets.js <target_ts> <source_json>");
    process.exit(1);
}

// Helper to strip everything except letters/numbers for matching
function normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

try {
    // 1. Load Source (Browser JSON with Loops)
    console.log(`Reading source loops from: ${sourcePath}`);
    const sourceRaw = fs.readFileSync(sourcePath, 'utf8');
    const sourceData = JSON.parse(sourceRaw); 
    
    // Map NormalizedID -> Loop Config
    const loopMap = new Map();
    const sourceArray = Array.isArray(sourceData) ? sourceData : Object.values(sourceData);
    
    sourceArray.forEach(item => {
        if (item.id && item.config && item.config.loop) {
            const key = normalize(item.id);
            loopMap.set(key, item.config.loop);
        }
    });
    console.log(`Loaded ${loopMap.size} loop definitions.`);

    // 2. Load Target (Node Output TS)
    console.log(`Reading target presets from: ${targetPath}`);
    const targetRaw = fs.readFileSync(targetPath, 'utf8');
    
    let targetArray = [];
    try {
        const wrapped = `({ ${targetRaw} })`;
        const obj = eval(wrapped);
        targetArray = Object.values(obj);
    } catch (e) {
        console.error("Error parsing TS file. Ensure it contains valid JS objects.");
        process.exit(1);
    }

    // 3. Merge Logic
    let updateCount = 0;
    const outputLines = [];
    const missingIds = [];

    targetArray.forEach(preset => {
        const key = normalize(preset.id);
        
        if (loopMap.has(key)) {
            const loopData = loopMap.get(key);
            preset.config.loop = loopData;
            updateCount++;
        } else {
            missingIds.push(preset.id);
        }

        outputLines.push(`'${preset.id}': ${JSON.stringify(preset, null, 4)}`);
    });

    // 4. Report & Write
    const finalOutput = outputLines.join(',\n\n');
    const outPath = path.join(path.dirname(targetPath), '_presets_merged.ts');
    
    fs.writeFileSync(outPath, finalOutput);
    
    console.log(`----------------------------------------`);
    console.log(`✅ Merged ${updateCount} / ${targetArray.length} loops.`);
    if (missingIds.length > 0) {
        console.warn(`⚠️  Could not match ${missingIds.length} IDs. First 5 mismatches:`);
        missingIds.slice(0, 5).forEach(id => console.warn(`   - ${id} (Normalized: ${normalize(id)})`));
    }
    console.log(`📂 Saved to: ${outPath}`);
    console.log(`----------------------------------------`);

} catch (err) {
    console.error("Error:", err.message);
}