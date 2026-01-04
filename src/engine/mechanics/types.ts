// src/engine/mechanics/types.ts
import { PlayerQualities, WorldConfig, QualityChangeInfo, QualityState, QualityDefinition } from '../models';

// The subset of GameEngine state required by the logic handlers
export interface EngineContext {
    qualities: PlayerQualities;
    worldQualities: PlayerQualities;
    worldContent: WorldConfig;
    
    // ADDED: Explicitly track dynamic definitions
    dynamicQualities: Record<string, QualityDefinition>;

    changes: QualityChangeInfo[];
    scheduledUpdates: any[];
    errors: string[];
    tempAliases: Record<string, string>;
    
    // Trace Log
    executedEffectsLog: string[];

    // Methods needed by helpers
    evaluateText: (text: string, context?: { qid: string, state: QualityState }) => string;
    getEffectiveLevel: (qid: string) => number;
    evaluateCondition: (expr: string | undefined, contextOverride?: { qid: string, state: QualityState }) => boolean;

    // ADDED: Explicit method to create qualities with definitions
    createNewQuality?: (id: string, value: number | string, templateId: string | null, props: Record<string, any>) => void;
}