import { Storylet } from './models'; 
import { Node, Edge } from '@xyflow/react';

type GraphMode = 'redirect' | 'quality';

export function generateGraph(
    storylets: Record<string, Storylet> | undefined | null, 
    mode: GraphMode, 
    targetQuality?: string
): { nodes: Node[], edges: Edge[] } {
    
    if (!storylets || typeof storylets !== 'object') return { nodes: [], edges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const storyletList = Object.values(storylets);
    const cleanQ = targetQuality ? targetQuality.replace('$', '').trim() : '';

    // 1. BUILD NODES
    storyletList.forEach(s => {
        if (!s || !s.id) return;

        let isRelevant = true;
        let role = 'neutral'; 

        if (mode === 'quality' && cleanQ) {
            const json = JSON.stringify(s);
            const mentionsQuality = json.includes(cleanQ); 
            
            if (!mentionsQuality) {
                isRelevant = false;
            } else {
                const isProducer = s.options?.some(o => o.pass_quality_change?.includes(cleanQ) || o.fail_quality_change?.includes(cleanQ));
                const isConsumer = 
                    (s.visible_if?.includes(cleanQ) || s.unlock_if?.includes(cleanQ)) || 
                    s.options?.some(o => o.visible_if?.includes(cleanQ) || o.unlock_if?.includes(cleanQ));

                if (isProducer && isConsumer) role = 'hub';
                else if (isProducer) role = 'producer';
                else if (isConsumer) role = 'consumer';
            }
        }

        if (isRelevant) {
            let borderColor = '#555';
            if (role === 'producer') borderColor = '#2ecc71'; // Green
            if (role === 'consumer') borderColor = '#e74c3c'; // Red
            if (role === 'hub') borderColor = '#f1c40f';      // Yellow

            nodes.push({
                id: sanitizeId(s.id),
                position: { x: 0, y: 0 },
                data: { label: s.name || s.id },
                style: { 
                    background: '#1e2127', color: '#fff', 
                    border: `2px solid ${borderColor}`, borderRadius: '4px',
                    width: 220, padding: '10px', fontSize: '12px'
                }
            });
        }
    });

    // 2. BUILD EDGES
    storyletList.forEach(source => {
        const sourceNodeId = sanitizeId(source.id);
        if (!nodes.find(n => n.id === sourceNodeId)) return;
        if (!source.options) return;
        const edgeCounts: Record<string, number> = {};

        source.options.forEach(opt => {
            
            // --- MODE A: REDIRECTS ---
            if (mode === 'redirect') {
                if (opt.pass_redirect) createEdge(source.id, opt.pass_redirect, `(Pass) ${opt.name}`, edges, nodes, '#2ecc71', edgeCounts);
                if (opt.fail_redirect) createEdge(source.id, opt.fail_redirect, `(Fail) ${opt.name}`, edges, nodes, '#e74c3c', edgeCounts);
            }

            if (mode === 'quality' && cleanQ) {
                const changeStr = opt.pass_quality_change || '';
                
                // Regex for Value Changes ($q += 5)
                // Capture Group 1: Operator (=, +=, -=)
                // Capture Group 2: Value (digits, vars)
                const valRegex = new RegExp(`\\$${cleanQ}\\s*(=|\\+=|-=)\\s*([\\d\\w_$]+)`);
                
                // Regex for Increment/Decrement ($q++)
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

                    // Link to ANY node that mentions this quality (Consumer or Hub)
                    storyletList.forEach(target => {
                        // NOTE: Removed self-check to allow loops
                        
                        const sGate = (target.visible_if || '') + (target.unlock_if || '');
                        const oGate = target.options?.map(o => (o.visible_if || '') + (o.unlock_if || '')).join(' ') || '';
                        const fullGates = sGate + oGate;

                        // Check if target relies on this quality
                        // We check for variable usage ($q) in conditions
                        if (fullGates.includes(`$${cleanQ}`)) {
                            
                            let color = '#61afef'; 
                            if (operator === '+=') color = '#2ecc71'; 
                            if (operator === '-=') color = '#e74c3c'; 
                            
                            // Format Label with line break for readability
                            const label = `${opt.name}\n(${operator} ${value})`;
                            
                            createEdge(source.id, target.id, label, edges, nodes, color, edgeCounts);
                        }
                    });
                }
            }
        });
    });

    return { nodes, edges };
}

function createEdge(
    source: string, 
    target: string, 
    label: string, 
    edges: Edge[], 
    nodes: Node[], 
    color: string,
    edgeCounts: Record<string, number> // <--- New Param
) {
    const sId = sanitizeId(source);
    const tId = sanitizeId(target);

    if (!nodes.find(n => n.id === sId)) return;
    if (!nodes.find(n => n.id === tId)) return;

    // 1. Calculate Offset Key (Source -> Target)
    const key = `${sId}->${tId}`;
    const count = (edgeCounts[key] || 0);
    edgeCounts[key] = count + 1;

    const isSelfLoop = sId === tId;
    const edgeId = `e-${sId}-${tId}-${count}-${Math.random().toString(36).substr(2, 5)}`;

    edges.push({
        id: edgeId,
        source: sId,
        target: tId,
        label: label.length > 50 ? label.substring(0, 50) + '...' : label,
        animated: true,
        
        // Pass the offset index in 'data' so the component can read it
        data: { offsetIndex: count }, 
        
        type: isSelfLoop ? 'selfloop' : 'smoothstep', 
        
        style: { stroke: color, strokeWidth: 2 },
        labelStyle: { fill: '#ccc', fontSize: 11, fontWeight: 700 },
    });
}

function sanitizeId(id: string) {
    return id.replace(/[^a-zA-Z0-9-_]/g, '_');
}