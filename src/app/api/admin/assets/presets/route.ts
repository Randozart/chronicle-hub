import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    const presetsDir = path.join(process.cwd(), 'public', 'presets');
    
    try {
        if (!fs.existsSync(presetsDir)) {
            return NextResponse.json({ categories: [] });
        }

        const categories: { name: string, files: { path: string, name: string }[] }[] = [];
        const sources = fs.readdirSync(presetsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory());

        for (const source of sources) {
            const sourcePath = path.join(presetsDir, source.name);
            const artists = fs.readdirSync(sourcePath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory());

            for (const artist of artists) {
                const artistPath = path.join(sourcePath, artist.name);
                const files = fs.readdirSync(artistPath)
                    .filter(file => file.endsWith('.svg'))
                    .map(file => ({
                        path: `presets/${source.name}/${artist.name}/${file}`,
                        name: file.replace('.svg', '').replace(/[-_]/g, ' ')
                    }));

                if (files.length > 0) {
                    categories.push({
                        name: `${source.name} / ${artist.name}`,
                        files
                    });
                }
            }
        }

        return NextResponse.json({ categories });

    } catch (error) {
        console.error("Error scanning presets:", error);
        return NextResponse.json({ error: 'Failed to scan presets' }, { status: 500 });
    }
}