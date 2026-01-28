import { Storylet, QualityDefinition, MarketDefinition } from './models';
import { Node, Edge } from '@xyflow/react';

export interface GraphConnection {
    id: string;
    name: string;
    type: 'storylet' | 'opportunity' | 'quality' | 'market';
    direction: 'inbound' | 'outbound';
    reason: string;
    context: string;
}

interface AnalysisResult {
    role: 'provider' | 'dependent' | 'mutual' | 'none';
    reason: string;
    context: string;
}

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeId(id: string) {
    return id.replace(/[^a-zA-Z0-9-_]/g, '_');
}

function analyzeRelationship(container: any, searchId: string, containerJson: string): AnalysisResult | null {
    const cleanId = searchId.toLowerCase();
    
    // hasRef() helps prevent fuzzy matches by performing a boundary check to prevent false positives
    // Not used for every check, just the ones sensitive to it, like "location_1" and "location_2" both matching "location_"
    const hasRef = (text: string | undefined) => {
        if (!text) return false;
        const regex = new RegExp(`\\b${escapeRegExp(cleanId)}\\b`, 'i');
        return regex.test(text);
    };

    // Specific check for Quality Modifications
    const modRegex = new RegExp(`\\$${escapeRegExp(cleanId)}\\s*(=|\\+=|-=|\\+\\+|--)`, 'i');
    if (modRegex.test(containerJson)) {
        return { role: 'provider', reason: "Modifies State", context: "Effects Field" };
    }

    if (container.options) {
        for (const opt of container.options) {
            // We check redirectId strictly, as the parser also does this
            if (opt.pass_redirect?.toLowerCase() === cleanId) return { role: 'provider', reason: "Direct Redirect", context: `(Pass) ${opt.name}` };
            if (opt.fail_redirect?.toLowerCase() === cleanId) return { role: 'provider', reason: "Fail Redirect", context: `(Fail) ${opt.name}` };
        }
    }

    // Strictly testing the conditions here, as these can be fuzzy match sensitive
    if (hasRef(container.visible_if)) return { role: 'dependent', reason: "Visibility Condition", context: "Main Visibility" };
    if (hasRef(container.unlock_if)) return { role: 'dependent', reason: "Unlock Requirement", context: "Main Unlock" };

    if (container.options) {
        for (const opt of container.options) {
            const optStringToCheck = (opt.visible_if || '') + (opt.unlock_if || '') + (opt.action_cost || '');
            if (hasRef(optStringToCheck)) {
                return { role: 'dependent', reason: "Option Logic", context: `Option: ${opt.name}` };
            }
        }
    }

    if (container.storylet === searchId) {
        return { role: 'provider', reason: "Item Use Event", context: "On Use Trigger" };
    }

    if (hasRef(container.bonus)) {
        return { role: 'provider', reason: "Stat Bonus", context: "Equipment" };
    }

    if (container.stalls) {
        if (container.defaultCurrencyId === searchId) return { role: 'dependent', reason: "Market Currency", context: "Default Currency" };
        for(const stall of container.stalls) {
            for(const listing of stall.listings) {
                if (listing.qualityId === searchId) return { role: 'provider', reason: "Sold/Bought Here", context: `Stall: ${stall.name}` };
                if (listing.currencyId === searchId) return { role: 'dependent', reason: "Currency Used", context: `Stall: ${stall.name}` };
                if (hasRef(listing.price)) return { role: 'dependent', reason: "Price Formula", context: `Stall: ${stall.name}` };
            }
        }
    }

    if (hasRef(container.text)) return { role: 'dependent', reason: "Text Interpolation", context: "Main Text" };
    if (hasRef(container.name)) return { role: 'dependent', reason: "Name Reference", context: "Header" };

    return null;
}

