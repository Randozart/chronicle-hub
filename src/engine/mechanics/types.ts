// src/engine/mechanics/types.ts
import { PlayerQualities, WorldConfig, QualityChangeInfo, QualityState } from '../models';

// The subset of GameEngine state required by the logic handlers
export interface EngineContext {
    qualities: PlayerQualities;
    worldQualities: PlayerQualities;
    worldContent: WorldConfig;
    changes: QualityChangeInfo[];
    scheduledUpdates: any[];
    errors: string[];
    tempAliases: Record<string, string>;
    
    // Trace Log
    executedEffectsLog: string[];

    // Methods needed by helpers
    evaluateText: (text: string, context?: { qid: string, state: QualityState }) => string;
    getEffectiveLevel: (qid: string) => number;
    // FIXED: Allow undefined expression
    evaluateCondition: (expr: string | undefined, contextOverride?: { qid: string, state: QualityState }) => boolean;
}