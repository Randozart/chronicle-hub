// src/app/create/[storyId]/storylets/components/OptionList.tsx
'use client';

import { useState } from 'react';
import { ResolveOption, QualityDefinition } from '@/engine/models';
import OptionEditor from './OptionEditor';

interface Props {
    options: ResolveOption[];
    onChange: (newOptions: ResolveOption[]) => void;
    storyId: string;
    // NEW PROP
    qualityDefs: QualityDefinition[];
}

export default function OptionList({ options, onChange, storyId, qualityDefs }: Props) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleUpdate = (updated: ResolveOption) => {
        const newOptions = options.map(o => o.id === updated.id ? updated : o);
        onChange(newOptions);
    };

    const handleAdd = () => {
        const id = prompt("Enter unique Option ID suffix (e.g. 'agree', 'fight'):");
        if (!id) return;
        
        const newOption: ResolveOption = {
            id: id,
            name: "New Option",
            pass_long: "Success text...",
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
                <div key={opt.id} style={{ marginBottom: '1rem', border: '1px solid #333', borderRadius: '4px', background: '#21252b' }}>
                    <div 
                        style={{ padding: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: expandedId === opt.id ? '#2c313a' : 'transparent', borderBottom: expandedId === opt.id ? '1px solid #333' : 'none' }}
                    >
                        {/* REORDER CONTROLS */}
                        <div style={{ display: 'flex', flexDirection: 'column', marginRight: '0.5rem' }}>
                            <button onClick={(e) => { e.stopPropagation(); moveOption(index, -1); }} disabled={index === 0} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#aaa', fontSize: '0.6rem', padding: 0 }}>▲</button>
                            <button onClick={(e) => { e.stopPropagation(); moveOption(index, 1); }} disabled={index === options.length - 1} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#aaa', fontSize: '0.6rem', padding: 0 }}>▼</button>
                        </div>

                        <div 
                            onClick={() => setExpandedId(expandedId === opt.id ? null : opt.id)}
                            style={{ flex: 1, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                            <div>
                                <span style={{ color: '#aaa', fontSize: '0.8rem', marginRight: '0.5rem' }}>#{index + 1}</span>
                                <span style={{ fontWeight: 'bold', color: expandedId === opt.id ? '#fff' : '#ccc' }}>{opt.name || opt.id}</span>
                                {opt.tags?.includes('dangerous') && <span style={{ marginLeft: '10px', fontSize: '0.7rem', color: '#e74c3c', border: '1px solid #e74c3c', padding: '0 4px', borderRadius: '4px' }}>DANGEROUS</span>}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                {opt.id} {expandedId === opt.id ? '▼' : '▶'}
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
                                qualityDefs={qualityDefs} // PASS DATA DOWN
                            />
                        </div>
                    )}
                </div>
            ))}
            
            <button 
                onClick={handleAdd}
                style={{ width: '100%', padding: '0.75rem', border: '1px dashed #444', background: 'transparent', color: '#888', cursor: 'pointer', borderRadius: '4px' }}
                className="hover:bg-[#2c313a] hover:text-white transition"
            >
                + Add Option
            </button>
        </div>
    );
}