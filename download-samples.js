// download-samples.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_DIR = './public/sounds/standard';

// VSCO 2 Community Edition samples via GitHub CDN (gleitz/midi-js-soundfonts)
// These are pre-converted to MP3 for web use.
const SAMPLES = {
    // --- STRINGS ---
    'violin': {
        'C4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/violin-mp3/C4.mp3',
        'G4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/violin-mp3/G4.mp3',
        'C5.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/violin-mp3/C5.mp3',
        'A5.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/violin-mp3/A5.mp3'
    },
    'cello': {
        'C3.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/cello-mp3/C3.mp3',
        'G3.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/cello-mp3/G3.mp3',
        'C4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/cello-mp3/C4.mp3'
    },
    'contrabass': {
        'C2.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/contrabass-mp3/C2.mp3',
        'G2.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/contrabass-mp3/G2.mp3',
        'C3.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/contrabass-mp3/C3.mp3'
    },
    'pizzicato_strings': {
        'C4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/pizzicato_strings-mp3/C4.mp3',
        'G4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/pizzicato_strings-mp3/G4.mp3'
    },

    // --- WOODWINDS ---
    'flute': {
        'C5.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/flute-mp3/C5.mp3',
        'G5.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/flute-mp3/G5.mp3',
        'C6.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/flute-mp3/C6.mp3'
    },
    'clarinet': {
        'C4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/clarinet-mp3/C4.mp3',
        'G4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/clarinet-mp3/G4.mp3',
        'C5.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/clarinet-mp3/C5.mp3'
    },
    'oboe': {
        'C4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/oboe-mp3/C4.mp3',
        'G4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/oboe-mp3/G4.mp3',
        'C5.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/oboe-mp3/C5.mp3'
    },
    'bassoon': {
        'C3.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/bassoon-mp3/C3.mp3',
        'G3.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/bassoon-mp3/G3.mp3',
        'C4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/bassoon-mp3/C4.mp3'
    },

    // --- BRASS ---
    'horn': {
        'C4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/french_horn-mp3/C4.mp3',
        'G4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/french_horn-mp3/G4.mp3'
    },
    'trumpet': {
        'C5.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/trumpet-mp3/C5.mp3',
        'G5.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/trumpet-mp3/G5.mp3'
    },
    'trombone': {
        'C3.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/trombone-mp3/C3.mp3',
        'G3.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/trombone-mp3/G3.mp3'
    },
    'tuba': {
        'C2.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/tuba-mp3/C2.mp3',
        'G2.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/tuba-mp3/G2.mp3'
    },

    // --- KEYS & PERCUSSION ---
    'piano': {
        'C3.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/acoustic_grand_piano-mp3/C3.mp3',
        'C4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/acoustic_grand_piano-mp3/C4.mp3',
        'G4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/acoustic_grand_piano-mp3/G4.mp3',
        'C5.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/acoustic_grand_piano-mp3/C5.mp3'
    },
    'organ': {
        'C4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/church_organ-mp3/C4.mp3',
        'G4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/church_organ-mp3/G4.mp3',
        'C5.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/church_organ-mp3/C5.mp3'
    },
    'choir': {
        'C4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/choir_aahs-mp3/C4.mp3',
        'G4.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/choir_aahs-mp3/G4.mp3',
        'C5.mp3': 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/MusyngKite/choir_aahs-mp3/C5.mp3'
    }
};

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(`Failed to download: ${response.statusCode}`);
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
                await downloadFile(url, dest);
            }
        }
    }
    console.log("Done!");
}

main();