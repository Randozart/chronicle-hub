import { ParsedTrack, SequenceEvent, NoteDef } from './models';

export function serializeParsedTrack(track: ParsedTrack): string {
  const lines: string[] = [];

  /* ================= CONFIG ================= */

  lines.push('[CONFIG]');
  lines.push(`BPM: ${track.config.bpm}`);
  lines.push(`Grid: ${track.config.grid}`);
  lines.push(`Time: ${track.config.timeSig[0]}/${track.config.timeSig[1]}`);
  lines.push(`Scale: ${track.config.scaleRoot} ${track.config.scaleMode}`);
  lines.push('');

  /* ================= INSTRUMENTS ================= */

  lines.push('[INSTRUMENTS]');
  for (const [name, inst] of Object.entries(track.instruments)) {
    lines.push(`${name}: ${inst.id}`);
  }
  lines.push('');

  /* ================= DEFINITIONS ================= */

  if (Object.keys(track.definitions).length > 0) {
    lines.push('[DEFINITIONS]');
    for (const [name, notes] of Object.entries(track.definitions)) {
      lines.push(`@${name} = [${notes.map(serializeNote).join(', ')}]`);
    }
    lines.push('');
  }

  /* ================= PATTERNS ================= */

  for (const pattern of Object.values(track.patterns)) {
    lines.push(`[PATTERN: ${pattern.id}]`);

    for (const [trackName, events] of Object.entries(pattern.tracks)) {
      lines.push(`${trackName} | ${serializeEvents(events)}`);
    }

    lines.push('');
  }

  /* ================= PLAYLIST ================= */

  lines.push('[PLAYLIST]');
  for (const item of track.playlist) {
    if (item.type === 'command') {
      lines.push(`${item.command}=${item.value}`);
    } else {
      lines.push(
        item.patterns
          .map(p =>
            p.transposition
              ? `${p.id}(${p.transposition})`
              : p.id
          )
          .join(', ')
      );
    }
  }

  return lines.join('\n');
}

/* ================= Helpers ================= */

function serializeEvents(events: SequenceEvent[]): string {
  const slots: Record<number, SequenceEvent> = {};
  events.forEach(e => (slots[Math.round(e.time)] = e));

  const maxTime = Math.max(...events.map(e => e.time + e.duration), 0);
  const result: string[] = [];

  for (let t = 0; t < maxTime; t++) {
    const ev = slots[t];
    if (!ev) {
      result.push('.');
      continue;
    }

    result.push(ev.notes.map(serializeNote).join('+'));

    for (let d = 1; d < ev.duration; d++) {
      result.push('-');
    }

    t += ev.duration - 1;
  }

  return result.join(' ');
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
