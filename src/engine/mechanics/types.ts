import { PlayerQualities, WorldConfig, QualityChangeInfo, QualityState, QualityDefinition } from '../models';
export interface EngineContext {
    qualities: PlayerQualities;
    worldQualities: PlayerQualities;
    worldContent: WorldConfig;
    dynamicQualities: Record<string, QualityDefinition>;

    changes: QualityChangeInfo[];
scheduledUpdates: any[];
    errors: string[];
    tempAliases: Record<string, string>;
    executedEffectsLog: string[];
    resolutionRoll: number;
    _logger?: (message: string, type: 'EVAL' | 'COND' | 'FX') => void;
    evaluateText: (text: string, context?: { qid: string, state: QualityState }) => string;
    getEffectiveLevel: (qid: string) => number;
    evaluateCondition: (expr: string | undefined, contextOverride?: { qid: string, state: QualityState }) => boolean;
    createNewQuality?: (id: string, value: number | string, templateId: string | null, props: Record<string, any>) => void;
}