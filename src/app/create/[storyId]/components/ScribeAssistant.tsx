'use client';

import { useState, useEffect } from 'react';

interface Props {
    storyId: string;
    mode: 'effect' | 'condition' | 'text'; // What are we building?
    onInsert: (text: string) => void;
    onClose: () => void;
}

export default function ScribeAssistant({ storyId, mode, onInsert, onClose }: Props) {
    const [qualities, setQualities] = useState<any[]>([]);
    const [selectedQ, setSelectedQ] = useState("");
    const [operator, setOperator] = useState(mode === 'effect' ? '+=' : '>=');
    const [value, setValue] = useState("1");
    
    // Fetch qualities so the dropdown is populated
    useEffect(() => {
        fetch(`/api/admin/qualities?storyId=${storyId}`)
            .then(r => r.json())
            .then(data => {
                const list = Object.values(data);
                setQualities(list as any[]);
                if (list.length > 0) setSelectedQ((list[0] as any).id);
            });
    }, [storyId]);

    const handleInsert = () => {
        if (!selectedQ) return;
        
        let result = "";
        
        if (mode === 'text') {
            // Interpolation: {$gold}
            result = `{$${selectedQ}}`;
        } else if (mode === 'condition') {
            // Requirement: $gold >= 10
            result = `$${selectedQ} ${operator} ${value}`;
        } else {
            // Effect: $gold += 10
            result = `$${selectedQ} ${operator} ${value}`;
        }
        
        onInsert(result);
        onClose();
    };

    return (
        <div style={{ position: 'absolute', zIndex: 50, background: '#1e2127', border: '1px solid #61afef', padding: '1rem', borderRadius: '8px', width: '300px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h4 style={{ marginTop: 0, color: '#61afef', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                Insert {mode}
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <select className="form-select" value={selectedQ} onChange={e => setSelectedQ(e.target.value)}>
                    {qualities.map(q => (
                        <option key={q.id} value={q.id}>{q.name} ({q.id})</option>
                    ))}
                </select>

                {mode !== 'text' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select className="form-select" value={operator} onChange={e => setOperator(e.target.value)} style={{ width: '80px' }}>
                            {mode === 'condition' ? (
                                <>
                                    <option value=">=">&gt;=</option>
                                    <option value="<=">&lt;=</option>
                                    <option value="==">==</option>
                                    <option value="!=">!=</option>
                                    <option value=">">&gt;</option>
                                    <option value="<">&lt;</option>
                                </>
                            ) : (
                                <>
                                    <option value="+=">+= (Add)</option>
                                    <option value="-=">-= (Sub)</option>
                                    <option value="=">= (Set)</option>
                                    <option value="++">++ (Inc)</option>
                                </>
                            )}
                        </select>
                        <input 
                            className="form-input" 
                            value={value} 
                            onChange={e => setValue(e.target.value)}
                            placeholder="Value"
                        />
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button onClick={onClose} className="unequip-btn" style={{ padding: '0.4rem' }}>Cancel</button>
                    <button onClick={handleInsert} className="save-btn" style={{ padding: '0.4rem', width: '100%' }}>Insert</button>
                </div>
            </div>
        </div>
    );
}