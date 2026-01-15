'use client';
import { useState, useEffect } from 'react';
import { PlayerQualities, QualityType, QualityDefinition } from '@/engine/models';

interface Props {
    onUpdate: (qualities: PlayerQualities, defs: Record<string, QualityDefinition>) => void;
}

export default function ScribeDebugger({ onUpdate }: Props) {
    const [rows, setRows] = useState<{ key: string, value: string }[]>([
        { key: 'combat', value: '5' }
    ]);
    useEffect(() => {
        const timer = setTimeout(() => {
            const mockQualities: PlayerQualities = {};
            const mockDefs: Record<string, QualityDefinition> = {};
        
            rows.forEach(row => {
                const key = row.key.replace(/^[\$#]/, '').trim();
                if (!key) return;
                const isNumeric = !isNaN(Number(row.value)) && row.value.trim() !== '';
                const type = isNumeric ? QualityType.Pyramidal : QualityType.String;
                const numericValue = isNumeric ? Number(row.value) : 0;
                mockDefs[key] = {
                    id: key,
                    name: key,
                    type: type,
                    description: "A mock quality from the debugger.",
                };
                if (isNumeric) {
                    mockQualities[key] = {
                        qualityId: key,
                        type: type,
                        level: numericValue, 
                        changePoints: (numericValue * (numericValue + 1)) / 2, 
                        stringValue: String(row.value),
                    } as any;
                } else {
                    mockQualities[key] = {
                        qualityId: key,
                        type: type,
                        stringValue: String(row.value),
                        level: 0,
                        changePoints: 0,
                    } as any;
                }
            });
            
            onUpdate(mockQualities, mockDefs);
        }, 500);

        return () => clearTimeout(timer);
    }, [rows, onUpdate]);

    const handleChange = (index: number, field: 'key' | 'value', val: string) => {
        const newRows = [...rows];
        newRows[index][field] = val;
        setRows(newRows);
    };

    const addRow = () => {
        setRows([...rows, { key: '', value: '' }]);
    };

    const removeRow = (index: number) => {
        const newRows = rows.filter((_, i) => i !== index);
        setRows(newRows);
    };

    return (
        <div style={{ background: '#111', borderBottom: '1px solid var(--tool-border)', padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3 style={{ marginTop: 0, fontSize: '0.8rem', color: '#61afef', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '1px' }}>
                State Debugger
            </h3>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {rows.map((row, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: '#222', borderRadius: '4px', paddingLeft: '0.5rem', flex: 1, border: '1px solid #333' }}>
                            <span style={{ color: '#61afef', fontSize: '0.8rem' }}>$</span>
                            <input 
                                value={row.key}
                                onChange={e => handleChange(i, 'key', e.target.value)}
                                placeholder="variable"
                                style={{ background: 'transparent', border: 'none', color: 'var(--tool-text-header)', width: '100%', padding: '0.4rem', outline: 'none', fontSize: '0.8rem', fontFamily: 'monospace' }}
                            />
                        </div>
                        <span style={{ color: '#555' }}>=</span>
                        <input 
                            value={row.value}
                            onChange={e => handleChange(i, 'value', e.target.value)}
                            placeholder="val"
                            style={{ background: '#222', border: '1px solid #333', borderRadius: '4px', color: '#e5c07b', width: '60px', padding: '0.4rem', outline: 'none', fontSize: '0.8rem', fontFamily: 'monospace', textAlign: 'right' }}
                        />
                        <button 
                            onClick={() => removeRow(i)} 
                            style={{ color: '#e06c75', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}
                            title="Remove variable"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
            <button onClick={addRow} style={{ marginTop: '1rem', background: 'rgba(97, 175, 239, 0.1)', border: '1px dashed #61afef', color: '#61afef', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', width: '100%' }}>
                + Add Variable
            </button>
        </div>
    );
}