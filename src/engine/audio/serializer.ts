// src/engine/audio/serializer.ts

import { ParsedTrack, SequenceEvent, NoteDef, ParsedPattern } from './models';

// Helper to generate a consistent signature for a note array
function getNoteSignature(notes: NoteDef[]): string {
    return notes
        .map(n => `${n.degree},${n.octaveShift},${n.accidental},${n.isNatural}`)
        .sort()
        .join(';');
}

export function serializeParsedTrack(track: ParsedTrack): string {
  const lines: string[] = [];

  lines.push('[CONFIG]');
  lines.push(`BPM: ${track.config.bpm}`);
  lines.push(`Grid: ${track.config.grid}`);
  lines.push(`Time: ${track.config.timeSig[0]}/${track.config.timeSig[1]}`);
  lines.push(`Scale: ${track.config.scaleRoot} ${track.config.scaleMode}`);
  lines.push('');

  lines.push('[INSTRUMENTS]');
  for (const [name, inst] of Object.entries(track.instruments)) {
    lines.push(`${name}: ${inst.id}`);
  }
  lines.push('');

  // Build a reverse map from note signatures to alias names.
  const aliasMap = new Map<string, string>();
  if (Object.keys(track.definitions).length > 0) {
    lines.push('[DEFINITIONS]');
    for (const [name, notes] of Object.entries(track.definitions)) {
      const alias = name.startsWith('@') ? name : `@${name}`;
      lines.push(`${alias} = [${notes.map(serializeNote).join(', ')}]`);
      aliasMap.set(getNoteSignature(notes), alias);
    }
    lines.push('');
  }

  for (const pattern of Object.values(track.patterns)) {
    lines.push(`[PATTERN: ${pattern.id}]`);
    const maxTrackNameLength = Math.max(...Object.keys(pattern.tracks).map(name => name.length), 0);
    for (const [trackName, events] of Object.entries(pattern.tracks)) {
      const serializedLine = serializeEvents(events, pattern, track.config, aliasMap);
      // The serializer returns content joined by " | ", so we wrap it in the outer pipes
      lines.push(`${trackName.padEnd(maxTrackNameLength)} | ${serializedLine} |`);
    }
    lines.push('');
  }

  lines.push('[PLAYLIST]');
  for (const item of track.playlist) {
    if (item.type === 'command') {
      lines.push(`${item.command}=${item.value}`);
    } else {
      lines.push(item.patterns.map(p => p.transposition ? `${p.id}(${p.transposition})` : p.id).join(', '));
    }
  }

  return lines.join('\n');
}

function serializeEvents(
    events: SequenceEvent[],
    pattern: ParsedPattern,
    config: ParsedTrack['config'],
    aliasMap: Map<string, string>
): string {
    const { grid, timeSig } = config;
    const slotsPerBeat = grid * (4 / timeSig[1]);
    const slotsPerBar = slotsPerBeat * timeSig[0];
    
    // Ensure we cover the full duration, or expand if events go beyond
    const totalSlots = Math.max(pattern.duration, Math.ceil(Math.max(0, ...events.map(e => e.time + e.duration))));
    
    // Group events by the integer grid slot they start in
    // This effectively "quantizes" the start times to the grid for categorization
    const slotEvents: Record<number, SequenceEvent[]> = {};
    
    events.forEach(e => {
        const slotIndex = Math.floor(e.time);
        if (!slotEvents[slotIndex]) slotEvents[slotIndex] = [];
        slotEvents[slotIndex].push(e);
    });

    const slots: string[] = [];

    // 1. Build the linear array of slot strings (., -, 1, (1 3), etc)
    for (let s = 0; s < totalSlots; s++) {
        const evs = slotEvents[s];

        if (evs && evs.length > 0) {
            // Sort by time within the slot to ensure correct order inside tuplet
            evs.sort((a, b) => a.time - b.time);

            // Check if it's a single, strictly on-grid note
            // (Tolerance of 0.001 covers floating point drifts)
            if (evs.length === 1 && Math.abs(evs[0].time - s) < 0.001) {
                slots[s] = serializeNoteOrAlias(evs[0].notes, aliasMap);
            } else {
                // *** TUPLET LOGIC ***
                // Multiple notes in this slot, or a single note that starts off-grid.
                // We wrap purely this slot in ().
                const notes = evs.map(e => serializeNoteOrAlias(e.notes, aliasMap));
                slots[s] = `(${notes.join(' ')})`;
            }
        } else {
            // No new event starts here. Check if a previous note is sustaining through this slot.
            const isSustaining = events.some(e => {
                const start = e.time;
                const end = e.time + e.duration;
                // Strictly greater than start (so we don't count the start slot)
                // Strictly less than end (so we don't count the slot after release)
                return s > start && s < end - 0.01;
            });

            if (isSustaining) {
                slots[s] = '-';
            } else {
                slots[s] = '.';
            }
        }
    }

    // 2. Format the linear array into Bars and Beats
    const bars: string[] = [];
    const totalBars = Math.ceil(slots.length / slotsPerBar);

    for (let b = 0; b < totalBars; b++) {
        let barStr = '';
        for (let s = 0; s < slotsPerBar; s++) {
            const absIndex = (b * slotsPerBar) + s;
            if (absIndex >= slots.length) break; // Should not happen with padding logic

            // Add extra space between beats for readability
            if (s > 0 && s % slotsPerBeat === 0) {
                barStr += '  ';
            } else if (s > 0) {
                barStr += ' ';
            }
            
            barStr += slots[absIndex] || '.';
        }
        bars.push(barStr);
    }

    return bars.join(' | ');
}

function serializeNoteOrAlias(notes: NoteDef[], aliasMap: Map<string, string>): string {
    if (notes.length > 1) {
        const sig = getNoteSignature(notes);
        if (aliasMap.has(sig)) {
            return aliasMap.get(sig)!;
        }
        // Fallback: if no definition exists, stacking isn't standard Ligature syntax for single slots
        // without chords, but Definitions usually cover this. 
        // We output as an ad-hoc chord if needed, but standardizing to the first note 
        // plus intervals is complex. For now, assume it was defined or return first note.
        // Better yet, force a definition generation in the calling code (which polishLigatureSource does).
    }
    return serializeNote(notes[0]);
}

function serializeNote(n: NoteDef): string {
  let out = `${n.degree}`;
  if (n.accidental > 0) out += '#'.repeat(n.accidental);
  if (n.accidental < 0) out += 'b'.repeat(-n.accidental);
  if (n.octaveShift > 0) out += `'`.repeat(n.octaveShift);
  if (n.octaveShift < 0) out += ','.repeat(-n.octaveShift);
  if (n.isNatural) out += '%';
  return out;
}