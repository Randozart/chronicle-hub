// src/engine/audio/merger.ts

/**
 * Intelligently merges a Ligature snippet into a main source document.
 * It finds the correct [SECTION] and appends the new content.
 */
export function mergeLigatureSnippet(mainSource: string, snippet: string): string {
    const sections = ['CONFIG', 'INSTRUMENTS', 'DEFINITIONS', 'PATTERN', 'PLAYLIST'];
    const snippetSections: Record<string, string[]> = {};
    let currentSection = '';

    // 1. Parse the Snippet into sections
    snippet.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const sectionMatch = trimmed.match(/^\[([A-Z:]+)/);
        if (sectionMatch) {
            const header = sectionMatch[1].split(':')[0]; // Get 'PATTERN' from 'PATTERN: Name'
            currentSection = header;
            if (!snippetSections[currentSection]) {
                snippetSections[currentSection] = [];
            }
            // For patterns, keep the full header line
            if (currentSection === 'PATTERN') {
                snippetSections[currentSection].push(line);
            }
        } else if (currentSection && !line.startsWith('//')) {
            snippetSections[currentSection].push(line);
        }
    });

    let outputLines = mainSource.split('\n');

    // 2. Inject content into the main source
    const injectContent = (sectionName: string, content: string[]) => {
        const regex = new RegExp(`^\\[(${sectionName.split('|').join('|')})`, 'i');
        let sectionIndex = outputLines.findIndex(line => regex.test(line.trim()));

        if (sectionIndex === -1) {
            // If section doesn't exist, add it at the end
            outputLines.push(`\n[${sectionName.split('|')[0]}]`);
            outputLines.push(...content);
        } else {
            // Find the end of the section
            let endIndex = sectionIndex + 1;
            while (endIndex < outputLines.length && !outputLines[endIndex].trim().startsWith('[')) {
                endIndex++;
            }
            // Insert the new content before the next section starts
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
        // Add a blank line for separation
        injectContent('PATTERN|PAT|P', ['', ...snippetSections['PATTERN']]);
    }
    if (snippetSections['PLAYLIST']) {
        injectContent('PLAYLIST|PLAY|SEQ|LIST', snippetSections['PLAYLIST']);
    }
    // Note: We don't merge [CONFIG] or [INSTRUMENTS] from snippets to avoid conflicts.

    return outputLines.join('\n');
}