// src/engine/themeParser.ts

import fs from 'fs';
import path from 'path';

type ThemePalette = Record<string, string>;

let themeCache: Record<string, ThemePalette> | null = null;
let lastReadTime = 0;
const CACHE_TTL = 60 * 1000; 

export const getThemeColors = (themeName: string = 'default'): ThemePalette => {
    const now = Date.now();
    if (!themeCache || (now - lastReadTime > CACHE_TTL)) {
        themeCache = parseThemeCss();
        lastReadTime = now;
    }
    return { 
        ...(themeCache[':root'] || {}), 
        ...(themeCache[themeName] || {}) 
    };
};

function parseThemeCss(): Record<string, ThemePalette> {
    const themes: Record<string, ThemePalette> = {};
    const cssPath = path.join(process.cwd(), 'src/styles/theme.css');

    try {
        const cssContent = fs.readFileSync(cssPath, 'utf-8');
        const blockRegex = /([^{]+)\s*\{\s*([^}]+)\s*\}/g;
        let match;

        while ((match = blockRegex.exec(cssContent)) !== null) {
            let selector = match[1].trim();
            const body = match[2];
            if (selector.includes('[data-theme=')) {
                const nameMatch = selector.match(/'([^']+)'/);
                if (nameMatch) selector = nameMatch[1];
            } else if (selector.includes('[data-global-theme=')) {
                 const nameMatch = selector.match(/'([^']+)'/);
                 if (nameMatch) selector = nameMatch[1];
            }
            const vars: ThemePalette = {};
            const varRegex = /(--[^:]+):\s*([^;]+);/g;
            let varMatch;
            
            while ((varMatch = varRegex.exec(body)) !== null) {
                const key = varMatch[1].trim();
                const val = varMatch[2].trim();
                vars[key] = val;
            }

            if (Object.keys(vars).length > 0) {
                themes[selector] = vars;
            }
        }
    } catch (e) {
        console.error("Error parsing theme.css:", e);
    }

    return themes;
}