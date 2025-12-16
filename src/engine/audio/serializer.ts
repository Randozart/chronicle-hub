// src/engine/audio/serializer.ts

import { ParsedTrack, SequenceEvent, NoteDef, ParsedPattern } from './models';

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

  const aliasMap = new Map<string, string>();
  if (Object.keys(track.definitions).length > 0) {
    lines.push('[DEFINITIONS]');
    for (const [name, notes] of Object.entries(track.definitions)) {
      const alias = name.startsWith('@') ? name : `@${name}`;
      // FIX: Join with SPACE for new syntax
      lines.push(`${alias} = [${notes.map(serializeNote).join(' ')}]`);
      aliasMap.set(getNoteSignature(notes), alias);
    }
    lines.push('');
  }

  for (const pattern of Object.values(track.patterns)) {
    lines.push(`[PATTERN: ${pattern.id}]`);
    const maxTrackNameLength = Math.max(...Object.keys(pattern.tracks).map(name => name.length), 0);
    for (const [trackName, events] of Object.entries(pattern.tracks)) {
      const serializedLine = serializeEvents(events, pattern, track.config, aliasMap);
      lines.push(`${trackName.padEnd(maxTrackNameLength)} | ${serializedLine} |`);
    }
    lines.push('');
  }

  lines.push('[PLAYLIST]');
  for (const item of track.playlist) {
    if (item.type === 'command') {
      lines.push(`${item.command}=${item.value}`);
    } else {
      // Serialize Layers & Chains
      const layerStrings = item.layers.map(layer => {
          return layer.items.map(p => {
              let mods = '';
              if (p.transposition !== 0) mods += p.transposition > 0 ? `+${p.transposition}` : p.transposition;
              if (p.volume !== undefined && p.volume !== 0) mods += `${mods ? ', ' : ''}v:${p.volume}`;
              return mods ? `${p.id}(${mods})` : p.id;
          }).join(' + '); // Chain separator
      });
      
      lines.push(layerStrings.join(', ')); // Layer separator
    }
  }

  return lines.join('\n');
}

// ... (serializeEvents logic from previous fix remains valid and is reused here) ...
function serializeEvents(
    events: SequenceEvent[],
    pattern: ParsedPattern,
    config: ParsedTrack['config'],
    aliasMap: Map<string, string>
): string {
    const { grid, timeSig } = config;
    const slotsPerBeat = grid * (4 / timeSig[1]);
    const slotsPerBar = slotsPerBeat * timeSig[0];
    
    const totalSlots = Math.max(pattern.duration, Math.ceil(Math.max(0, ...events.map(e => e.time + e.duration))));
    
    const slotEvents: Record<number, SequenceEvent[]> = {};
    events.forEach(e => {
        const slotIndex = Math.floor(e.time);
        if (!slotEvents[slotIndex]) slotEvents[slotIndex] = [];
        slotEvents[slotIndex].push(e);
    });

    const slots: string[] = [];

    for (let s = 0; s < totalSlots; s++) {
        const evs = slotEvents[s];
        if (evs && evs.length > 0) {
            evs.sort((a, b) => a.time - b.time);
            if (evs.length === 1 && Math.abs(evs[0].time - s) < 0.001) {
                slots[s] = serializeNoteOrAlias(evs[0].notes, aliasMap);
            } else {
                const notes = evs.map(e => serializeNoteOrAlias(e.notes, aliasMap));
                slots[s] = `(${notes.join(' ')})`;
            }
        } else {
            const isSustaining = events.some(e => {
                const start = e.time;
                const end = e.time + e.duration;
                return s > start && s < end - 0.01;
            });
            slots[s] = isSustaining ? '-' : '.';
        }
    }

    const bars: string[] = [];
    const totalBars = Math.ceil(slots.length / slotsPerBar);

    for (let b = 0; b < totalBars; b++) {
        let barStr = '';
        for (let s = 0; s < slotsPerBar; s++) {
            const absIndex = (b * slotsPerBar) + s;
            if (absIndex >= slots.length) break; 
            if (s > 0 && s % slotsPerBeat === 0) barStr += '  ';
            else if (s > 0) barStr += ' ';
            barStr += slots[absIndex] || '.';
        }
        bars.push(barStr);
    }
    return bars.join(' | ');
}

function serializeNoteOrAlias(notes: NoteDef[], aliasMap: Map<string, string>): string {
    if (notes.length > 1) {
        const sig = getNoteSignature(notes);
        if (aliasMap.has(sig)) return aliasMap.get(sig)!;
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