// src/engine/audio/merger.ts
export function mergeLigatureSnippet(mainSource: string, snippet: string): string {
    const sections = ['CONFIG', 'INSTRUMENTS', 'DEFINITIONS', 'PATTERN', 'PLAYLIST'];
    const snippetSections: Record<string, string[]> = {};
    let currentSection = '';
    snippet.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const sectionMatch = trimmed.match(/^\[([A-Z:]+)/);
        if (sectionMatch) {
            const header = sectionMatch[1].split(':')[0];
            currentSection = header;
            if (!snippetSections[currentSection]) {
                snippetSections[currentSection] = [];
            }
            if (currentSection === 'PATTERN') {
                snippetSections[currentSection].push(line);
            }
        } else if (currentSection && !line.startsWith('//')) {
            snippetSections[currentSection].push(line);
        }
    });

    let outputLines = mainSource.split('\n');
    const injectContent = (sectionName: string, content: string[]) => {
        const regex = new RegExp(`^\\[(${sectionName.split('|').join('|')})`, 'i');
        let sectionIndex = outputLines.findIndex(line => regex.test(line.trim()));

        if (sectionIndex === -1) {
            outputLines.push(`\n[${sectionName.split('|')[0]}]`);
            outputLines.push(...content);
        } else {
            let endIndex = sectionIndex + 1;
            while (endIndex < outputLines.length && !outputLines[endIndex].trim().startsWith('[')) {
                endIndex++;
            }
            outputLines.splice(endIndex, 0, ...content);
        }
    };
    if (snippetSections['INSTRUMENTS']) {
        injectContent('INSTRUMENTS|INST|INS', snippetSections['INSTRUMENTS']);
    }
    if (snippetSections['DEFINITIONS']) {
        injectContent('DEFINITIONS|DEF|DEFS', snippetSections['DEFINITIONS']);
    }
    if (snippetSections['PATTERN']) {
        injectContent('PATTERN|PAT|P', ['', ...snippetSections['PATTERN']]);
    }
    if (snippetSections['PLAYLIST']) {
        injectContent('PLAYLIST|PLAY|SEQ|LIST', snippetSections['PLAYLIST']);
    }
    return outputLines.join('\n');
}