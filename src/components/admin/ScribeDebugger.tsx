'use client';
import { useState, useEffect, useCallback } from 'react';
import { PlayerQualities, QualityType, QualityDefinition } from '@/engine/models';

interface Row { key: string; value: string; }

interface Props {
    onUpdate: (qualities: PlayerQualities, defs: Record<string, QualityDefinition>) => void;
    /** Pre-populate rows (e.g. from an imported character). Changing resetKey triggers a reset. */
    initialRows?: Row[];
    resetKey?: number;
}

const DEFAULT_ROWS: Row[] = [{ key: 'combat', value: '5' }];

export default function ScribeDebugger({ onUpdate, initialRows, resetKey }: Props) {
    const [rows, setRows] = useState<Row[]>(initialRows ?? DEFAULT_ROWS);

    // Reset rows whenever the parent increments resetKey (e.g. after character import)
    useEffect(() => {
        if (resetKey !== undefined && initialRows && initialRows.length > 0) {
            setRows(initialRows);
        }
    }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // Debounced emit
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
                mockDefs[key] = { id: key, name: key, type, description: 'Mock quality from the debugger.' };
                mockQualities[key] = {
                    qualityId: key,
                    type,
                    level: numericValue,
                    changePoints: isNumeric ? (numericValue * (numericValue + 1)) / 2 : 0,
                    stringValue: String(row.value),
                } as any;
            });

            onUpdate(mockQualities, mockDefs);
        }, 500);
        return () => clearTimeout(timer);
    }, [rows, onUpdate]);

    const handleChange = (index: number, field: 'key' | 'value', val: string) => {
        setRows(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: val };
            return next;
        });
    };

    const addRow = () => setRows(prev => [...prev, { key: '', value: '' }]);
    const removeRow = useCallback((index: number) => setRows(prev => prev.filter((_, i) => i !== index)), []);

    const inputStyle: React.CSSProperties = {
        background: 'transparent',
        border: 'none',
        color: 'var(--tool-text-header)',
        width: '100%',
        padding: '0.35rem 0.4rem',
        outline: 'none',
        fontSize: '0.8rem',
        fontFamily: 'monospace',
    };

    return (
        <div style={{
            background: 'var(--tool-bg-sidebar)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
        }}>
            {/* Rows */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.6rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {rows.length === 0 && (
                    <div style={{ color: 'var(--tool-text-dim)', fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'center', marginTop: '0.5rem' }}>
                        No variables yet — add one below or import a character.
                    </div>
                )}
                {rows.map((row, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        {/* Key */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--tool-border)',
                            borderRadius: '4px',
                            flex: 1,
                            paddingLeft: '0.4rem',
                        }}>
                            <span style={{ color: 'var(--tool-accent)', fontSize: '0.8rem', userSelect: 'none' }}>$</span>
                            <input
                                value={row.key}
                                onChange={e => handleChange(i, 'key', e.target.value)}
                                placeholder="variable"
                                style={inputStyle}
                            />
                        </div>
                        <span style={{ color: 'var(--tool-text-dim)', fontSize: '0.8rem', userSelect: 'none' }}>=</span>
                        {/* Value */}
                        <input
                            value={row.value}
                            onChange={e => handleChange(i, 'value', e.target.value)}
                            placeholder="val"
                            style={{
                                ...inputStyle,
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--tool-border)',
                                borderRadius: '4px',
                                color: 'var(--warning-color)',
                                width: '72px',
                                textAlign: 'right',
                                padding: '0.35rem 0.5rem',
                            }}
                        />
                        <button
                            onClick={() => removeRow(i)}
                            style={{ color: 'var(--danger-color)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
                            title="Remove variable"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            {/* Add button */}
            <button
                onClick={addRow}
                style={{
                    margin: '0 0.6rem 0.6rem',
                    background: 'rgba(97,175,239,0.08)',
                    border: '1px dashed var(--tool-accent)',
                    color: 'var(--tool-accent)',
                    padding: '0.35rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontFamily: 'inherit',
                    flexShrink: 0,
                }}
            >
                + Add Variable
            </button>
        </div>
    );
}
