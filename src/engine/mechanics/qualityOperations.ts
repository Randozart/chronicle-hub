import { QualityDefinition, QualityType, QualityState } from '../models';
import { EngineContext } from './types';

export function changeQuality(
    ctx: EngineContext,
    qid: string, 
    op: string, 
    value: number | string, 
    metadata: { desc?: string; source?: string; hidden?: boolean }
): void {
    const def = ctx.worldContent.qualities[qid];
    if (!def) {
        const msg = `[GameEngine] Unknown quality '${qid}'. Skipping.`;
        console.warn(msg);
        
        ctx.errors.push(msg);
        
        if (ctx._logger) {
            ctx._logger(msg, 'FX'); 
        }
        return;
    }

    let targetState = ctx.qualities;
    let effectiveQid = qid;
    
    if (qid.startsWith('world.')) {
        targetState = ctx.worldQualities;
        effectiveQid = qid.substring(6);
    }

    if (!targetState[effectiveQid]) {
        targetState[effectiveQid] = { 
            qualityId: effectiveQid, type: def.type, level: 0, changePoints: 0, 
            stringValue: "", sources: [], customProperties: {}, spentTowardsPrune: 0 
        } as any;
    }

    const qState = targetState[effectiveQid] as any;
    const levelBefore = qState.level || 0;
    const cpBefore = qState.changePoints || 0;

    if (qState.type !== def.type) {
        qState.type = def.type;
    }

    if (qState.type === QualityType.String) {
        if (typeof value === 'string' && op === '=') qState.stringValue = value;
    } 
    
    else if (typeof value === 'number') {
        const numValue = Math.floor(value);
        const isIncremental = ['+=', '-=', '++', '--'].includes(op);
        const isItem = def.type === QualityType.Item || def.type === QualityType.Equipable;

        if (qState.type === QualityType.Pyramidal) {
            if (isIncremental) {
                if (op === '++' || op === '+=') {
                    if (def.grind_cap) {
                        const cap = parseInt(ctx.evaluateText(`{${def.grind_cap}}`), 10);
                        if (!isNaN(cap) && qState.level >= cap) return; 
                    }
                }
                
                if (op === '++') qState.changePoints += 1;
                else if (op === '--') qState.changePoints -= 1;
                else if (op === '+=') qState.changePoints += numValue;
                else if (op === '-=') qState.changePoints -= numValue;
                
                updatePyramidalLevel(ctx, qState, def);
            } else if (op === '=') { 
                qState.level = numValue; 
                qState.changePoints = 0; 
            }
        } else {
            if (isIncremental) {
                const isAdd = op === '++' || op === '+=';
                const qty = (op === '++' || op === '--') ? 1 : numValue;

                if (isAdd) {
                    if (def.grind_cap) {
                        const cap = parseInt(ctx.evaluateText(`{${def.grind_cap}}`), 10);
                        if (!isNaN(cap) && qState.level >= cap) return;
                    }
                    qState.level += qty;
                    
                    if (isItem && metadata.source) {
                        if (!qState.sources) qState.sources = [];
                        for(let i=0; i<qty; i++) qState.sources.push(metadata.source);
                    }
                } else {
                    if (isItem) pruneSources(qState, qty, levelBefore);
                    qState.level -= qty;
                }
            } else { 
                if (isItem && numValue < levelBefore) {
                    pruneSources(qState, levelBefore - numValue, levelBefore);
                }
                qState.level = numValue;
                if (isItem && numValue === 0) qState.sources = [];
            }
        }
        
        let resolvedMax: number | undefined;
        if (def.max) {
            const max = Number(ctx.evaluateText(`{${def.max}}`)) || Infinity;
            if (isFinite(max)) resolvedMax = max;
            if (qState.level > max) {
                qState.level = max;
                if (qState.type === QualityType.Pyramidal) qState.changePoints = 0;
            }
        }
        qState.level = Math.floor(qState.level);
        if ((def.type === QualityType.Counter || isItem) && qState.level < 0) qState.level = 0;
    }

    const context = { qid: effectiveQid, state: qState };
    
    let evaluatedTags: string[] = [];
    if (def.tags) {
        evaluatedTags = def.tags.map(t => ctx.evaluateText(t, context)).filter(Boolean);
    }

    const isHidden = metadata.hidden || evaluatedTags.includes('hidden') || evaluatedTags.includes('no_log');
    const displayName = ctx.evaluateText(def.name || effectiveQid, context); 

    let changeText = "";
    const increaseDesc = ctx.evaluateText(def.increase_description || "", context);
    const decreaseDesc = ctx.evaluateText(def.decrease_description || "", context);

    if (qState.level > levelBefore) changeText = increaseDesc || `${displayName} increased.`;
    else if (qState.level < levelBefore) changeText = decreaseDesc || `${displayName} decreased.`;
    else if (qState.type === QualityType.String) changeText = `${displayName} is now ${qState.stringValue}`;

    if (!changeText && qState.type === QualityType.Pyramidal && qState.changePoints !== cpBefore) {
         changeText = displayName;
    }

    if (metadata.desc) {
        changeText = ctx.evaluateText(metadata.desc, context);
    }

    if (changeText) {
        ctx.changes.push({
            qid: effectiveQid, 
            qualityName: displayName, 
            type: def.type, 
            category: def.category,
            levelBefore: levelBefore, 
            cpBefore: cpBefore,
            levelAfter: qState.level,
            cpAfter: qState.changePoints,
            maxLevel: resolvedMax,
            stringValue: qState.stringValue,
            changeText,
            scope: qid.startsWith('world.') ? 'world' : 'character',
            overrideDescription: metadata.desc ? changeText : undefined,
            hidden: isHidden 
        });
    }
}

