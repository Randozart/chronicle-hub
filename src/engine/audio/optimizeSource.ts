import { LigatureParser } from '@/engine/audio/parser';
import { optimizeLigature } from '@/engine/audio/optimizer';
import { serializeParsedTrack } from '@/engine/audio/serializer';
import { formatLigatureSource } from '@/engine/audio/formatter';
import { PlayerQualities } from '@/engine/models';

export function optimizeLigatureSource(
  source: string,
  tolerance: 0 | 1 | 2 | 3,
  mockQualities: PlayerQualities = {}
): string {
  const parser = new LigatureParser();
  const parsed = parser.parse(source, mockQualities);
  const optimized = optimizeLigature(parsed, { tolerance });

  const serialized = serializeParsedTrack(optimized);
  return formatLigatureSource(serialized);
}
