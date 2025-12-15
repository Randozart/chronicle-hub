// const fs = require('fs');
// const path = require('path');
// const https = require('https');

// const BASE_DIR = './public/sounds/standard';

// const SAMPLES = {
//     'electric_guitar': {
//     'C3.wav': 'https://raw.githubusercontent.com/sfzinstruments/karoryfer.black-and-green-guitars/master/samples/BlackAndGreenGuitars_C3.wav',
//     'G3.wav': 'https://raw.githubusercontent.com/sfzinstruments/karoryfer.black-and-green-guitars/master/samples/BlackAndGreenGuitars_G3.wav',
//     'C4.wav': 'https://raw.githubusercontent.com/sfzinstruments/karoryfer.black-and-green-guitars/master/samples/BlackAndGreenGuitars_C4.wav',
//     'G4.wav': 'https://raw.githubusercontent.com/sfzinstruments/karoryfer.black-and-green-guitars/master/samples/BlackAndGreenGuitars_G4.wav'
// },
// };

// async function downloadFile(url, dest) {
//     return new Promise((resolve, reject) => {
//         const file = fs.createWriteStream(dest);
//         https.get(url, (response) => {
//             // Follow redirects if necessary (Github raw sometimes redirects)
//             if (response.statusCode === 302 || response.statusCode === 301) {
//                 downloadFile(response.headers.location, dest).then(resolve).catch(reject);
//                 return;
//             }
//             if (response.statusCode !== 200) {
//                 reject(`Failed to download ${url}: ${response.statusCode}`);
//                 return;
//             }
//             response.pipe(file);
//             file.on('finish', () => {
//                 file.close();
//                 console.log(`Saved: ${dest}`);
//                 resolve();
//             });
//         }).on('error', (err) => {
//             fs.unlink(dest, () => {});
//             reject(err.message);
//         });
//     });
// }

// async function main() {
//     for (const [instrument, files] of Object.entries(SAMPLES)) {
//         const dir = path.join(BASE_DIR, instrument);
//         if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

//         for (const [filename, url] of Object.entries(files)) {
//             const dest = path.join(dir, filename);
//             if (!fs.existsSync(dest)) {
//                 console.log(`Downloading ${instrument}/${filename}...`);
//                 try {
//                     await downloadFile(url, dest);
//                 } catch (e) {
//                     console.error(e);
//                     // Continue even if one fails
//                 }
//             }
//         }
//     }
//     console.log("Done!");
// }

// main();

const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_DIR = './public/sounds/standard/tonejs';

// All instruments present in tonejs-instruments/samples
const INSTRUMENTS = [
  'bass-electric',
  'bassoon',
  'cello',
  'clarinet',
  'contrabass',
  'flute',
  'french-horn',
  'guitar-acoustic',
  'guitar-electric',
  'harmonium',
  'harp',
  'organ',
  'piano',
  'saxophone',
  'trombone',
  'trumpet',
  'tuba',
  'violin',
  'xylophone'
];

// Canonical note set used by tonejs-instruments
const NOTES = [
  'C2','D2','E2','F2','G2','A2','B2',
  'C3','D3','E3','F3','G3','A3','B3',
  'C4','D4','E4','F4','G4','A4','B4',
  'C5','D5','E5','F5','G5','A5','B5'
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(`Failed ${res.statusCode}: ${url}`);
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err.message);
    });
  });
}

async function main() {
  for (const instrument of INSTRUMENTS) {
    const dir = path.join(BASE_DIR, instrument);
    fs.mkdirSync(dir, { recursive: true });

    for (const note of NOTES) {
      const filename = `${note}.mp3`;
      const dest = path.join(dir, filename);

      if (fs.existsSync(dest)) continue;

      const url =
        `https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/${instrument}/${filename}`;

      try {
        console.log(`⬇ ${instrument}/${filename}`);
        await download(url, dest);
      } catch {
        // Some instruments don’t have every note — that’s expected
      }
    }
  }

  console.log('✅ ToneJS instruments imported');
}

main();
