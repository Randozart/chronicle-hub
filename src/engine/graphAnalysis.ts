import { Storylet } from './models'; 
import { Node, Edge } from '@xyflow/react';

type GraphMode = 'redirect' | 'quality';

export function generateGraph(
    storylets: Record<string, Storylet> | undefined | null, 
    mode: GraphMode, 
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
        
        // Build a detailed tooltip
        const details: string[] = [];

        if (mode === 'quality' && cleanQ) {
            const json = JSON.stringify(s);
            
            if (!json.includes(cleanQ)) {
                isRelevant = false;
            } else {
                // A. Analyze Production (Changes)
                const producerOpts = s.options?.filter(o => 
                    o.pass_quality_change?.includes(cleanQ) || 
                    o.fail_quality_change?.includes(cleanQ)
                ) || [];
                
                if (producerOpts.length > 0) {
                    details.push("--- MODIFIES QUALITY ---");
                    producerOpts.forEach(o => {
                        const changeStr = o.pass_quality_change || '';
                        let displayOp = "modifies";

                        // 1. Check Increment/Decrement ($q++ or $q--)
                        // matches: $q++ or $q--
                        const incRegex = new RegExp(`\\$${cleanQ}\\s*(\\+\\+|--)`);
                        const incMatch = changeStr.match(incRegex);

                        // 2. Check Value Assignment ($q += 10, $q = { 1+1 })
                        // matches: $q (op) (value up to comma or end)
                        const valRegex = new RegExp(`\\$${cleanQ}\\s*(=|\\+=|-=)\\s*([^,]+)`);
                        const valMatch = changeStr.match(valRegex);

                        if (incMatch) {
                            const op = incMatch[1];
                            displayOp = op === '++' ? '(+ 1)' : '(- 1)';
                        } else if (valMatch) {
                            const op = valMatch[1];
                            const val = valMatch[2].trim();
                            displayOp = `(${op} ${val})`;
                        }

                        details.push(`Option "${o.name}":\n   ↳ ${displayOp}`);
                    });
                }

                // B. Analyze Consumption (Gates)
                const conditions: string[] = [];
                
                if (s.visible_if?.includes(cleanQ)) conditions.push(`Storylet Visible If: ${s.visible_if}`);
                if (s.unlock_if?.includes(cleanQ)) conditions.push(`Storylet Unlocked If: ${s.unlock_if}`);
                
                s.options?.forEach(o => {
                    // VERBOSE TEXT:
                    if (o.visible_if?.includes(cleanQ)) conditions.push(`Option "${o.name}" Visible If:\n   ↳ ${o.visible_if}`);
                    if (o.unlock_if?.includes(cleanQ)) conditions.push(`Option "${o.name}" Unlocked If:\n   ↳ ${o.unlock_if}`);
                    if (o.challenge?.includes(cleanQ)) conditions.push(`Option "${o.name}" Challenge:\n   ↳ ${o.challenge}`);
                });

                if (conditions.length > 0) {
                    details.push("--- CHECKED BY ---");
                    details.push(...conditions);
                }

                // C. Analyze Text Usage (Interpolation/Logic)
                // Check Name, Text, Metatext for "{ ... $q ... }"
                const textUsage: string[] = [];
                const textFields = [s.name, s.text, s.metatext].filter(Boolean) as string[];
                
                // Regex to find { blocks containing the quality }
                // Note: This is a rough check, fully parsing brackets is hard with regex alone
                if (textFields.some(t => t.includes(`$${cleanQ}`))) {
                     // Check if it's inside logic braces
                     const hasLogic = textFields.some(t => t.match(new RegExp(`\\{[^}]*\\$${cleanQ}[^}]*\\}`)));
                     if (hasLogic) textUsage.push("Used in Logic Text/Conditional");
                     else textUsage.push("Used in String Interpolation");
                }

                if (textUsage.length > 0) {
                    details.push("--- APPEARS IN TEXT ---");
                    details.push(...Array.from(new Set(textUsage)));
                }

                // D. Determine Role
                const isProducer = producerOpts.length > 0;
                const isConsumer = conditions.length > 0 || textUsage.length > 0;

                if (isProducer && isConsumer) role = 'hub';
                else if (isProducer) role = 'producer';
                else if (isConsumer) role = 'consumer';
            }
        }

        if (isRelevant) {
            const sId = sanitizeId(s.id);
            tempNodes.add(sId);
            nodeDataMap[sId] = { 
                label: s.name || s.id, 
                role, 
                description: details.join('\n'),
                originalId: s.id // <--- ADD THIS FIELD
            };
        }
    });

    // ... (Rest of file: Edge Calculation and Layout Algorithm remain unchanged) ...
    // ... (Copy the code from Step 2 and 3 of the previous "Graph Analysis" response below this line) ...
    
    // --- 2. CALCULATE EDGES & TOPOLOGY ---
    const finalEdges: Edge[] = [];
    const edgeCounts: Record<string, number> = {};
    const adjacency: Record<string, string[]> = {}; 
    const inDegree: Record<string, number> = {};    

    // Init adjacency
    tempNodes.forEach(id => { adjacency[id] = []; inDegree[id] = 0; });

    storyletList.forEach(source => {
        const sId = sanitizeId(source.id);
        if (!tempNodes.has(sId)) return;
        if (!source.options) return;

        source.options.forEach(opt => {
            const processLink = (targetRawId: string, label: string, color: string) => {
                const tId = sanitizeId(targetRawId);
                if (!tempNodes.has(tId)) return;

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

            if (mode === 'redirect') {
                if (opt.pass_redirect) processLink(opt.pass_redirect, `(Pass) ${opt.name}`, '#2ecc71');
                if (opt.fail_redirect) processLink(opt.fail_redirect, `(Fail) ${opt.name}`, '#e74c3c');
            }

            if (mode === 'quality' && cleanQ) {
                const changeStr = opt.pass_quality_change || '';
                const valRegex = new RegExp(`\\$${cleanQ}\\s*(=|\\+=|-=)\\s*([\\d\\w_$]+)`);
                const incRegex = new RegExp(`\\$${cleanQ}\\s*(\\+\\+|--)`);

                const valMatch = changeStr.match(valRegex);
                const incMatch = changeStr.match(incRegex);

                if (valMatch || incMatch) {
                    let operator = '';
                    let value = '';

                    if (valMatch) {
                        operator = valMatch[1];
                        value = valMatch[2];
                    } else if (incMatch) {
                        const opRaw = incMatch[1];
                        operator = opRaw === '++' ? '+=' : '-=';
                        value = '1';
                    }

                    storyletList.forEach(target => {
                        const sGate = (target.visible_if || '') + (target.unlock_if || '');
                        const oGate = target.options?.map(o => (o.visible_if || '') + (o.unlock_if || '')).join(' ') || '';
                        const fullGates = sGate + oGate;

                        if (fullGates.includes(`$${cleanQ}`)) {
                            let color = '#61afef'; 
                            if (operator === '+=') color = '#2ecc71'; 
                            if (operator === '-=') color = '#e74c3c'; 
                            
                            const label = `${opt.name}\n(${operator} ${value})`;
                            
                            processLink(target.id, label, color);
                        }
                    });
                }
            }
        });
    });

    const nodePositions: Record<string, { x: number, y: number }> = {};
    const visited = new Set<string>();
    let queue: string[] = [];

    tempNodes.forEach(id => {
        if (inDegree[id] === 0) queue.push(id);
    });
    if (queue.length === 0 && tempNodes.size > 0) {
        queue.push(Array.from(tempNodes)[0]);
    }

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
            neighbors.forEach(nid => {
                if (!visited.has(nid)) nextQueue.push(nid);
            });
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
            // Pass originalId here
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

function sanitizeId(id: string) {
    return id.replace(/[^a-zA-Z0-9-_]/g, '_');
}