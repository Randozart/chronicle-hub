'use client';

import { useState } from 'react';
import { InstrumentDefinition } from '@/engine/audio/models';

interface Props {
    instruments: InstrumentDefinition[];
    onSelect: (instrumentId: string) => void;
}

export default function InstrumentLibrary({ instruments, onSelect }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [openCategory, setOpenCategory] = useState<string | null>('Custom');

    const filteredInstruments = instruments.filter(inst => 
        inst.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        inst.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedInstruments = filteredInstruments.reduce((acc, curr) => {
        const cat = curr.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr);
        return acc;
    }, {} as Record<string, InstrumentDefinition[]>);

    const sortedCategories = Object.keys(groupedInstruments).sort((a, b) => {
        if (a === 'Custom') return -1;
        if (b === 'Custom') return 1;
        return a.localeCompare(b);
    });

    const toggleCategory = (category: string) => {
        setOpenCategory(prev => (prev === category ? null : category));
    };

    return (
        <div style={{ 
            background: 'var(--tool-bg-header)', border: '1px solid #333', borderRadius: '4px', 
            height: '100%', display: 'flex', flexDirection: 'column' 
        }}>
            <h3 style={{ 
                marginTop: 0, fontSize: '0.9rem', color: '#61afef', 
                textTransform: 'uppercase', padding: '1rem', 
                borderBottom: '1px solid var(--tool-border)', margin: 0
            }}>
                Instrument Library
            </h3>
            
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--tool-border)' }}>
                <input
                    type="text"
                    placeholder="Search instruments..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ width: '100%', background: '#111', border: '1px solid #555', color: 'var(--tool-text-main)', padding: '0.5rem', borderRadius: '4px' }}
                />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {sortedCategories.map(category => (
                    <div key={category} style={{ marginBottom: '0.5rem' }}>
                        <button
                            onClick={() => toggleCategory(category)}
                            style={{
                                width: '100%', background: 'none', border: 'none',
                                padding: '0.5rem', textAlign: 'left', cursor: 'pointer',
                                color: category === 'Custom' ? 'var(--accent-highlight-alt)' : '#e5c07b',
                                fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase',
                                borderBottom: '1px solid #444'
                            }}
                        >
                            {openCategory === category ? '▼' : '►'} {category}
                        </button>
                        
                        {openCategory === category && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.5rem' }}>
                                {groupedInstruments[category].sort((a, b) => a.name.localeCompare(b.name)).map(instrument => (
                                    <button
                                        key={instrument.id}
                                        onClick={() => onSelect(instrument.id)}
                                        title={`Click to edit ${instrument.name}`}
                                        style={{
                                            background: '#2c313a', border: '1px solid #333',
                                            borderRadius: '4px', padding: '0.5rem',
                                            textAlign: 'left', color: 'var(--tool-text-main)', cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ fontWeight: 'bold' }}>{instrument.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--tool-text-dim)', fontFamily: 'monospace' }}>{instrument.id}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}