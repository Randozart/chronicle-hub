
const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_DIR = './public/sounds/standard/tonejs';
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
      }
    }
  }

  console.log('✅ ToneJS instruments imported');
}

main();
