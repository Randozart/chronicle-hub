// src/app/create/[storyId]/storylets/components/OptionList.tsx

'use client';

import { useState } from 'react';
import { ResolveOption, QualityDefinition } from '@/engine/models';
import OptionEditor from './OptionEditor';

interface Props {
    options: ResolveOption[];
    onChange: (newOptions: ResolveOption[]) => void;
    storyId: string;
    qualityDefs: QualityDefinition[];
}

export default function OptionList({ options, onChange, storyId, qualityDefs }: Props) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleUpdate = (updated: ResolveOption) => {
        const newOptions = options.map(o => o.id === updated.id ? updated : o);
        onChange(newOptions);
    };

    const handleAdd = () => {
        const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        const newId = `opt_${uniqueSuffix}`;
        
        const newOption: ResolveOption = {
            id: newId,
            name: "New Option",
            pass_long: "Success...",
            ordering: options.length + 1
        };
        onChange([...options, newOption]);
        setExpandedId(newOption.id);
    };

    const handleDelete = (id: string) => {
        if (!confirm("Delete this option?")) return;
        onChange(options.filter(o => o.id !== id));
    };

    const moveOption = (index: number, direction: -1 | 1) => {
        if (index + direction < 0 || index + direction >= options.length) return;
        const newOptions = [...options];
        const temp = newOptions[index];
        newOptions[index] = newOptions[index + direction];
        newOptions[index + direction] = temp;
        onChange(newOptions);
    };

    return (
        <div>
            {options.map((opt, index) => (
                <div key={opt.id} style={{ marginBottom: '1rem', border: '1px solid var(--tool-border)', borderRadius: '4px', background: 'var(--tool-bg-sidebar)' }}>
                    <div 
                        style={{ 
                            padding: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                            background: expandedId === opt.id ? 'var(--tool-bg-header)' : 'transparent', 
                            borderBottom: expandedId === opt.id ? '1px solid var(--tool-border)' : 'none' 
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', marginRight: '0.5rem' }}>
                            <button onClick={(e) => { e.stopPropagation(); moveOption(index, -1); }} disabled={index === 0} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--tool-text-dim)', fontSize: '0.6rem', padding: 0 }}>▲</button>
                            <button onClick={(e) => { e.stopPropagation(); moveOption(index, 1); }} disabled={index === options.length - 1} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--tool-text-dim)', fontSize: '0.6rem', padding: 0 }}>▼</button>
                        </div>

                        <div 
                            onClick={() => setExpandedId(expandedId === opt.id ? null : opt.id)}
                            style={{ flex: 1, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                            <div>
                                <span style={{ color: 'var(--tool-text-dim)', fontSize: '0.8rem', marginRight: '0.5rem' }}>#{index + 1}</span>
                                <span style={{ fontWeight: 'bold', color: expandedId === opt.id ? 'var(--tool-text-header)' : 'var(--tool-text-main)' }}>{opt.name || opt.id}</span>
                                {opt.tags?.includes('dangerous') && <span style={{ marginLeft: '10px', fontSize: '0.7rem', color: 'var(--danger-color)', border: '1px solid var(--danger-color)', padding: '0 4px', borderRadius: '4px' }}>DANGEROUS</span>}
                                {opt.challenge && <span style={{ marginLeft: '10px', fontSize: '0.7rem', color: '#f1c40f', border: '1px solid #f1c40f', padding: '0 4px', borderRadius: '4px' }}>DIFFICULTY CHECK</span>}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--tool-text-dim)' }}>
                                {expandedId === opt.id ? '▼' : '▶'}
                            </div>
                        </div>
                    </div>
                    
                    {expandedId === opt.id && (
                        <div style={{ padding: '1rem' }}>
                            <OptionEditor 
                                data={opt} 
                                onChange={handleUpdate} 
                                onDelete={() => handleDelete(opt.id)}
                                storyId={storyId}
                                qualityDefs={qualityDefs} 
                            />
                        </div>
                    )}
                </div>
            ))}
            
            <button 
                onClick={handleAdd}
                style={{ width: '100%', padding: '0.75rem', border: '1px dashed var(--tool-border)', background: 'transparent', color: 'var(--tool-text-dim)', cursor: 'pointer', borderRadius: '4px' }}
                className="hover:bg-[var(--tool-bg-header)] hover:text-[var(--tool-text-main)] transition"
            >
                + Add Option
            </button>
        </div>
    );
}