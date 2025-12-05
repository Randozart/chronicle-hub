'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { QualityDefinition, QualityType } from '@/engine/models';
import ProbabilityChart from './ProbabilityChart';

// --- STYLES (Fixes the console error) ---
const styles = {
    container: {
        position: 'absolute' as const, 
        bottom: '100%', 
        right: 0, 
        marginBottom: '10px',
        zIndex: 100, 
        background: '#181a1f', 
        border: '1px solid #61afef', 
        padding: '1rem', 
        borderRadius: '8px', 
        width: '340px', 
        boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
    },
    header: {
        display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center'
    },
    title: {
        margin: 0, color: '#61afef', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' as const
    },
    closeBtn: {
        background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1rem'
    },
    tabRow: {
        marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const
    },
    tabBtn: {
        background: '#21252b',
        border: '1px solid #333',
        color: '#888',
        padding: '4px 12px',
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: 600,
        cursor: 'pointer',
        flex: 1,
        textAlign: 'center' as const
    },
    tabBtnActive: {
        background: 'rgba(97, 175, 239, 0.15)',
        borderColor: '#61afef',
        color: '#61afef'
    },
    column: {
        display: 'flex', flexDirection: 'column' as const, gap: '0.75rem'
    },
    miniLabel: {
        display: 'block', fontSize: '0.7rem', color: '#aaa', marginBottom: '3px'
    },
    insertBtn: {
        width: '100%', marginTop: '0.5rem', padding: '0.5rem',
        background: '#2a3e5c', color: 'white', border: 'none',
        borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer'
    }
};

interface Props {
    storyId: string;
    mode: 'text' | 'effect' | 'condition'; 
    onInsert: (text: string) => void;
    onClose: () => void;
    initialTab?: LogicType; // Updated Type
}

type LogicType = 'conditional_text' | 'standard' | 'source' | 'group_clear' | 'skill_check' | 'luck' | 'timer';

const TAB_BTN: React.CSSProperties = {
    background: '#21252b',
    border: '1px solid #333',
    color: '#888',
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    flex: 1,
    textAlign: 'center'
};

const TAB_BTN_ACTIVE: React.CSSProperties = {
    ...TAB_BTN,
    background: 'rgba(97, 175, 239, 0.15)',
    borderColor: '#61afef',
    color: '#61afef'
};

const MINI_LABEL: React.CSSProperties = {
    display: 'block', fontSize: '0.7rem', color: '#aaa', marginBottom: '3px'
};

