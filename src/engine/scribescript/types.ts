// src/engine/scribescript/types.ts
import { PlayerQualities, QualityDefinition, QualityState } from '../models';

export type TraceLogger = (message: string, depth: number, type?: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR') => void;
export type ScribeEvaluator = (
    rawText: string | undefined,
    qualities: PlayerQualities,
    qualityDefs: Record<string, QualityDefinition>,
    selfContext: { qid: string, state: QualityState } | null,
    resolutionRoll: number,
    aliases: Record<string, string> | null,
    errors?: string[],
    logger?: TraceLogger,
    depth?: number
) => string;

export const SEPARATORS: Record<string, string> = { 
    'comma': ', ', 'pipe': ' | ', 'newline': '\n', 'break': '<br/>', 'and': ' and ', 'space': ' ' 
};