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

  // *** FIX ***: Build a reverse map from note signatures to alias names.
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
      lines.push(`${trackName.padEnd(maxTrackNameLength)} |${serializedLine}|`);
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

// *** REBUILT SERIALIZER LOGIC ***
function serializeEvents(
    events: SequenceEvent[],
    pattern: ParsedPattern,
    config: ParsedTrack['config'],
    aliasMap: Map<string, string>
): string {
    const { grid, timeSig } = config;
    const slotsPerBeat = grid * (4 / timeSig[1]);
    const slotsPerBar = slotsPerBeat * timeSig[0];
    const totalBars = Math.ceil(pattern.duration / slotsPerBar);
    let output = '';

    for (let i = 0; i < totalBars; i++) {
        let barOutput = '';
        const barStart = i * slotsPerBar;

        for (let j = 0; j < timeSig[0]; j++) {
            const beatStart = barStart + j * slotsPerBeat;
            const beatEnd = beatStart + slotsPerBeat;
            const eventsInBeat = events.filter(e => e.time >= beatStart && e.time < beatEnd);

            // --- TUPLET DETECTION ---
            let isTuplet = false;
            if (eventsInBeat.length > 0) {
                const step = slotsPerBeat / grid;
                for (const event of eventsInBeat) {
                    if (event.time % step !== 0 || event.duration % step !== 0) {
                        isTuplet = true;
                        break;
                    }
                }
            }
            
            if (isTuplet) {
                const TUPLER_RESOLUTION = 24; // High-res grid for reconstructing tuplets
                const tupletSlots = new Array(TUPLER_RESOLUTION).fill('.');
                
                for (const event of eventsInBeat) {
                    const relativeTime = event.time - beatStart;
                    const startSlot = Math.round((relativeTime / slotsPerBeat) * TUPLER_RESOLUTION);
                    const durationSlots = Math.round((event.duration / slotsPerBeat) * TUPLER_RESOLUTION);
                    
                    if (startSlot < TUPLER_RESOLUTION) {
                        tupletSlots[startSlot] = serializeNoteOrAlias(event.notes, aliasMap);
                        for (let k = 1; k < durationSlots; k++) {
                            if (startSlot + k < TUPLER_RESOLUTION) {
                                tupletSlots[startSlot + k] = '-';
                            }
                        }
                    }
                }
                barOutput += ` (${tupletSlots.join(' ')})`;
            } else {
                // --- REGULAR GRID LOGIC ---
                const beatSlots = new Array(grid).fill('.');
                for (const event of eventsInBeat) {
                    const slotIndex = Math.round((event.time - beatStart) / (slotsPerBeat / grid));
                    const durationSlots = Math.round(event.duration / (slotsPerBeat / grid));
                    
                    if (slotIndex < grid) {
                        beatSlots[slotIndex] = serializeNoteOrAlias(event.notes, aliasMap);
                         for (let k = 1; k < durationSlots; k++) {
                            if (slotIndex + k < grid) {
                                beatSlots[slotIndex + k] = '-';
                            }
                        }
                    }
                }
                barOutput += ` ${beatSlots.join(' ')}`;
            }
        }
        output += `${barOutput} |`;
    }
    return output.slice(0, -2); // Remove trailing space and pipe
}

function serializeNoteOrAlias(notes: NoteDef[], aliasMap: Map<string, string>): string {
    if (notes.length > 1) {
        const sig = getNoteSignature(notes);
        if (aliasMap.has(sig)) {
            return aliasMap.get(sig)!;
        }
        return notes.map(serializeNote).join('+');
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