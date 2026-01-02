'use client';

import { useState, useEffect, useMemo } from 'react';
import ScribeEditor from '@/components/admin/ScribeEditor';
import { QualityDefinition, PlayerQualities, QualityType } from '@/engine/models';
import { evaluateText } from '@/engine/textProcessor';

interface Props {
    storyId: string;
    qualityDefs: QualityDefinition[];
    contextQualityId?: string;
}

interface MockRow {
    id: string; 
    value: string; 
}

export default function ScriptEvaluator({ storyId, qualityDefs, contextQualityId }: Props) {
    // 1. The Script
    const [script, setScript] = useState("");
    
    // 2. The Mock State
    const [rows, setRows] = useState<MockRow[]>(() => {
        const defaults = [
            { id: 'gold', value: '50' },
            { id: 'suspect', value: '1' }
        ];
        if (contextQualityId) {
            return [
                { id: 'self', value: '1' }, 
                ...defaults
            ];
        }
        return defaults;
    });
    
    // 3. The Result
    const [result, setResult] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    // --- AUTO-POPULATE LOGIC ---
    const handleAutoPopulate = () => {
        // 1. Build Lookup Map
        const defMap: Record<string, QualityDefinition> = {};
        qualityDefs.forEach(q => defMap[q.id] = q);

        const visited = new Set<string>();
        const foundVars = new Set<string>();
        const queue = [script];

        // If script uses '$.', we must scan the Context Quality too
        if (script.includes('$.') && contextQualityId && defMap[contextQualityId]) {
            const cDef = defMap[contextQualityId];
            if (cDef.name) queue.push(cDef.name);
            if (cDef.description) queue.push(cDef.description);
            if (cDef.text_variants) Object.values(cDef.text_variants).forEach(v => queue.push(v));
        }

        // BFS Recursion
        while (queue.length > 0) {
            const currentText = queue.shift()!;
            
            // Match $var or #var (Ignore @alias)
            const matches = [...currentText.matchAll(/(?:[\$#])([a-zA-Z0-9_]+)/g)];
            
            for (const m of matches) {
                const id = m[1];
                
                if (!visited.has(id)) {
                    visited.add(id);
                    foundVars.add(id);
                    
                    // Recursively scan definitions of found variables
                    const def = defMap[id];
                    if (def) {
                        if (def.name) queue.push(def.name);
                        if (def.description) queue.push(def.description);
                        if (def.text_variants) {
                            Object.values(def.text_variants).forEach(v => queue.push(v));
                        }
                    }
                }
            }
        }

        // Merge into Rows (Don't overwrite existing)
        const newRows = [...rows];
        const existingIds = new Set(rows.map(r => r.id));
        
        foundVars.forEach(id => {
            if (!existingIds.has(id)) {
                // Default numeric type to 1, others to empty string? 
                // "1" is generally safer for logic checks like >0
                newRows.push({ id, value: '1' }); 
            }
        });
        
        setRows(newRows);
    };

    // --- EXECUTION ENGINE ---
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                setError(null);
                
                const defMap: Record<string, QualityDefinition> = {};
                qualityDefs.forEach(q => defMap[q.id] = q);

                const mockQualities: PlayerQualities = {};

                rows.forEach(row => {
                    const key = row.id.replace(/^[\$#]/, '').trim(); 
                    if (!key) return;

                    const isNumeric = !isNaN(Number(row.value)) && row.value.trim() !== '';
                    const numVal = isNumeric ? parseFloat(row.value) : 0;
                    const defType = defMap[key]?.type || (isNumeric ? QualityType.Pyramidal : QualityType.String);

                    if (defType === QualityType.String) {
                        mockQualities[key] = {
                            qualityId: key,
                            type: QualityType.String,
                            stringValue: row.value,
                            level: 0,
                            changePoints: 0
                        } as any;
                    } else {
                        mockQualities[key] = {
                            qualityId: key,
                            type: defType,
                            level: numVal,
                            stringValue: "",
                            changePoints: 0
                        } as any;
                    }
                });

                let selfContext = null;
                if (mockQualities['self']) {
                    const targetId = contextQualityId || 'self';
                    selfContext = { 
                        qid: targetId, 
                        state: mockQualities['self'] 
                    };
                }

                const resolved = evaluateText(script, mockQualities, defMap, selfContext, 50, {}); 
                setResult(resolved);

            } catch (e: any) {
                console.error(e);
                setError(e.message || "Evaluation Error");
                setResult("");
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [script, rows, qualityDefs, contextQualityId]);

    // --- UI HANDLERS ---
    const updateRow = (index: number, field: keyof MockRow, val: string) => {
        const next = [...rows];
        next[index][field] = val;
        setRows(next);
    };

    const addRow = () => setRows([...rows, { id: '', value: '' }]);
    const removeRow = (index: number) => setRows(rows.filter((_, i) => i !== index));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', overflow: 'hidden' }}>
            
            {/* TOP: MOCK STATE */}
            <div style={{ maxHeight: '180px', flexShrink: 0, overflowY: 'auto', borderBottom: '1px solid var(--tool-border)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#61afef', fontWeight: 'bold', letterSpacing: '1px' }}>
                        Mock State
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            onClick={handleAutoPopulate} 
                            title="Recursively find all variables used in the script"
                            style={{ background: 'none', border: 'none', color: '#c678dd', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Auto
                        </button>
                        <button onClick={addRow} style={{ background: 'none', border: 'none', color: '#98c379', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }}>
                            + Add Var
                        </button>
                    </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {rows.map((row, i) => (
                        <div key={i} style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <span style={{ color: '#555', fontSize: '0.8rem' }}>$</span>
                            <input 
                                className="form-input" 
                                style={{ flex: 1, padding: '2px 6px', fontSize: '0.85rem' }} 
                                placeholder="variable_id"
                                value={row.id}
                                onChange={e => updateRow(i, 'id', e.target.value)}
                                list="quality-list" 
                            />
                            <span style={{ color: '#555' }}>=</span>
                            <input 
                                className="form-input" 
                                style={{ width: '120px', padding: '2px 6px', fontSize: '0.85rem', color: '#d19a66' }} 
                                placeholder="val"
                                value={row.value}
                                onChange={e => updateRow(i, 'value', e.target.value)}
                            />
                            <button onClick={() => removeRow(i)} style={{ color: '#e06c75', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                        </div>
                    ))}
                </div>
                
                <datalist id="quality-list">
                    {qualityDefs.map(q => <option key={q.id} value={q.id} />)}
                </datalist>
            </div>

            {/* MIDDLE: EDITOR */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '150px' }}>
                <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#e5c07b', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '5px' }}>
                    Test Script
                </label>
                <div style={{ flex: 1, border: '1px solid #333', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <ScribeEditor 
                        value={script} 
                        onChange={setScript} 
                        language="scribescript"
                        minHeight="100%"
                        placeholder="Type script here..."
                    />
                </div>
            </div>

            {/* BOTTOM: RESULT */}
            <div style={{ flexShrink: 0, background: 'var(--tool-bg-header)', border: '1px solid #333', borderRadius: '4px', padding: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#98c379', fontWeight: 'bold', letterSpacing: '1px', display:'block', marginBottom:'5px' }}>
                    Output Preview
                </label>
                {error ? (
                    <div style={{ color: '#e06c75', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                        Error: {error}
                    </div>
                ) : (
                    <div style={{ color: 'var(--tool-text-main)', fontSize: '0.95rem', whiteSpace: 'pre-wrap', fontFamily: 'serif', lineHeight: '1.5' }}>
                        {result || <span style={{ color: '#555', fontStyle: 'italic' }}>(Empty Result)</span>}
                    </div>
                )}
            </div>
        </div>
    );
}