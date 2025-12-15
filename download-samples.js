const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_DIR = './public/sounds/standard';

const SAMPLES = {
    // ... (Keep your existing piano/violin/etc. if they worked) ...

    'electric_guitar': {
        // Source: Benjamin Gleitzman's "FatBoy" soundfont conversion
        // Note: The folder name is "electric_guitar_clean-mp3"
        'C3.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/FatBoy/electric_guitar_clean-mp3/C3.mp3',
        'G3.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/FatBoy/electric_guitar_clean-mp3/G3.mp3',
        'C4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/FatBoy/electric_guitar_clean-mp3/C4.mp3',
        'G4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/FatBoy/electric_guitar_clean-mp3/G4.mp3'
    },
    'standard_kit': {
        // Standard General MIDI mapping (Channel 10)
        // Note: Filenames are MIDI numbers. 
        // 36 (C1) = Kick, 38 (D1) = Snare, 42 (F#1) = Closed HH
        'Kick.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/FluidR3_GM/drum_kit-mp3/36.mp3',
        'Snare.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/FluidR3_GM/drum_kit-mp3/38.mp3',
        'HiHat_Closed.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/FluidR3_GM/drum_kit-mp3/42.mp3',
        'HiHat_Open.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/FluidR3_GM/drum_kit-mp3/46.mp3',
        'Crash.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/FluidR3_GM/drum_kit-mp3/49.mp3',
        'Tom_High.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/FluidR3_GM/drum_kit-mp3/50.mp3',
        'Tom_Low.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/FluidR3_GM/drum_kit-mp3/45.mp3'
    }
};

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            // Follow redirects if necessary (Github raw sometimes redirects)
            if (response.statusCode === 302 || response.statusCode === 301) {
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                reject(`Failed to download ${url}: ${response.statusCode}`);
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Saved: ${dest}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err.message);
        });
    });
}

async function main() {
    for (const [instrument, files] of Object.entries(SAMPLES)) {
        const dir = path.join(BASE_DIR, instrument);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        for (const [filename, url] of Object.entries(files)) {
            const dest = path.join(dir, filename);
            if (!fs.existsSync(dest)) {
                console.log(`Downloading ${instrument}/${filename}...`);
                try {
                    await downloadFile(url, dest);
                } catch (e) {
                    console.error(e);
                    // Continue even if one fails
                }
            }
        }
    }
    console.log("Done!");
}

main();