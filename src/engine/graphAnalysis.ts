import { Storylet, QualityDefinition, Opportunity } from './models';
import { Node, Edge } from '@xyflow/react';

// =============================================================================
// SHARED TYPES
// =============================================================================

export interface GraphConnection {
    id: string;
    name: string;
    type: 'storylet' | 'opportunity' | 'quality';
    direction: 'inbound' | 'outbound';
    reason: string;
    context: string;
}

interface AnalysisResult {
    role: 'provider' | 'dependent' | 'mutual' | 'none';
    reason: string;
    context: string;
}

// =============================================================================
// HELPER: ROBUST REGEX SCANNER
// =============================================================================

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeId(id: string) {
    return id.replace(/[^a-zA-Z0-9-_]/g, '_');
}

/**
 * Analyzes a container (Storylet/Opp) to see how it interacts with a specific ID.
 */
function analyzeRelationship(container: any, searchId: string, containerJson: string): AnalysisResult | null {
    const cleanId = searchId.toLowerCase();

    // 1. Modification (Provider)
    // Matches: $id +=, $id =, $id -=, $id++, $id--
    const modRegex = new RegExp(`\\$${escapeRegExp(cleanId)}\\s*(=|\\+=|-=|\\+\\+|--)`, 'i');
    if (modRegex.test(containerJson)) {
        return { role: 'provider', reason: "Modifies State", context: "Effect / Script" };
    }

    // 2. Explicit Redirects (Provider -> Dependent)
    if (container.options) {
        for (const opt of container.options) {
            if (opt.pass_redirect?.toLowerCase() === cleanId) return { role: 'provider', reason: "Direct Redirect", context: `(Pass) ${opt.name}` };
            if (opt.fail_redirect?.toLowerCase() === cleanId) return { role: 'provider', reason: "Fail Redirect", context: `(Fail) ${opt.name}` };
        }
    }

    // 3. Logic Gate (Dependent)
    // Check specific fields first for accuracy
    if (container.visible_if?.toLowerCase().includes(cleanId)) return { role: 'dependent', reason: "Visibility Condition", context: "Main Visibility" };
    if (container.unlock_if?.toLowerCase().includes(cleanId)) return { role: 'dependent', reason: "Unlock Requirement", context: "Main Unlock" };
    
    // Check Options Logic
    if (container.options) {
        for (const opt of container.options) {
            const optJson = JSON.stringify(opt).toLowerCase();
            if (optJson.includes(cleanId)) {
                // If regex matched mod earlier, we wouldn't be here, so it must be logic
                return { role: 'dependent', reason: "Option Logic", context: `Option: ${opt.name}` };
            }
        }
    }

    // 4. Text Reference (Interpolation/Usage)
    if (container.text?.toLowerCase().includes(cleanId)) return { role: 'dependent', reason: "Text Interpolation", context: "Main Text" };
    if (container.name?.toLowerCase().includes(cleanId)) return { role: 'dependent', reason: "Name Reference", context: "Header" };

    return null;
}

// =============================================================================
// PART 1: SIDEBAR LOGIC (Connectivity Scanner)
// =============================================================================

