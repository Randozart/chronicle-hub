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
    // 1. Load Source (Browser JSON)
    console.log(`Reading source data from: ${sourcePath}`);
    const sourceRaw = fs.readFileSync(sourcePath, 'utf8');
    const sourceData = JSON.parse(sourceRaw); 
    
    // Map NormalizedID -> Config (Loop + Envelope)
    const configMap = new Map();
    const sourceArray = Array.isArray(sourceData) ? sourceData : Object.values(sourceData);
    
    sourceArray.forEach(item => {
        if (item.id && item.config) {
            const key = normalize(item.id);
            // Store the relevant parts we want to transfer
            configMap.set(key, { 
                loop: item.config.loop,
                envelope: item.config.envelope 
            });
        }
    });
    console.log(`Loaded ${configMap.size} config definitions.`);

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
        
        if (configMap.has(key)) {
            const sourceConfig = configMap.get(key);
            
            // 1. Merge Loop
            if (sourceConfig.loop) {
                preset.config.loop = sourceConfig.loop;
            }

            // 2. Merge Envelope (Attack/Release)
            if (sourceConfig.envelope) {
                preset.config.envelope = {
                    ...preset.config.envelope, // Keep existing props (if any)
                    ...sourceConfig.envelope   // Overwrite with optimized browser values
                };
            }

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
    console.log(`✅ Merged Loops & Envelopes for ${updateCount} / ${targetArray.length} presets.`);
    if (missingIds.length > 0) {
        console.warn(`⚠️  Could not match ${missingIds.length} IDs. First 5 mismatches:`);
        missingIds.slice(0, 5).forEach(id => console.warn(`   - ${id} (Normalized: ${normalize(id)})`));
    }
    console.log(`📂 Saved to: ${outPath}`);
    console.log(`----------------------------------------`);

} catch (err) {
    console.error("Error:", err.message);
}