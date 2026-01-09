import { PlayerQualities, WorldConfig, QualityChangeInfo, QualityState, QualityDefinition } from '../models';

// The subset of GameEngine state required by the logic handlers
export interface EngineContext {
    qualities: PlayerQualities;
    worldQualities: PlayerQualities;
    worldContent: WorldConfig;
    
    // Explicitly track dynamic definitions
    dynamicQualities: Record<string, QualityDefinition>;

    changes: QualityChangeInfo[];
    scheduledUpdates: any[];
    errors: string[];
    tempAliases: Record<string, string>;
    
    // Trace Log
    executedEffectsLog: string[];
    
    // ADDED: Logger interface for Playtest Mode
    _logger?: (message: string, type: 'EVAL' | 'COND' | 'FX') => void;

    // Methods needed by helpers
    evaluateText: (text: string, context?: { qid: string, state: QualityState }) => string;
    getEffectiveLevel: (qid: string) => number;
    evaluateCondition: (expr: string | undefined, contextOverride?: { qid: string, state: QualityState }) => boolean;

    // Explicit method to create qualities with definitions
    createNewQuality?: (id: string, value: number | string, templateId: string | null, props: Record<string, any>) => void;
}