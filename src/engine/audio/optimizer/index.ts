// src/engine/audio/optimizer/index.ts

import {
  ParsedTrack,
  ParsedPattern,
  SequenceEvent,
  NoteDef,
  PatternPlaylistItem,
  PatternModifier,
  Layer,
  ChainItem
} from '../models';
export interface OptimizerOptions {
  tolerance: 0 | 1 | 2 | 3;
}

interface OptimizerContext {
  tolerance: OptimizerOptions['tolerance'];
  slotsPerBeat: number;
  slotsPerBar: number;
  chordRegistry: ChordRegistry;
}
class ChordRegistry {
  private map = new Map<string, string>();
  private counter = 1;

  getOrCreate(notes: NoteDef[]): string {
    const key = notes
      .slice()
      .sort((a, b) => pitchKey(a) - pitchKey(b))
      .map(n => `${n.degree}:${n.accidental}:${n.octaveShift}`)
      .join('|');

    if (this.map.has(key)) return this.map.get(key)!;

    const alias = `chord_${this.counter++}`;
    this.map.set(key, alias);
    return alias;
  }
}
export function optimizeLigature(
  track: ParsedTrack,
  options: OptimizerOptions
): ParsedTrack {
  const slotsPerBeat = track.config.grid * (4 / track.config.timeSig[1]);
  const slotsPerBar = slotsPerBeat * track.config.timeSig[0];

  const ctx: OptimizerContext = {
    tolerance: options.tolerance,
    slotsPerBeat,
    slotsPerBar,
    chordRegistry: new ChordRegistry()
  };

  let result = atomizePatterns(track, ctx);
  result = foldTracks(result, ctx);
  result = dedupePatterns(result, ctx);

  return result;
}
function atomizePatterns(track: ParsedTrack, ctx: OptimizerContext): ParsedTrack {
  const newPatterns: Record<string, ParsedPattern> = {};
  const newPlaylist: ParsedTrack['playlist'] = [];

  for (const item of track.playlist) {
    if (item.type !== 'pattern') {
      newPlaylist.push(item);
      continue;
    }
    
    const newLayers: Layer[] = [];
    for (const layer of item.layers) {
        const newChainItems: ChainItem[] = [];
        for (const ref of layer.items) {
            const pattern = track.patterns[ref.id];
            if (!pattern) continue;

            const barCount = Math.ceil(pattern.duration / ctx.slotsPerBar);

            for (let bar = 0; bar < barCount; bar++) {
                const newSliceId = `${pattern.id}_bar${bar}`;
                if (!newPatterns[newSliceId]) {
                    newPatterns[newSliceId] = slicePattern(pattern, bar, ctx);
                }
                newChainItems.push({
                    id: newSliceId,
                    transposition: ref.transposition,
                    volume: ref.volume
                });
            }
        }
        newLayers.push({ items: newChainItems });
    }

    newPlaylist.push({
      type: 'pattern',
      layers: newLayers,
    });
  }

  return { ...track, patterns: newPatterns, playlist: newPlaylist };
}

function slicePattern(
  pattern: ParsedPattern,
  barIndex: number,
  ctx: OptimizerContext
): ParsedPattern {
  const start = barIndex * ctx.slotsPerBar;
  const end = start + ctx.slotsPerBar;

  const tracks: ParsedPattern['tracks'] = {};

  for (const [name, events] of Object.entries(pattern.tracks)) {
    tracks[name] = events
      .filter(e => e.time < end && e.time + e.duration > start)
      .map(e => ({
        ...e,
        time: Math.max(0, e.time - start)
      }));
  }

  return {
    id: `${pattern.id}_bar${barIndex}`,
    duration: ctx.slotsPerBar,
    tracks,
    trackModifiers: pattern.trackModifiers
  };
}
function foldTracks(track: ParsedTrack, ctx: OptimizerContext): ParsedTrack {
  const patterns: Record<string, ParsedPattern> = {};

  for (const [id, pattern] of Object.entries(track.patterns)) {
    patterns[id] = foldPatternTracks(pattern, ctx);
  }

  return { ...track, patterns };
}

