'use client';
import { useState, useEffect } from 'react';
import { PlayerQualities, QualityType } from '@/engine/models';

interface Props {
    onUpdate: (qualities: PlayerQualities) => void;
}

export default function ScribeDebugger({ onUpdate }: Props) {
    const [rows, setRows] = useState<{ key: string, value: string }[]>([
        { key: 'combat', value: '0' }
    ]);

    // Convert rows to PlayerQualities structure
    const broadcastChanges = (currentRows: typeof rows) => {
        const mockQualities: PlayerQualities = {};
        
        currentRows.forEach(row => {
            const key = row.key.replace('$', '').trim();
            if (!key) return;

            const isNum = !isNaN(Number(row.value)) && row.value.trim() !== '';
            
            mockQualities[key] = {
                qualityId: key,
                type: isNum ? QualityType.Pyramidal : QualityType.String,
                level: isNum ? Number(row.value) : 0,
                stringValue: String(row.value),
                // Defaults for mock
                changePoints: 0,
                sources: [],
                spentTowardsPrune: 0
            } as any;
        });

        onUpdate(mockQualities);
    };

    const handleChange = (index: number, field: 'key' | 'value', val: string) => {
        const newRows = [...rows];
        newRows[index][field] = val;
        setRows(newRows);
        broadcastChanges(newRows);
    };

    const addRow = () => {
        setRows([...rows, { key: '', value: '' }]);
    };

    const removeRow = (index: number) => {
        const newRows = rows.filter((_, i) => i !== index);
        setRows(newRows);
        broadcastChanges(newRows);
    };

    // Initial broadcast
    useEffect(() => { broadcastChanges(rows); }, []);

    return (
        <div style={{ background: '#111', border: '1px solid #333', borderRadius: '4px', padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginTop: 0, fontSize: '0.9rem', color: '#61afef', textTransform: 'uppercase', marginBottom: '1rem' }}>
                State Debugger
            </h3>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {rows.map((row, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: '#222', borderRadius: '4px', paddingLeft: '0.5rem', flex: 1 }}>
                            <span style={{ color: '#61afef', fontSize: '0.8rem' }}>$</span>
                            <input 
                                value={row.key}
                                onChange={e => handleChange(i, 'key', e.target.value)}
                                placeholder="variable"
                                style={{ background: 'transparent', border: 'none', color: '#fff', width: '100%', padding: '0.4rem', outline: 'none', fontSize: '0.85rem' }}
                            />
                        </div>
                        <span style={{ color: '#555' }}>=</span>
                        <input 
                            value={row.value}
                            onChange={e => handleChange(i, 'value', e.target.value)}
                            placeholder="value"
                            style={{ background: '#222', border: 'none', borderRadius: '4px', color: '#e5c07b', width: '80px', padding: '0.4rem', outline: 'none', fontSize: '0.85rem' }}
                        />
                        <button onClick={() => removeRow(i)} style={{ color: '#e06c75', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                    </div>
                ))}
            </div>

            <button onClick={addRow} style={{ marginTop: '1rem', background: '#2a3e5c', border: 'none', color: 'white', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                + Add Variable
            </button>
        </div>
    );
}