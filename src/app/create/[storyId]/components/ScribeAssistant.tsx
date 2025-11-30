'use client';

import { useState, useEffect } from 'react';
import { QualityDefinition, QualityType } from '@/engine/models';

interface Props {
    storyId: string;
    mode: 'effect' | 'condition' | 'text'; 
    onInsert: (text: string) => void;
    onClose: () => void;
}

type LogicType = 'standard' | 'source' | 'group_clear' | 'conditional_text';

export default function ScribeAssistant({ storyId, mode, onInsert, onClose }: Props) {
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    
    const [logicType, setLogicType] = useState<LogicType>('standard');
    const [selectedQ, setSelectedQ] = useState("");
    const [selectedCat, setSelectedCat] = useState("");
    const [operator, setOperator] = useState(mode === 'effect' ? '+=' : '>=');
    const [value, setValue] = useState("1");
    const [sourceText, setSourceText] = useState(""); 
    
    const [condTrue, setCondTrue] = useState("Text if True");
    const [condFalse, setCondFalse] = useState("Text if False");

    useEffect(() => {
        fetch(`/api/admin/qualities?storyId=${storyId}`)
            .then(r => r.json())
            .then(data => {
                const list = Object.values(data) as QualityDefinition[];
                setQualities(list);
                if (list.length > 0) setSelectedQ(list[0].id);
                
                const cats = new Set<string>();
                list.forEach(q => {
                    if (q.category) q.category.split(',').forEach(c => cats.add(c.trim()));
                });
                const catList = Array.from(cats);
                setCategories(catList);
                if (catList.length > 0) setSelectedCat(catList[0]);
            });
    }, [storyId]);

    const visibleQualities = logicType === 'source' 
        ? qualities.filter(q => q.type === QualityType.Item)
        : qualities;

    useEffect(() => {
        if (visibleQualities.length > 0 && !visibleQualities.find(q => q.id === selectedQ)) {
            setSelectedQ(visibleQualities[0].id);
        }
    }, [logicType, visibleQualities]);

    const handleInsert = () => {
        let result = "";

        if (logicType === 'standard') {
            result = mode === 'text' ? `{$${selectedQ}}` : `$${selectedQ} ${operator} ${value}`;
        } else if (logicType === 'source') {
            result = `$${selectedQ}[source:${sourceText}] ${operator} ${value}`;
        } else if (logicType === 'group_clear') {
            result = `$all[${selectedCat}] = 0`;
        } else if (logicType === 'conditional_text') {
            result = `{ $${selectedQ} ${operator} ${value} : '${condTrue}' | '${condFalse}' }`;
        }
        
        onInsert(result);
        onClose();
    };

    return (
        <div style={{ 
            position: 'absolute', 
            bottom: '100%', 
            right: 0, 
            marginBottom: '10px',
            zIndex: 100, // Higher Z-Index to float above everything
            background: '#181a1f', 
            border: '1px solid #61afef', 
            padding: '1rem', 
            borderRadius: '8px', 
            width: '320px', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)' 
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: '#61afef', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Scribe Assistant
                </h4>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
            </div>

            {/* BETTER BUTTON STYLES */}
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => setLogicType('standard')} className={`tab-btn ${logicType === 'standard' ? 'active' : ''}`}>Basic</button>
                {mode === 'effect' && <button onClick={() => setLogicType('source')} className={`tab-btn ${logicType === 'source' ? 'active' : ''}`}>Source</button>}
                {mode === 'effect' && <button onClick={() => setLogicType('group_clear')} className={`tab-btn ${logicType === 'group_clear' ? 'active' : ''}`}>Wipe</button>}
                {mode === 'text' && <button onClick={() => setLogicType('conditional_text')} className={`tab-btn ${logicType === 'conditional_text' ? 'active' : ''}`}>Logic</button>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {logicType !== 'group_clear' && (
                    <select className="form-select" value={selectedQ} onChange={e => setSelectedQ(e.target.value)}>
                        {visibleQualities.map(q => (
                            <option key={q.id} value={q.id}>{q.name || q.id} ({q.type})</option>
                        ))}
                    </select>
                )}

                {logicType === 'group_clear' && (
                    <select className="form-select" value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                )}

                {logicType !== 'group_clear' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select className="form-select" value={operator} onChange={e => setOperator(e.target.value)} style={{ width: '80px' }}>
                            {mode === 'condition' || logicType === 'conditional_text' ? (
                                <><option value=">=">&gt;=</option><option value="<=">&lt;=</option><option value="==">==</option><option value="!=">!=</option><option value=">">&gt;</option><option value="<">&lt;</option></>
                            ) : (
                                <><option value="+=">+=</option><option value="-=">-=</option><option value="=">=</option><option value="++">++</option></>
                            )}
                        </select>
                        <input className="form-input" value={value} onChange={e => setValue(e.target.value)} placeholder="Value" />
                    </div>
                )}

                {logicType === 'source' && (
                    <input className="form-input" value={sourceText} onChange={e => setSourceText(e.target.value)} placeholder="Source (e.g. Found in Cave)" />
                )}

                {logicType === 'conditional_text' && (
                    <>
                        <input className="form-input" value={condTrue} onChange={e => setCondTrue(e.target.value)} placeholder="Text if True" />
                        <input className="form-input" value={condFalse} onChange={e => setCondFalse(e.target.value)} placeholder="Text if False" />
                    </>
                )}

                <button onClick={handleInsert} className="save-btn" style={{ width: '100%', marginTop: '0.5rem' }}>Insert</button>
            </div>
            
            <style jsx>{`
                .tab-btn { 
                    background: #111; 
                    border: 1px solid #333; 
                    color: #888; 
                    padding: 6px 12px; 
                    border-radius: 6px; 
                    font-size: 0.75rem; 
                    font-weight: 600;
                    cursor: pointer; 
                    transition: all 0.2s;
                    flex: 1;
                    text-align: center;
                }
                .tab-btn:hover {
                    background: #222;
                    color: #ccc;
                    border-color: #555;
                }
                .tab-btn.active { 
                    background: rgba(97, 175, 239, 0.15); 
                    border-color: #61afef; 
                    color: #61afef; 
                    box-shadow: 0 0 10px rgba(97, 175, 239, 0.1);
                }
            `}</style>
        </div>
    );
}