export function findConnections(
    targetId: string,
    allStorylets: Record<string, Storylet>,
    allQualities: Record<string, QualityDefinition>,
    allMarkets?: Record<string, MarketDefinition>
): GraphConnection[] {
    const results: GraphConnection[] = [];
    const cleanTargetId = targetId.toLowerCase();
    const entities: any[] = [
        ...Object.values(allStorylets),
        ...Object.values(allQualities),
        ...(allMarkets ? Object.values(allMarkets) : [])
    ];

    const targetObj = entities.find(e => e.id === targetId);
    const targetJson = targetObj ? JSON.stringify(targetObj).toLowerCase() : "";

    entities.forEach(entity => {
        if (entity.id === targetId) return;
        
        const entityJson = JSON.stringify(entity).toLowerCase();
        
        let entityType: GraphConnection['type'] = 'storylet';
        if ((entity as any).type) entityType = 'quality';
        else if ((entity as any).deck) entityType = 'opportunity';
        else if ((entity as any).stalls) entityType = 'market';

        const entityName = entity.name || entity.id;

        // Pre-check with includes for performance, then deep check
        if (entityJson.includes(cleanTargetId)) {
            const analysis = analyzeRelationship(entity, targetId, entityJson);
            if (analysis) {
                results.push({
                    id: entity.id,
                    name: entityName,
                    type: entityType,
                    direction: 'inbound',
                    reason: analysis.reason,
                    context: analysis.context
                });
            }
        }

        // Outbound checks (if the target refers to this entity)
        if (targetObj && targetJson.includes(entity.id.toLowerCase())) {
            const analysis = analyzeRelationship(targetObj, entity.id, targetJson);
            if (analysis) {
                results.push({
                    id: entity.id,
                    name: entityName,
                    type: entityType,
                    direction: 'outbound',
                    reason: analysis.reason,
                    context: analysis.context
                });
            }
        }
    });

    return results;
}

