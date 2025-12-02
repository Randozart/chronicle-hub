'use client';

import { useState, useEffect } from 'react';
import { QualityDefinition, QualityType } from '@/engine/models';

interface Props {
    storyId: string;
    mode: 'effect' | 'condition' | 'text'; 
    onInsert: (text: string) => void;
    onClose: () => void;
}

type LogicType = 'standard' | 'source' | 'group_clear' | 'conditional_text' | 'skill_check' | 'luck';

export default function ScribeAssistant({ storyId, mode, onInsert, onClose }: Props) {
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    
    // Default based on mode
    const [logicType, setLogicType] = useState<LogicType>('standard');

    // Standard State
    const [selectedQ, setSelectedQ] = useState("");
    const [selectedCat, setSelectedCat] = useState("");
    const [operator, setOperator] = useState(mode === 'effect' ? '+=' : '>=');
    const [value, setValue] = useState("1");
    const [sourceText, setSourceText] = useState(""); 
    
    // Conditional State
    const [condTrue, setCondTrue] = useState("Text if True");
    const [condFalse, setCondFalse] = useState("Text if False");

    // Challenge State
    const [target, setTarget] = useState("10");
    const [margin, setMargin] = useState("5");
    const [showAdvancedChallenge, setShowAdvancedChallenge] = useState(false);
    const [minCap, setMinCap] = useState("0");
    const [maxCap, setMaxCap] = useState("100");
    const [pivot, setPivot] = useState("60");

    // Luck State
    const [luckChance, setLuckChance] = useState("50");

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

        switch (logicType) {
            case 'standard':
                result = mode === 'text' ? `{$${selectedQ}}` : `$${selectedQ} ${operator} ${value}`;
                break;
            case 'source':
                result = `$${selectedQ}[source:${sourceText}] ${operator} ${value}`;
                break;
            case 'group_clear':
                result = `$all[${selectedCat}] = 0`;
                break;
            case 'conditional_text':
                result = `{ $${selectedQ} ${operator} ${value} : '${condTrue}' | '${condFalse}' }`;
                break;
            case 'skill_check':
                // Construct: $stat >= Target [Margin, Min, Max, Pivot]
                // We trim trailing defaults to keep it clean
                let brackets = `[${margin}`;
                if (minCap !== "0" || maxCap !== "100" || pivot !== "60") {
                    brackets += `, ${minCap}`;
                    if (maxCap !== "100" || pivot !== "60") {
                        brackets += `, ${maxCap}`;
                        if (pivot !== "60") {
                            brackets += `, ${pivot}`;
                        }
                    }
                }
                brackets += `]`;
                if (brackets === `[${target}]`) brackets = ""; // Omit if margin == target and others are default (engine default)
                
                result = `$${selectedQ} >= ${target} ${brackets}`;
                break;
            case 'luck':
                result = `$luck <= ${luckChance}`;
                break;
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
            zIndex: 100, 
            background: '#181a1f', 
            border: '1px solid #61afef', 
            padding: '1rem', 
            borderRadius: '8px', 
            width: '340px', // Slightly wider for advanced fields
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)' 
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: '#61afef', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Scribe Assistant
                </h4>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
            </div>

            {/* TABS */}
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => setLogicType('standard')} className={`tab-btn ${logicType === 'standard' ? 'active' : ''}`}>Basic</button>
                
                {mode === 'condition' && (
                    <>
                        <button onClick={() => setLogicType('skill_check')} className={`tab-btn ${logicType === 'skill_check' ? 'active' : ''}`}>Challenge</button>
                        <button onClick={() => setLogicType('luck')} className={`tab-btn ${logicType === 'luck' ? 'active' : ''}`}>Luck</button>
                    </>
                )}
                
                {mode === 'effect' && <button onClick={() => setLogicType('source')} className={`tab-btn ${logicType === 'source' ? 'active' : ''}`}>Source</button>}
                {mode === 'effect' && <button onClick={() => setLogicType('group_clear')} className={`tab-btn ${logicType === 'group_clear' ? 'active' : ''}`}>Wipe</button>}
                {mode === 'text' && <button onClick={() => setLogicType('conditional_text')} className={`tab-btn ${logicType === 'conditional_text' ? 'active' : ''}`}>Logic</button>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                
                {/* COMMON: Quality Selector */}
                {['standard', 'skill_check', 'source', 'conditional_text'].includes(logicType) && (
                    <select className="form-select" value={selectedQ} onChange={e => setSelectedQ(e.target.value)}>
                        {visibleQualities.map(q => (
                            <option key={q.id} value={q.id}>{q.name || q.id} ({q.type})</option>
                        ))}
                    </select>
                )}

                {/* SPECIFIC FORMS */}

                {/* 1. SKILL CHECK BUILDER */}
                {logicType === 'skill_check' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div style={{ flex: 1 }}>
                                <label className="mini-label">Target (Level)</label>
                                <input className="form-input" type="number" value={target} onChange={e => setTarget(e.target.value)} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="mini-label">Margin (+/-)</label>
                                <input className="form-input" type="number" value={margin} onChange={e => setMargin(e.target.value)} />
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowAdvancedChallenge(!showAdvancedChallenge)}
                            style={{ background: 'none', border: 'none', color: '#61afef', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                        >
                            {showAdvancedChallenge ? '▼ Less' : '▶ Advanced (Caps & Curves)'}
                        </button>

                        {showAdvancedChallenge && (
                            <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <div>
                                        <label className="mini-label">Min Chance %</label>
                                        <input className="form-input" type="number" value={minCap} onChange={e => setMinCap(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="mini-label">Max Chance %</label>
                                        <input className="form-input" type="number" value={maxCap} onChange={e => setMaxCap(e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="mini-label">Pivot % (Chance at Target)</label>
                                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                        <input type="range" min="10" max="90" value={pivot} onChange={e => setPivot(e.target.value)} style={{ flex: 1 }} />
                                        <span style={{ fontSize: '0.7rem', width: '25px' }}>{pivot}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div style={{ fontSize: '0.7rem', color: '#aaa', fontStyle: 'italic' }}>
                            Preview: 0% @ {parseInt(target) - parseInt(margin)}, {pivot}% @ {target}, 100% @ {parseInt(target) + parseInt(margin)}
                        </div>
                    </div>
                )}

                {/* 2. LUCK BUILDER */}
                {logicType === 'luck' && (
                    <div>
                        <label className="mini-label" style={{display:'flex', justifyContent:'space-between'}}>
                            Success Chance <span>{luckChance}%</span>
                        </label>
                        <input 
                            type="range" min="1" max="99" value={luckChance} 
                            onChange={e => setLuckChance(e.target.value)} 
                            style={{ width: '100%', cursor: 'pointer' }} 
                        />
                        <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.5rem' }}>
                            Generates a purely random check (no stats).
                        </p>
                    </div>
                )}

                {/* 3. OTHERS (Existing) */}
                {logicType === 'group_clear' && (
                    <select className="form-select" value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                )}

                {['standard', 'source'].includes(logicType) && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select className="form-select" value={operator} onChange={e => setOperator(e.target.value)} style={{ width: '80px' }}>
                            {mode === 'condition' ? (
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
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select className="form-select" value={operator} onChange={e => setOperator(e.target.value)} style={{ width: '80px' }}>
                                <option value=">=">&gt;=</option><option value="<=">&lt;=</option><option value="==">==</option>
                            </select>
                            <input className="form-input" value={value} onChange={e => setValue(e.target.value)} placeholder="Value" />
                        </div>
                        <input className="form-input" value={condTrue} onChange={e => setCondTrue(e.target.value)} placeholder="Text if True" />
                        <input className="form-input" value={condFalse} onChange={e => setCondFalse(e.target.value)} placeholder="Text if False" />
                    </>
                )}

                <button onClick={handleInsert} className="save-btn" style={{ width: '100%', marginTop: '0.5rem' }}>
                    Insert Code
                </button>
            </div>
            
            <style styled-jsx>{`
                .tab-btn { 
                    background: #111; border: 1px solid #333; color: #888; 
                    padding: 6px 10px; border-radius: 4px; font-size: 0.7rem; 
                    font-weight: 600; cursor: pointer; transition: all 0.2s; flex: 1; text-align: center;
                }
                .tab-btn:hover { background: #222; color: #ccc; }
                .tab-btn.active { background: rgba(97, 175, 239, 0.15); border-color: #61afef; color: #61afef; }
                .mini-label { display: block; font-size: 0.7rem; color: #aaa; margin-bottom: 3px; }
            `}</style>
        </div>
    );
}