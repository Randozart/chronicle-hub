const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_DIR = './public/sounds/standard/karoryfer';

const REPOS = [
  'bass-electric',
  'bass-fretless',
  'cello',
  'contrabass',
  'double-bass',
  'guitar-acoustic',
  'guitar-electric',
  'saxophone',
  'trumpet',
  'trombone',
  'violin'
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject();
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function fetchRepoSamples(repo) {
  const apiUrl = `https://api.github.com/repos/karoryfer-samples/${repo}/contents`;
  const headers = { 'User-Agent': 'chronicle-hub' };

  return new Promise((resolve) => {
    https.get(apiUrl, { headers }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve([]);
        }
      });
    });
  });
}

async function main() {
  for (const repo of REPOS) {
    const outDir = path.join(BASE_DIR, repo);
    fs.mkdirSync(outDir, { recursive: true });

    console.log(`\n📦 Importing ${repo}`);

    const files = await fetchRepoSamples(repo);

    for (const f of files) {
      if (!f.name.endsWith('.wav')) continue;

      const dest = path.join(outDir, f.name);
      if (fs.existsSync(dest)) continue;

      console.log(`⬇ ${f.name}`);
      try {
        await download(f.download_url, dest);
      } catch {}
    }
  }

  console.log('\n✅ Karoryfer import complete');
}

main();
