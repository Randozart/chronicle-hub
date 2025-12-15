const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_DIR = './public/sounds/standard';

const REPLACEMENTS = {
    'electric_guitar': {
        // These are WAV files, but saving with .mp3 extension is fine for the browser
        'C3.mp3': 'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/guitar-electric/C3.wav',
        'G3.mp3': 'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/guitar-electric/G3.wav',
        'C4.mp3': 'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/guitar-electric/C4.wav',
        'G4.mp3': 'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/guitar-electric/G4.wav'
    },
    // Rerun drums to be safe
    'standard_kit': {
        // ... (Keep Kick, Snare, Tom, HiHat_Closed)
        'Kick.mp3': 'https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3',
        'Snare.mp3': 'https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3',
        'HiHat_Closed.mp3': 'https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3',
        'Tom_Low.mp3': 'https://tonejs.github.io/audio/drum-samples/CR78/tom1.mp3',
        'Tom_High.mp3': 'https://tonejs.github.io/audio/drum-samples/CR78/tom2.mp3',
        
        // FIX: The correct filename for Open Hat in CR78 folder
        'HiHat_Open.mp3': 'https://tonejs.github.io/audio/drum-samples/CR78/cymbal.mp3', 
        
        // FIX: Re-use cymbal for crash
        'Crash.mp3': 'https://tonejs.github.io/audio/drum-samples/CR78/cymbal.mp3'
    }
};

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        // Handle WAV extension in URL mapping to MP3 filename locally
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
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
    console.log("Fixing broken samples...");
    
    for (const [instrument, files] of Object.entries(REPLACEMENTS)) {
        const dir = path.join(BASE_DIR, instrument);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        for (const [filename, url] of Object.entries(files)) {
            const dest = path.join(dir, filename);
            // Overwrite existing to be sure
            try {
                await downloadFile(url, dest);
            } catch (e) {
                console.error(e);
            }
        }
    }
    console.log("Fix Complete.");
}

main();