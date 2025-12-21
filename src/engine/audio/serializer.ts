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
  
  // --- FIX: Persist Swing and Humanize ---
  if (track.config.swing > 0) {
      lines.push(`Swing: ${Math.round(track.config.swing * 100)}`);
  }
  if (track.config.humanize > 0) {
      lines.push(`Humanize: ${Math.round(track.config.humanize * 100)}`);
  }
  
  lines.push('');

  lines.push('[INSTRUMENTS]');
  for (const [name, inst] of Object.entries(track.instruments)) {
    let extra = '';
    const props = [];
    if (inst.overrides.volume !== undefined) props.push(`v:${inst.overrides.volume}`);
    if (inst.overrides.attack !== undefined) props.push(`a:${inst.overrides.attack}`);
    if (inst.overrides.decay !== undefined) props.push(`d:${inst.overrides.decay}`);
    if (inst.overrides.sustain !== undefined) props.push(`s:${inst.overrides.sustain}`);
    if (inst.overrides.release !== undefined) props.push(`r:${inst.overrides.release}`);
    if (inst.overrides.octaveOffset !== undefined) props.push(`o:${inst.overrides.octaveOffset}`);
    
    if (props.length > 0) extra += `(${props.join(',')})`;
    
    // Serialize Instrument Effects
    if (inst.overrides.effects && inst.overrides.effects.length > 0) {
        const effectStr = inst.overrides.effects.map(e => `${e.code}${e.value}`).join(',');
        extra += `^[${effectStr}]`;
    }

    lines.push(`${name}: ${inst.id}${extra}`);
  }
  lines.push('');

  const aliasMap = new Map<string, string>();
  if (Object.keys(track.definitions).length > 0) {
    lines.push('[DEFINITIONS]');
    for (const [name, notes] of Object.entries(track.definitions)) {
      const alias = name.startsWith('@') ? name : `@${name}`;
      lines.push(`${alias} = [${notes.map(serializeNote).join(' ')}]`);
      aliasMap.set(getNoteSignature(notes), alias);
    }
    lines.push('');
  }

  for (const pattern of Object.values(track.patterns)) {
    lines.push(`[PATTERN: ${pattern.id}]`);
    
    // Sort tracks to keep order stable if possible, or just keys
    const trackNames = Object.keys(pattern.tracks).sort();
    const maxTrackNameLength = Math.max(...trackNames.map(name => name.length), 0);
    
    for (const trackName of trackNames) {
      const events = pattern.tracks[trackName];
      const modifiers = pattern.trackModifiers[trackName];
      
      let header = trackName;
      
      // Serialize Track Modifiers (e.g. Piano(v:-5)^[P-50])
      if (modifiers) {
          const modProps = [];
          if (modifiers.volume !== 0) modProps.push(`v:${modifiers.volume}`);
          if (modifiers.pan !== 0) modProps.push(`p:${modifiers.pan}`);
          if (modifiers.transpose !== 0) modProps.push(`t:${modifiers.transpose}`);
          
          if (modProps.length > 0) header += `(${modProps.join(',')})`;
          
          if (modifiers.effects && modifiers.effects.length > 0) {
              header += `^[${modifiers.effects.map(e => `${e.code}${e.value}`).join(',')}]`;
          }
      }

      const serializedLine = serializeEvents(events, pattern, track.config, aliasMap);
      lines.push(`${header.padEnd(maxTrackNameLength)} | ${serializedLine} |`);
    }
    lines.push('');
  }

  lines.push('[PLAYLIST]');
  for (const item of track.playlist) {
    if (item.type === 'command') {
      lines.push(`${item.command}=${item.value}`);
    } else {
      const layerStrings = item.layers.map(layer => {
          return layer.items.map(p => {
              let mods = '';
              if (p.transposition !== 0) mods += p.transposition > 0 ? `+${p.transposition}` : p.transposition;
              if (p.volume !== undefined && p.volume !== 0) mods += `${mods ? ', ' : ''}v:${p.volume}`;
              return mods ? `${p.id}(${mods})` : p.id;
          }).join(' + ');
      });
      // Join layers with comma
      lines.push(layerStrings.join(', '));
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
    
    // Ensure total slots covers the pattern duration
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
            
            // Check if it's a tuplet (sub-slot timing)
            const isTuplet = evs.some(e => Math.abs(e.time - Math.floor(e.time)) > 0.001) || evs.length > 1;
            
            if (!isTuplet && evs.length === 1) {
                slots[s] = serializeNoteOrAlias(evs[0].notes, aliasMap);
            } else {
                // It's a tuplet or multi-hit in one slot
                const notes = evs.map(e => serializeNoteOrAlias(e.notes, aliasMap));
                slots[s] = `(${notes.join(' ')})`;
            }
        } else {
            const isSustaining = events.some(e => {
                const start = e.time;
                const end = e.time + e.duration;
                // It is sustaining if current slot S is > Start AND S < End
                // But we subtract small epsilon to allow abutted notes
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
            if (absIndex >= slots.length) {
                 // Fill remainder of bar if pattern ends mid-bar
                 if (s > 0 && s % slotsPerBeat === 0) barStr += '  ';
                 else if (s > 0) barStr += ' ';
                 barStr += '.';
                 continue;
            }
            
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
  if (n.isNatural) out += '%'; // FIX: Persist Natural sign

  const props: string[] = [];
  if (n.volume !== undefined && !isNaN(n.volume)) {
    props.push(`v:${n.volume}`);
  }
  
  if (props.length > 0) {
    out += `(${props.join(',')})`;
  }

  if (n.effects && n.effects.length > 0) {
    const effectStr = n.effects.map(e => `${e.code}${e.value}`).join(',');
    out += `^[${effectStr}]`;
  }

  return out;
}