const fs = require('fs');
const path = require('path');

const DIR = './public/sounds/standard';

function checkDirectory(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            checkDirectory(fullPath);
        } else if (file.endsWith('.mp3')) {
            const fd = fs.openSync(fullPath, 'r');
            const buffer = Buffer.alloc(3);
            fs.readSync(fd, buffer, 0, 3, 0);
            fs.closeSync(fd);
            const isID3 = buffer.toString() === 'ID3';
            const isMPEG = buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0;
            
            if (!isID3 && !isMPEG) {
                console.error(`❌ INVALID MP3: ${fullPath}`);
                const text = fs.readFileSync(fullPath, 'utf-8').slice(0, 50);
                console.log(`   Header: "${text}..."`);
            } else {
                console.log(`✅ Valid: ${file}`);
            }
        }
    });
}

if (fs.existsSync(DIR)) {
    checkDirectory(DIR);
} else {
    console.log("Directory not found.");
}