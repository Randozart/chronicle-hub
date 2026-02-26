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
    const [search, setSearch] = useState('');

    // Reset rows whenever the parent increments resetKey (e.g. after character import)
    useEffect(() => {
        if (resetKey !== undefined && initialRows && initialRows.length > 0) {
            setRows(initialRows);
            setSearch(''); // clear search on import
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

    const filteredRows = search.trim()
        ? rows.map((r, i) => ({ ...r, _orig: i })).filter(r => r.key.toLowerCase().includes(search.toLowerCase()))
        : rows.map((r, i) => ({ ...r, _orig: i }));

    const inputBase: React.CSSProperties = {
        background: 'transparent',
        border: 'none',
        color: 'var(--tool-text-header)',
        width: '100%',
        padding: '0.5rem 0.6rem',
        outline: 'none',
        fontSize: '0.88rem',
        fontFamily: 'monospace',
        lineHeight: 1.4,
    };

    return (
        <div style={{
            background: 'var(--tool-bg-sidebar)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
        }}>
            {/* Search bar */}
            <div style={{
                padding: '0.45rem 0.6rem',
                borderBottom: '1px solid var(--tool-border)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
            }}>
                <span style={{ color: 'var(--tool-text-dim)', fontSize: '0.8rem', userSelect: 'none' }}>🔍</span>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filter variables…"
                    style={{
                        ...inputBase,
                        padding: '0.2rem 0.3rem',
                        fontSize: '0.82rem',
                        color: 'var(--tool-text-header)',
                        flex: 1,
                    }}
                />
                {search && (
                    <button
                        onClick={() => setSearch('')}
                        style={{ background: 'none', border: 'none', color: 'var(--tool-text-dim)', cursor: 'pointer', fontSize: '1rem', padding: '0 2px', lineHeight: 1 }}
                        title="Clear search"
                    >
                        ×
                    </button>
                )}
                <span style={{ color: 'var(--tool-text-dim)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                    {rows.length} var{rows.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Rows */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.4rem 0.55rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {rows.length === 0 && (
                    <div style={{ color: 'var(--tool-text-dim)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', marginTop: '0.75rem' }}>
                        No variables yet — add one below or import a character.
                    </div>
                )}
                {search.trim() && filteredRows.length === 0 && (
                    <div style={{ color: 'var(--tool-text-dim)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', marginTop: '0.75rem' }}>
                        No variables match "{search}".
                    </div>
                )}
                {filteredRows.map(({ _orig: i, key, value }) => (
                    <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {/* Key */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--tool-border)',
                            borderRadius: '5px',
                            flex: 1,
                            paddingLeft: '0.5rem',
                            minHeight: '34px',
                        }}>
                            <span style={{ color: 'var(--tool-accent)', fontSize: '0.9rem', userSelect: 'none', fontWeight: 600, fontFamily: 'monospace' }}>$</span>
                            <input
                                value={key}
                                onChange={e => handleChange(i, 'key', e.target.value)}
                                placeholder="variable"
                                style={inputBase}
                            />
                        </div>
                        <span style={{ color: 'var(--tool-text-dim)', fontSize: '0.9rem', userSelect: 'none', fontFamily: 'monospace' }}>=</span>
                        {/* Value */}
                        <input
                            value={value}
                            onChange={e => handleChange(i, 'value', e.target.value)}
                            placeholder="val"
                            style={{
                                ...inputBase,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--tool-border)',
                                borderRadius: '5px',
                                color: 'var(--warning-color)',
                                width: '86px',
                                textAlign: 'right',
                                padding: '0.5rem 0.6rem',
                                minHeight: '34px',
                                boxSizing: 'border-box',
                            }}
                        />
                        <button
                            onClick={() => removeRow(i)}
                            style={{ color: 'var(--danger-color)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
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
                    margin: '0 0.55rem 0.55rem',
                    background: 'rgba(97,175,239,0.08)',
                    border: '1px dashed var(--tool-accent)',
                    color: 'var(--tool-accent)',
                    padding: '0.4rem',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontFamily: 'inherit',
                    flexShrink: 0,
                }}
            >
                + Add Variable
            </button>
        </div>
    );
}