export function findConnections(
    targetId: string,
    allStorylets: Record<string, Storylet>,
    allQualities: Record<string, QualityDefinition>
): GraphConnection[] {
    const results: GraphConnection[] = [];
    const cleanTargetId = targetId.toLowerCase();
    
    // Flatten entities
    const entities = [
        ...Object.values(allStorylets),
        ...Object.values(allQualities)
    ];

    // Find Target Object (for outbound scan)
    const targetObj = entities.find(e => e.id === targetId);
    const targetJson = targetObj ? JSON.stringify(targetObj).toLowerCase() : "";

    entities.forEach(entity => {
        if (entity.id === targetId) return;
        
        const entityJson = JSON.stringify(entity).toLowerCase();
        const entityType = (entity as any).type ? 'quality' : ((entity as any).deck ? 'opportunity' : 'storylet');
        const entityName = entity.name || entity.id;

        // 1. INBOUND: Does this Entity reference the Target?
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

        // 2. OUTBOUND: Does the Target reference this Entity?
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

// =============================================================================
// PART 2: GRAPH VISUALIZER LOGIC (React Flow Layout)
// =============================================================================

export function generateGraph(
    storylets: Record<string, Storylet> | undefined | null, 
    mode: 'redirect' | 'quality', 
    targetQuality?: string,
    showSelfLoops: boolean = true
): { nodes: Node[], edges: Edge[] } {
    
    if (!storylets || typeof storylets !== 'object') return { nodes: [], edges: [] };

    const storyletList = Object.values(storylets);
    const cleanQ = targetQuality ? targetQuality.replace('$', '').trim() : '';

    // --- 1. IDENTIFY RELEVANT NODES ---
    const tempNodes = new Set<string>();
    const nodeDataMap: Record<string, { label: string, role: string, description: string, originalId: string }> = {};

    storyletList.forEach(s => {
        if(!s.id) return;
        let isRelevant = true;
        let role = 'neutral';
        const details: string[] = [];
        const sJson = JSON.stringify(s).toLowerCase();

        if (mode === 'quality' && cleanQ) {
            // Check if this storylet interacts with the quality at all
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

    // --- 2. CALCULATE EDGES & TOPOLOGY ---
    const finalEdges: Edge[] = [];
    const edgeCounts: Record<string, number> = {};
    const adjacency: Record<string, string[]> = {}; 
    const inDegree: Record<string, number> = {};    

    // Init adjacency
    tempNodes.forEach(id => { adjacency[id] = []; inDegree[id] = 0; });

    // Helper to create edge
    const addEdge = (sourceId: string, targetId: string, label: string, color: string) => {
        const sId = sanitizeId(sourceId);
        const tId = sanitizeId(targetId);
        
        if (!tempNodes.has(sId) || !tempNodes.has(tId)) return;

        // Update Topology for Layout
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

    // Iterate Logic to Draw Edges
    storyletList.forEach(source => {
        if (!source.options) return;

        source.options.forEach(opt => {
            // A. REDIRECT MODE: Explicit Links
            if (mode === 'redirect') {
                if (opt.pass_redirect) addEdge(source.id, opt.pass_redirect, `(Pass) ${opt.name}`, '#2ecc71');
                if (opt.fail_redirect) addEdge(source.id, opt.fail_redirect, `(Fail) ${opt.name}`, '#e74c3c');
            }

            // B. QUALITY MODE: Implicit Links (Provider -> Dependent)
            if (mode === 'quality' && cleanQ) {
                // If Source Modifies Q
                const optJson = JSON.stringify(opt).toLowerCase();
                // Basic check if option touches quality
                if (optJson.includes(cleanQ.toLowerCase())) {
                    const analysis = analyzeRelationship({ options: [opt] }, cleanQ, optJson);
                    
                    if (analysis && analysis.role === 'provider') {
                        // We found a Provider Option. Now find Dependencies.
                        const valueLabel = analysis.reason === 'Modifies State' ? 'Modifies' : 'Sets';
                        
                        // Look at ALL other storylets to see if they need this
                        storyletList.forEach(target => {
                            if (target.id === source.id) return;
                            
                            // Check target for dependency
                            const tJson = JSON.stringify(target).toLowerCase();
                            if (tJson.includes(cleanQ.toLowerCase())) {
                                const tAnalysis = analyzeRelationship(target, cleanQ, tJson);
                                if (tAnalysis && tAnalysis.role === 'dependent') {
                                    // EDGE: Provider Option -> Dependent Storylet
                                    addEdge(
                                        source.id, 
                                        target.id, 
                                        `${opt.name}\n[${valueLabel}]`, 
                                        '#61afef'
                                    );
                                }
                            }
                        });
                    }
                }
            }
        });
    });

    // --- 3. AUTO-LAYOUT (BFS Layering) ---
    const nodePositions: Record<string, { x: number, y: number }> = {};
    const visited = new Set<string>();
    let queue: string[] = [];

    // Find roots
    tempNodes.forEach(id => {
        if (inDegree[id] === 0) queue.push(id);
    });
    // Fallback if circular
    if (queue.length === 0 && tempNodes.size > 0) {
        queue.push(Array.from(tempNodes)[0]);
    }

    let level = 0;
    const levelHeight: Record<number, number> = {};

    while (queue.length > 0) {
        const nextQueue: string[] = [];
        queue.sort(); // Sort for deterministic layout

        queue.forEach(id => {
            if (visited.has(id)) return;
            visited.add(id);

            const row = levelHeight[level] || 0;
            nodePositions[id] = { x: level * 350, y: row * 200 };
            levelHeight[level] = row + 1;

            const neighbors = adjacency[id] || [];
            neighbors.forEach(nid => {
                if (!visited.has(nid)) nextQueue.push(nid);
            });
        });

        queue = nextQueue;
        level++;
    }

    // Handle disconnected islands
    tempNodes.forEach(id => {
        if (!visited.has(id)) {
            const row = levelHeight[0] || 0;
            nodePositions[id] = { x: 0, y: (row + 1) * 200 };
            levelHeight[0] = row + 1;
        }
    });

    // --- 4. BUILD REACT FLOW NODES ---
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