import fs from 'fs';
import path from 'path';

type ThemePalette = Record<string, string>;

export const getAllThemes = (): Record<string, ThemePalette> => {
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
                vars[varMatch[1].trim()] = varMatch[2].trim();
            }

            if (Object.keys(vars).length > 0) {
                themes[selector] = { ...(themes[selector] || {}), ...vars };
            }
        }
    } catch (e) {
        console.error("Error parsing theme.css:", e);
    }
    return themes;
};