function foldPatternTracks(pattern: ParsedPattern, ctx: OptimizerContext): ParsedPattern {
  const folded: ParsedPattern['tracks'] = {};
  const groups = groupTracks(Object.keys(pattern.tracks));

  for (const group of groups) {
    if (group.length === 1) {
      folded[group[0]] = pattern.tracks[group[0]];
      continue;
    }

    const merged = mergeEvents(group.map(t => pattern.tracks[t]), ctx);
    folded[group[0]] = merged;
  }

  return { ...pattern, tracks: folded };
}

function groupTracks(names: string[]): string[][] {
  const map: Record<string, string[]> = {};
  for (const n of names) {
    const base = n.replace(/_[LR]\d+$/, '');
    map[base] ||= [];
    map[base].push(n);
  }
  return Object.values(map);
}

function mergeEvents(lanes: SequenceEvent[][], ctx: OptimizerContext): SequenceEvent[] {
  const events = lanes.flat().sort((a, b) => a.time - b.time);
  const result: SequenceEvent[] = [];

  for (const e of events) {
    const last = result[result.length - 1];

    if (last && nearlyEqual(last.time, e.time, ctx)) {
      const notes = mergeNotes(last.notes, e.notes);
      last.notes = notes;
      last.duration = Math.max(last.duration, e.duration);
    } else {
      result.push({ ...e, notes: [...e.notes] });
    }
  }

  return result;
}

function mergeNotes(a: NoteDef[], b: NoteDef[]): NoteDef[] {
  const map = new Map<number, NoteDef>();
  [...a, ...b].forEach(n => map.set(pitchKey(n), n));
  return Array.from(map.values());
}
function dedupePatterns(track: ParsedTrack, ctx: OptimizerContext): ParsedTrack {
  const fingerprintMap = new Map<string, string>();
  const newPatterns: Record<string, ParsedPattern> = {};
  const patternTranspose: Record<string, number> = {};

  for (const [id, pattern] of Object.entries(track.patterns)) {
    const { fingerprint, offset } = fingerprintPattern(pattern, ctx);

    if (!fingerprintMap.has(fingerprint)) {
      fingerprintMap.set(fingerprint, id);
      newPatterns[id] = pattern;
      patternTranspose[id] = 0;
    } else {
      const master = fingerprintMap.get(fingerprint)!;
      patternTranspose[id] = offset;
    }
  }

  const newPlaylist = track.playlist.map(item => {
    if (item.type !== 'pattern') return item;
    const newLayers = item.layers.map(layer => ({
        items: layer.items.map((p: ChainItem) => {
            const offset = patternTranspose[p.id] || 0;
            const master = fingerprintMap.get(
                fingerprintPattern(track.patterns[p.id], ctx).fingerprint
            )!;
            
            return {
                ...p,
                id: master,
                transposition: p.transposition + offset
            };
        })
    }));

    return {
      ...item,
      layers: newLayers
    };
  });

  return { ...track, patterns: newPatterns, playlist: newPlaylist };
}


function fingerprintPattern(pattern: ParsedPattern, ctx: OptimizerContext) {
  const pitches: number[] = [];
  const rhythm: string[] = [];

  for (const events of Object.values(pattern.tracks)) {
    for (const e of events) {
      rhythm.push(`${snap(e.time, ctx)}:${snap(e.duration, ctx)}`);
      e.notes.forEach(n => pitches.push(pitchKey(n)));
    }
  }

  const min = Math.min(...pitches, 0);
  const norm = pitches.map(p => p - min).sort((a, b) => a - b).join(',');

  return {
    fingerprint: rhythm.sort().join('|') + '::' + norm,
    offset: min
  };
}
function pitchKey(n: NoteDef): number {
  return n.degree + n.accidental + n.octaveShift * 7;
}

function snap(v: number, ctx: OptimizerContext): number {
  if (ctx.tolerance < 2) return v;
  return Math.round(v);
}

function nearlyEqual(a: number, b: number, ctx: OptimizerContext): boolean {
  const eps = ctx.tolerance === 0 ? 0 : 0.25;
  return Math.abs(a - b) <= eps;
}