export function createNewQuality(
    ctx: EngineContext,
    id: string, 
    value: number | string, 
    templateId: string | null, 
    props: Record<string, any>
) {
    const templateDef = templateId ? ctx.worldContent.qualities[templateId] : null;

    const finalVariants = {
        ...(templateDef?.text_variants || {}),
        ...props
    };

    const qualityType = templateDef ? templateDef.type : (typeof value === 'string' ? QualityType.String : QualityType.Pyramidal);

    if (!ctx.qualities[id]) {
        ctx.qualities[id] = {
            qualityId: id,
            type: qualityType,
            level: typeof value === 'number' ? value : 0,
            stringValue: typeof value === 'string' ? value : "",
            changePoints: 0,
            text_variants: finalVariants
        } as any;
    } else {
        const dynamicState = ctx.qualities[id] as any;
        if (!dynamicState.text_variants) dynamicState.text_variants = {};
        Object.assign(dynamicState.text_variants, finalVariants);

        if (typeof value === 'number') dynamicState.level = value;
        if (typeof value === 'string') dynamicState.stringValue = value;
    }
}


export function batchChangeQuality(
    ctx: EngineContext,
    categoryExpr: string, 
    op: string, 
    value: number | string, 
    filterExpr?: string
) {
    const targetCat = ctx.evaluateText(`{${categoryExpr}}`).trim().toLowerCase();
    const qids = Object.values(ctx.worldContent.qualities)
        .filter(q => {
            if (!q.category) return false;
            const cats = q.category.split(',').map(c => c.trim().toLowerCase());
            if (!cats.includes(targetCat)) return false;
            if (filterExpr) {
                const state = ctx.qualities[q.id] || { qualityId: q.id, level: 0, type: q.type } as any;
                return ctx.evaluateCondition(filterExpr, { qid: q.id, state });
            }
            return true;
        })
        .map(q => q.id);
    qids.forEach(qid => changeQuality(ctx, qid, op, value, {}));
}

export function updatePyramidalLevel(ctx: EngineContext, qState: any, def: QualityDefinition): void {
    const cpCap = def.cp_cap ? Number(ctx.evaluateText(`{${def.cp_cap}}`)) || Infinity : Infinity;
    let cpNeeded = Math.min(qState.level + 1, cpCap);
    
    while (qState.changePoints >= cpNeeded && cpNeeded > 0) {
        qState.level++; 
        qState.changePoints -= cpNeeded;
        cpNeeded = Math.min(qState.level + 1, cpCap);
    }
    while (qState.changePoints < 0 && qState.level > 0) {
        const prevCp = Math.min(qState.level, cpCap);
        qState.level--; 
        qState.changePoints += prevCp;
    }
}

function pruneSources(qState: any, amountSpent: number, totalLevelBefore: number) {
    if (!qState.sources || qState.sources.length === 0) return;
    if (totalLevelBefore <= 0) return;

    const fractionSpent = amountSpent / totalLevelBefore;
    const creditsEarned = qState.sources.length * fractionSpent;
    qState.spentTowardsPrune = (qState.spentTowardsPrune || 0) + creditsEarned;

    let removeCount = 0;
    while (qState.spentTowardsPrune >= 1.0 && qState.sources.length > 0) {
        const candidate = qState.sources[0];
        let duplicateCount = 0;
        for(const s of qState.sources) { if (s === candidate) duplicateCount++; if(duplicateCount > 1) break; }
        const isDuplicate = duplicateCount > 1;

        if (removeCount === 0 || isDuplicate) {
            qState.sources.shift();
            qState.spentTowardsPrune -= 1.0;
            removeCount++;
        } else {
            break;
        }
    }
}