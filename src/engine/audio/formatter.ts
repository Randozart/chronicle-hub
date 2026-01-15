// src/engine/audio/formatter.ts
const TOKEN_REGEX = /(\(.*?\)|@\w+(?:\(\s*[+-]?\d+\s*\))?|(\d+['#b%,]*(?:\([^)]*\))?(?:\^\[.*?\])?)|[-.|])/g;

export function formatLigatureSource(source: string): string {
    const lines = source.split('\n');
    const outputLines: string[] = [];
    let currentPatternLines: { trackName: string, content: string, originalIndex: number }[] = [];
    let inPatternBlock = false;
    const flushPattern = () => {
        if (currentPatternLines.length === 0) return;

        let grid = 4, timeSig = [4, 4];
        const configBlock = source.split('[CONFIG]')[1]?.split('[')[0] || '';
        const gridMatch = configBlock.match(/Grid:\s*(\d+)/);
        const timeMatch = configBlock.match(/Time:\s*(\d+)\/(\d+)/);
        if (gridMatch) grid = parseInt(gridMatch[1]);
        if (timeMatch) timeSig = [parseInt(timeMatch[1]), parseInt(timeMatch[2])];
        
        const quarterNotesPerBeat = 4 / timeSig[1];
        const slotsPerBeat = grid * quarterNotesPerBeat;

        const parsedTracks = currentPatternLines.map(line => {
            const tokens = line.content.match(TOKEN_REGEX) || [];
            const bars: string[][] = [];
            let currentBar: string[] = [];
            
            tokens.forEach(token => {
                if (token === '|') {
                    if (currentBar.length > 0) {
                        bars.push(currentBar);
                        currentBar = [];
                    }
                } else {
                    currentBar.push(token);
                }
            });
            if (currentBar.length > 0) bars.push(currentBar);

            return { trackName: line.trackName, bars };
        });

        const barCount = Math.max(...parsedTracks.map(t => t.bars.length));
        const maxTrackNameLength = Math.max(...parsedTracks.map(t => t.trackName.length));

        const barColumnWidths: number[][] = [];
        for (let i = 0; i < barCount; i++) {
            barColumnWidths[i] = [];
            const maxTokensInBar = Math.max(...parsedTracks.map(t => t.bars[i]?.length || 0));
            for (let j = 0; j < maxTokensInBar; j++) {
                const maxWidth = Math.max(...parsedTracks.map(t => t.bars[i]?.[j]?.length || 0));
                barColumnWidths[i][j] = maxWidth;
            }
        }

        const formattedLines = parsedTracks.map(track => {
            let line = `${track.trackName.padEnd(maxTrackNameLength)} |`;
            for (let i = 0; i < barCount; i++) {
                const bar = track.bars[i] || [];
                const widths = barColumnWidths[i];
                for (let j = 0; j < (widths?.length || 0); j++) {
                    const token = bar[j] || '';
                    if (j > 0 && j % slotsPerBeat === 0) {
                        line += '  '; 
                    }
                    line += ` ${token.padEnd(widths[j] || 0)}`;
                }
                line += ' |';
            }
            return line;
        });

        currentPatternLines.forEach((line, index) => {
            outputLines[line.originalIndex] = formattedLines[index];
        });

        currentPatternLines = [];
    };

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        const sectionMatch = trimmed.match(/^\[(.*?)\]$/);
        outputLines[index] = line; 

        if (sectionMatch) {
            flushPattern(); 
            inPatternBlock = sectionMatch[1].startsWith('PATTERN:');
        } else if (inPatternBlock && trimmed.includes('|')) {
            const pipeIndex = trimmed.indexOf('|');
            const trackName = trimmed.substring(0, pipeIndex).trim();
            const content = trimmed.substring(pipeIndex);
            currentPatternLines.push({ trackName, content, originalIndex: index });
        }
    });

    flushPattern(); 
    return outputLines.join('\n');
}