export default function ScribeAssistant({ storyId, mode, onInsert, onClose, initialTab }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [placement, setPlacement] = useState<'top' | 'bottom'>('top');

    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    
    const [logicType, setLogicType] = useState<LogicType>(initialTab || 'standard');

    // Form State
    const [selectedQ, setSelectedQ] = useState("");
    const [selectedCat, setSelectedCat] = useState("");
    const [operator, setOperator] = useState(mode === 'effect' ? '+=' : '>=');
    const [value, setValue] = useState("1");
    const [sourceText, setSourceText] = useState(""); 
    const [condTrue, setCondTrue] = useState("Text if True");
    const [condFalse, setCondFalse] = useState("Text if False");

    // Challenge State
    const [target, setTarget] = useState("10");
    const [margin, setMargin] = useState("5");
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [minCap, setMinCap] = useState("0");
    const [maxCap, setMaxCap] = useState("100");
    const [pivot, setPivot] = useState("60");
    const [luckChance, setLuckChance] = useState("50");

    // Timer State (Living Stories)
    const [timeAmount, setTimeAmount] = useState("4");
    const [timeUnit, setTimeUnit] = useState("h");
    
    useLayoutEffect(() => {
        if (containerRef.current) {
            const parentRect = containerRef.current.parentElement?.getBoundingClientRect();
            if (parentRect && parentRect.top < 500) setPlacement('bottom');
            else setPlacement('top');
        }
    }, []);

    useEffect(() => {
        fetch(`/api/admin/qualities?storyId=${storyId}`).then(r => r.json()).then(data => {
            const list = Object.values(data) as QualityDefinition[];
            setQualities(list);
            if (list.length > 0) setSelectedQ(list[0].id);
            const cats = new Set<string>();
            list.forEach(q => { if (q.category) q.category.split(',').forEach(c => cats.add(c.trim())); });
            setCategories(Array.from(cats));
            if (Array.from(cats).length > 0) setSelectedCat(Array.from(cats)[0]);
        });
    }, [storyId]);

    const visibleQualities = logicType === 'source' ? qualities.filter(q => q.type === QualityType.Item) : qualities;

    useEffect(() => {
        if (visibleQualities.length > 0 && !visibleQualities.find(q => q.id === selectedQ)) {
            setSelectedQ(visibleQualities[0].id);
        }
    }, [logicType, visibleQualities]);

    const handleInsert = () => {
        let result = "";
        switch (logicType) {
            case 'standard':
                // FIX: Handle boolean check vs text interpolation
                result = mode === 'text' ? `{$${selectedQ}}` : `$${selectedQ} ${operator} ${value}`;
                break;
            case 'source': result = `$${selectedQ}[source:${sourceText}] ${operator} ${value}`; break;
            case 'group_clear': result = `$all[${selectedCat}] = 0`; break;
            case 'conditional_text': result = `{ $${selectedQ} ${operator} ${value} : '${condTrue}' | '${condFalse}' }`; break;
            case 'skill_check':
                let brackets = `[${margin}`;
                if (minCap !== "0" || maxCap !== "100" || pivot !== "60") {
                    brackets += `, ${minCap}`;
                    if (maxCap !== "100" || pivot !== "60") {
                        brackets += `, ${maxCap}`;
                        if (pivot !== "60") brackets += `, ${pivot}`;
                    }
                }
                brackets += `]`;
                if (brackets === `[${target}]`) brackets = ""; 
                result = `$${selectedQ} >> ${target} ${brackets}`; // Updated operator
                break;
            case 'luck': result = `$luck <= ${luckChance}`; break;
            case 'timer': result = `$schedule[$${selectedQ} ${operator} ${value} : ${timeAmount}${timeUnit}]`; break;
        }
        onInsert(result);
        onClose();
    };

    const TabButton = ({ type, label }: { type: LogicType, label: string }) => (
        <button 
            onClick={() => setLogicType(type)} 
            style={logicType === type ? TAB_BTN_ACTIVE : TAB_BTN}
        >
            {label}
        </button>
    );
    
    const containerStyle: React.CSSProperties = {
        position: 'absolute',
        right: 0,
        zIndex: 100,
        background: '#181a1f',
        border: '1px solid #61afef',
        padding: '1rem',
        borderRadius: '8px',
        width: '340px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
        
        // Dynamic Positioning
        ...(placement === 'top' ? {
            bottom: '100%',
            marginBottom: '10px'
        } : {
            top: '100%',
            marginTop: '10px'
        })
    };

    return (
        <div ref={containerRef} style={containerStyle}>
            <div style={styles.header}>
                <h4 style={styles.title}>Scribe Assistant</h4>
                <button onClick={onClose} style={styles.closeBtn}>✕</button>
            </div>

            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {/* TEXT MODE */}
                <TabButton type="conditional_text" label="Conditional" />
                {mode === 'text' && <TabButton type="standard" label="Variable" />}

                {/* CONDITION MODE */}
                {mode === 'condition' && (
                    <>
                        {/* FIX: Added Standard back for Conditions (renamed Compare) */}
                        <TabButton type="skill_check" label="Challenge" />
                        <TabButton type="luck" label="Luck" />
                    </>
                )}
                
                {/* EFFECT MODE */}
                {mode === 'effect' && (
                    <>
                        <TabButton type="standard" label="Basic" />
                        <TabButton type="group_clear" label="Batch" />
                        <TabButton type="source" label="Source" />
                        <TabButton type="timer" label="Timer" />
                    </>
                )}
            </div>

            <div style={styles.column}>
                
                {/* QUALITY SELECTOR */}
                {logicType !== 'group_clear' && logicType !== 'luck' && (
                    <select className="form-select" value={selectedQ} onChange={e => setSelectedQ(e.target.value)}>
                        {visibleQualities.map(q => <option key={q.id} value={q.id}>{q.name || q.id} ({q.type})</option>)}
                    </select>
                )}
                
                {/* 1. SKILL CHECK */}
                {logicType === 'skill_check' && (
                    <div style={styles.column}>
                        <ProbabilityChart operator={operator} target={parseInt(target)||0} margin={parseInt(margin)||0} minCap={parseInt(minCap)||0} maxCap={parseInt(maxCap)||100} pivot={parseInt(pivot)||60} />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div style={{ width: '70px' }}>
                                <label style={MINI_LABEL}>Type</label>
                                <select className="form-select" value={operator} onChange={e => setOperator(e.target.value)} style={{ padding: '5px 2px' }}>
                                    <option value=">>">{">>"}</option>
                                    <option value="<<">{"<<"}</option>
                                    <option value="==">{"=="}</option>
                                    <option value="!=">{"!="}</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}><label style={MINI_LABEL}>Target</label><input className="form-input" type="number" value={target} onChange={e => setTarget(e.target.value)} /></div>
                            <div style={{ flex: 1 }}><label style={MINI_LABEL}>Margin</label><input className="form-input" type="number" value={margin} onChange={e => setMargin(e.target.value)} /></div>
                        </div>
                        <button onClick={() => setShowAdvanced(!showAdvanced)} style={{ background: 'none', border: 'none', color: '#61afef', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'left', padding: 0 }}>{showAdvanced ? '▼ Less' : '▶ Advanced'}</button>
                        {showAdvanced && (
                            <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <div><label style={MINI_LABEL}>Min %</label><input className="form-input" type="number" value={minCap} onChange={e => setMinCap(e.target.value)} /></div>
                                    <div><label style={MINI_LABEL}>Max %</label><input className="form-input" type="number" value={maxCap} onChange={e => setMaxCap(e.target.value)} /></div>
                                </div>
                                <div><label style={{...MINI_LABEL, display:'flex', justifyContent:'space-between'}}>Pivot % <span>{pivot}</span></label><input type="range" min="10" max="90" value={pivot} onChange={e => setPivot(e.target.value)} style={{ width: '100%' }} /></div>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. LUCK */}
                {logicType === 'luck' && (
                    <div><label style={{ ...MINI_LABEL, display: 'flex', justifyContent: 'space-between' }}>Success Chance <span>{luckChance}%</span></label><input type="range" min="1" max="99" value={luckChance} onChange={e => setLuckChance(e.target.value)} style={{ width: '100%' }} /></div>
                )}

                {/* 3. BATCH */}
                {logicType === 'group_clear' && (
                    <select className="form-select" value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                )}

                {/* 4. STANDARD & TIMER */}
                {['standard', 'source', 'timer'].includes(logicType) && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select className="form-select" value={operator} onChange={e => setOperator(e.target.value)} style={{ width: '80px' }}>
                            {mode === 'condition' ? <><option value=">=">&gt;=</option><option value="<=">&lt;=</option><option value="==">==</option><option value="!=">!=</option><option value=">">&gt;</option><option value="<">&lt;</option></> : <><option value="+=">+=</option><option value="-=">-=</option><option value="=">=</option><option value="++">++</option></>}
                        </select>
                        <input className="form-input" value={value} onChange={e => setValue(e.target.value)} placeholder="Value" />
                    </div>
                )}

                {/* TIMER */}
                {logicType === 'timer' && <div style={{ display: 'flex', gap: '0.5rem' }}><div style={{ flex: 1 }}><label style={MINI_LABEL}>Duration</label><input className="form-input" type="number" value={timeAmount} onChange={e => setTimeAmount(e.target.value)} /></div><div style={{ width: '80px' }}><label style={MINI_LABEL}>Unit</label><select className="form-select" value={timeUnit} onChange={e => setTimeUnit(e.target.value)}><option value="m">Mins</option><option value="h">Hours</option><option value="d">Days</option></select></div></div>}

                {/* SOURCE */}
                {logicType === 'source' && <input className="form-input" value={sourceText} onChange={e => setSourceText(e.target.value)} placeholder="Source (e.g. Cave)" />}

                {/* CONDITIONAL TEXT */}
                {logicType === 'conditional_text' && <><div style={{ display: 'flex', gap: '0.5rem' }}><select className="form-select" value={operator} onChange={e => setOperator(e.target.value)} style={{ width: '80px' }}><option value=">=">&gt;=</option><option value="<=">&lt;=</option><option value="==">==</option></select><input className="form-input" value={value} onChange={e => setValue(e.target.value)} placeholder="Value" /></div><input className="form-input" value={condTrue} onChange={e => setCondTrue(e.target.value)} placeholder="Text if True" /><input className="form-input" value={condFalse} onChange={e => setCondFalse(e.target.value)} placeholder="Text if False" /></>}

                <button onClick={handleInsert} style={styles.insertBtn}>Insert Code</button>
            </div>
        </div>
    );
}