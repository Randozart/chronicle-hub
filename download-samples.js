const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_DIR = './public/sounds/standard';

const SAMPLES = {
    'electric_guitar': {
    'C3.wav': 'https://raw.githubusercontent.com/sfzinstruments/karoryfer.black-and-green-guitars/master/samples/BlackAndGreenGuitars_C3.wav',
    'G3.wav': 'https://raw.githubusercontent.com/sfzinstruments/karoryfer.black-and-green-guitars/master/samples/BlackAndGreenGuitars_G3.wav',
    'C4.wav': 'https://raw.githubusercontent.com/sfzinstruments/karoryfer.black-and-green-guitars/master/samples/BlackAndGreenGuitars_C4.wav',
    'G4.wav': 'https://raw.githubusercontent.com/sfzinstruments/karoryfer.black-and-green-guitars/master/samples/BlackAndGreenGuitars_G4.wav'
},
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