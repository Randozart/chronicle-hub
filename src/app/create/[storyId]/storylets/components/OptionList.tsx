'use client';

import { useState } from 'react';
import { ResolveOption } from '@/engine/models';
import OptionEditor from './OptionEditor';

interface Props {
    options: ResolveOption[];
    onChange: (newOptions: ResolveOption[]) => void;
    storyId: string; // <--- NEW PROP
}

export default function OptionList({ options, onChange, storyId }: Props) {
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
            fail_long: "Failure text..."
        };
        onChange([...options, newOption]);
        setExpandedId(newOption.id);
    };

    const handleDelete = (id: string) => {
        if (!confirm("Delete this option?")) return;
        onChange(options.filter(o => o.id !== id));
    };

    return (
        <div>
            {options.map((opt, index) => (
                <div key={opt.id} style={{ marginBottom: '1rem', border: '1px solid #333', borderRadius: '4px', background: '#21252b' }}>
                    <div 
                        onClick={() => setExpandedId(expandedId === opt.id ? null : opt.id)}
                        style={{ padding: '0.75rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: expandedId === opt.id ? '#2c313a' : 'transparent' }}
                    >
                        <div>
                            <span style={{ color: '#aaa', fontSize: '0.8rem', marginRight: '0.5rem' }}>#{index + 1}</span>
                            <span style={{ fontWeight: 'bold', color: expandedId === opt.id ? '#fff' : '#ccc' }}>{opt.name || opt.id}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                            {opt.id} {expandedId === opt.id ? '▼' : '▶'}
                        </div>
                    </div>
                    
                    {expandedId === opt.id && (
                        <div style={{ padding: '1rem', borderTop: '1px solid #333' }}>
                            <OptionEditor 
                                data={opt} 
                                onChange={handleUpdate} 
                                onDelete={() => handleDelete(opt.id)}
                                storyId={storyId} // <--- Pass it down
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