export function generateGraph(
    storylets: Record<string, Storylet> | undefined | null, 
    mode: 'redirect' | 'quality', 
    targetQuality?: string,
    showSelfLoops: boolean = true
): { nodes: Node[], edges: Edge[] } {
    
    if (!storylets || typeof storylets !== 'object') return { nodes: [], edges: [] };

    const storyletList = Object.values(storylets);
    const cleanQ = targetQuality ? targetQuality.replace('$', '').trim() : '';

    const tempNodes = new Set<string>();
    const nodeDataMap: Record<string, { label: string, role: string, description: string, originalId: string }> = {};

    storyletList.forEach(s => {
        if(!s.id) return;
        let isRelevant = true;
        let role = 'neutral';
        const details: string[] = [];
        const sJson = JSON.stringify(s).toLowerCase();

        if (mode === 'quality' && cleanQ) {
            if (!sJson.includes(cleanQ.toLowerCase())) {
                isRelevant = false;
            } else {
                const analysis = analyzeRelationship(s, cleanQ, sJson);
                if (analysis) {
                    if (analysis.role === 'provider') role = 'producer';
                    else if (analysis.role === 'dependent') role = 'consumer';
                    details.push(`[${analysis.reason}] ${analysis.context}`);
                }
            }
        }

        if (isRelevant) {
            const sId = sanitizeId(s.id);
            tempNodes.add(sId);
            nodeDataMap[sId] = { 
                label: s.name || s.id, 
                role, 
                description: details.join('\n'),
                originalId: s.id 
            };
        }
    });

    const finalEdges: Edge[] = [];
    const edgeCounts: Record<string, number> = {};
    const adjacency: Record<string, string[]> = {}; 
    const inDegree: Record<string, number> = {};    

    tempNodes.forEach(id => { adjacency[id] = []; inDegree[id] = 0; });

    const addEdge = (sourceId: string, targetId: string, label: string, color: string) => {
        const sId = sanitizeId(sourceId);
        const tId = sanitizeId(targetId);
        if (!tempNodes.has(sId) || !tempNodes.has(tId)) return;

        if (sId !== tId) {
            adjacency[sId].push(tId);
            inDegree[tId] = (inDegree[tId] || 0) + 1;
        }

        const isSelfLoop = sId === tId;
        if (isSelfLoop && !showSelfLoops) return;

        const key = `${sId}->${tId}`;
        const count = (edgeCounts[key] || 0);
        edgeCounts[key] = count + 1;

        finalEdges.push({
            id: `e-${sId}-${tId}-${count}-${Math.random().toString(36).substr(2, 4)}`,
            source: sId,
            target: tId,
            label: label.length > 40 ? label.substring(0, 40) + '...' : label,
            animated: true,
            type: isSelfLoop ? 'selfloop' : 'smoothstep',
            sourceHandle: isSelfLoop ? 'top' : 'right', 
            data: { offsetIndex: count },
            style: { stroke: color, strokeWidth: 2 },
            labelStyle: { fill: '#ccc', fontSize: 10, fontWeight: 700 }
        });
    };

    storyletList.forEach(source => {
        if (!source.options) return;
        source.options.forEach(opt => {
            if (mode === 'redirect') {
                if (opt.pass_redirect) addEdge(source.id, opt.pass_redirect, `(Pass) ${opt.name}`, '#2ecc71');
                if (opt.fail_redirect) addEdge(source.id, opt.fail_redirect, `(Fail) ${opt.name}`, '#e74c3c');
            }
            if (mode === 'quality' && cleanQ) {
                const optJson = JSON.stringify(opt).toLowerCase();
                if (optJson.includes(cleanQ.toLowerCase())) {
                    const analysis = analyzeRelationship({ options: [opt] }, cleanQ, optJson);
                    if (analysis && analysis.role === 'provider') {
                        const valueLabel = analysis.reason === 'Modifies State' ? 'Modifies' : 'Sets';
                        storyletList.forEach(target => {
                            if (target.id === source.id) return;
                            const tJson = JSON.stringify(target).toLowerCase();
                            if (tJson.includes(cleanQ.toLowerCase())) {
                                const tAnalysis = analyzeRelationship(target, cleanQ, tJson);
                                if (tAnalysis && tAnalysis.role === 'dependent') {
                                    addEdge(source.id, target.id, `${opt.name}\n[${valueLabel}]`, '#61afef');
                                }
                            }
                        });
                    }
                }
            }
        });
    });

    const nodePositions: Record<string, { x: number, y: number }> = {};
    const visited = new Set<string>();
    let queue: string[] = [];

    tempNodes.forEach(id => { if (inDegree[id] === 0) queue.push(id); });
    if (queue.length === 0 && tempNodes.size > 0) queue.push(Array.from(tempNodes)[0]);

    let level = 0;
    const levelHeight: Record<number, number> = {};

    while (queue.length > 0) {
        const nextQueue: string[] = [];
        queue.sort();
        queue.forEach(id => {
            if (visited.has(id)) return;
            visited.add(id);
            const row = levelHeight[level] || 0;
            nodePositions[id] = { x: level * 350, y: row * 200 };
            levelHeight[level] = row + 1;
            const neighbors = adjacency[id] || [];
            neighbors.forEach(nid => { if (!visited.has(nid)) nextQueue.push(nid); });
        });
        queue = nextQueue;
        level++;
    }

    tempNodes.forEach(id => {
        if (!visited.has(id)) {
            const row = levelHeight[0] || 0;
            nodePositions[id] = { x: 0, y: (row + 1) * 200 };
            levelHeight[0] = row + 1;
        }
    });

    const finalNodes: Node[] = [];
    tempNodes.forEach(id => {
        const pos = nodePositions[id] || { x: 0, y: 0 };
        const meta = nodeDataMap[id];
        finalNodes.push({
            id,
            position: pos,
            type: 'custom',
            data: { 
                label: meta.label, 
                role: meta.role, 
                description: meta.description,
                originalId: meta.originalId 
            }
        });
    });

    return { nodes: finalNodes, edges: finalEdges };
}