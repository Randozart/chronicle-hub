'use client';
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { QualityDefinition, QualityType } from '@/engine/models';
import ProbabilityChart from './ProbabilityChart';

// ... (Styles object remains the same) ...
const styles = {
    container: {
        position: 'absolute' as const, bottom: '100%', right: 0, marginBottom: '10px',
        zIndex: 100, background: '#181a1f', border: '1px solid #61afef', padding: '1rem', 
        borderRadius: '8px', width: '340px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
    },
    header: { display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' },
    title: { margin: 0, color: '#61afef', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' as const },
    closeBtn: { background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1rem' },
    column: { display: 'flex', flexDirection: 'column' as const, gap: '0.75rem' },
    insertBtn: { width: '100%', marginTop: '0.5rem', padding: '0.5rem', background: '#2a3e5c', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }
};

const MINI_LABEL: React.CSSProperties = { display: 'block', fontSize: '0.7rem', color: '#aaa', marginBottom: '3px' };

// Updated Types for v5
type LogicType = 'conditional' | 'variable' | 'effect' | 'batch' | 'timer' | 'chance' | 'random';

interface Props {
    storyId: string;
    mode: 'text' | 'effect' | 'condition'; 
    onInsert: (text: string) => void;
    onClose: () => void;
    initialTab?: LogicType;
}

export default function ScribeAssistant({ storyId, mode, onInsert, onClose, initialTab }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [logicType, setLogicType] = useState<LogicType>(initialTab || (mode === 'effect' ? 'effect' : 'variable'));
    
    // Data
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    
    // Form State
    const [selectedQ, setSelectedQ] = useState("");
    const [selectedCat, setSelectedCat] = useState("");
    const [operator, setOperator] = useState(mode === 'effect' ? '+=' : '>=');
    const [value, setValue] = useState("1");
    const [desc, setDesc] = useState("");
    
    // Timer State
    const [timerCmd, setTimerCmd] = useState("schedule");
    const [timeAmt, setTimeAmt] = useState("1");
    const [timeUnit, setTimeUnit] = useState("h");
    const [timerRecur, setTimerRecur] = useState(false);
    
    // Chance/Random
    const [target, setTarget] = useState("50");
    const [margin, setMargin] = useState("10");

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

    const handleInsert = () => {
        let result = "";
        
        switch (logicType) {
            case 'variable':
                // Simple read
                result = `{$${selectedQ}}`;
                break;
                
            case 'conditional':
                // { $q >= 1 : Text | Else }
                result = `{ $${selectedQ} ${operator} ${value} : 'True Text' | 'False Text' }`;
                break;
                
            case 'effect':
                // $q[desc:...] += 1
                const meta = desc ? `[desc:${desc}]` : '';
                result = `$${selectedQ}${meta} ${operator} ${value}`;
                break;
                
            case 'batch':
                // {%all[cat] -= 1}
                result = `{%all[${selectedCat}] ${operator} ${value}}`;
                break;
                
            case 'timer':
                // {%schedule[$q+=1 : 1h; recur, desc:...]}
                const tEffect = `$${selectedQ} ${operator} ${value}`;
                const tTime = `${timeAmt}${timeUnit}`;
                let tMods = [];
                if (timerRecur) tMods.push('recur');
                if (desc) tMods.push(`desc:${desc}`);
                const tModStr = tMods.length > 0 ? `; ${tMods.join(', ')}` : '';
                
                result = `{%${timerCmd}[${tEffect} : ${tTime}${tModStr}]}`;
                break;
                
            case 'chance':
                // {%chance[$q >> 50; margin:10]}
                result = `{%chance[$${selectedQ} >> ${target}; margin:${margin}]}`;
                break;
                
            case 'random':
                // {%random[50]}
                result = `{%random[${target}]}`;
                break;
        }
        
        onInsert(result);
        onClose();
    };

    const TabButton = ({ type, label }: { type: LogicType, label: string }) => (
        <button 
            onClick={() => setLogicType(type)} 
            style={{ 
                background: logicType === type ? 'rgba(97, 175, 239, 0.15)' : '#21252b',
                borderColor: logicType === type ? '#61afef' : '#333',
                color: logicType === type ? '#61afef' : '#888',
                border: '1px solid', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer'
            }}
        >
            {label}
        </button>
    );

    return (
        <div ref={containerRef} style={styles.container}>
            <div style={styles.header}>
                <h4 style={styles.title}>Scribe Assistant v5</h4>
                <button onClick={onClose} style={styles.closeBtn}>✕</button>
            </div>

            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {mode === 'text' && <>
                    <TabButton type="variable" label="Variable" />
                    <TabButton type="conditional" label="Conditional" />
                </>}
                {mode === 'condition' && <>
                    <TabButton type="chance" label="%Chance" />
                    <TabButton type="random" label="%Random" />
                </>}
                {mode === 'effect' && <>
                    <TabButton type="effect" label="Effect" />
                    <TabButton type="batch" label="Batch" />
                    <TabButton type="timer" label="Timer" />
                </>}
            </div>

            <div style={styles.column}>
                {/* QUALITY SELECTOR */}
                {['variable', 'conditional', 'effect', 'timer', 'chance'].includes(logicType) && (
                    <div>
                        <label style={MINI_LABEL}>Target Quality</label>
                        <select className="form-select" value={selectedQ} onChange={e => setSelectedQ(e.target.value)}>
                            {qualities.map(q => <option key={q.id} value={q.id}>{q.name || q.id} ({q.type})</option>)}
                        </select>
                    </div>
                )}
                
                {/* CATEGORY SELECTOR */}
                {logicType === 'batch' && (
                    <div>
                        <label style={MINI_LABEL}>Target Category</label>
                        <select className="form-select" value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                )}

                {/* OPERATOR & VALUE */}
                {['conditional', 'effect', 'batch', 'timer'].includes(logicType) && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{width: '70px'}}>
                            <label style={MINI_LABEL}>Op</label>
                            <select className="form-select" value={operator} onChange={e => setOperator(e.target.value)}>
                                {mode === 'condition' || logicType === 'conditional' 
                                    ? <><option value="==">==</option><option value=">">&gt;</option><option value="<">&lt;</option></> 
                                    : <><option value="+=">+=</option><option value="-=">-=</option><option value="=">=</option></>}
                            </select>
                        </div>
                        <div style={{flex:1}}>
                            <label style={MINI_LABEL}>Value</label>
                            <input className="form-input" value={value} onChange={e => setValue(e.target.value)} />
                        </div>
                    </div>
                )}

                {/* CHANCE / RANDOM SETTINGS */}
                {['chance', 'random'].includes(logicType) && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{flex:1}}>
                            <label style={MINI_LABEL}>{logicType === 'chance' ? 'Difficulty' : 'Probability'}</label>
                            <input type="range" min="0" max="100" value={target} onChange={e => setTarget(e.target.value)} style={{width: '100%'}} />
                            <div style={{textAlign:'center', fontSize:'0.8rem'}}>{target}</div>
                        </div>
                        {logicType === 'chance' && (
                            <div style={{flex:1}}>
                                <label style={MINI_LABEL}>Margin</label>
                                <input className="form-input" type="number" value={margin} onChange={e => setMargin(e.target.value)} />
                            </div>
                        )}
                    </div>
                )}

                {/* TIMER SETTINGS */}
                {logicType === 'timer' && (
                    <>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select className="form-select" value={timerCmd} onChange={e => setTimerCmd(e.target.value)}>
                                <option value="schedule">Schedule</option>
                                <option value="reset">Reset</option>
                            </select>
                            <input className="form-input" type="number" value={timeAmt} onChange={e => setTimeAmt(e.target.value)} style={{width: '60px'}} />
                            <select className="form-select" value={timeUnit} onChange={e => setTimeUnit(e.target.value)} style={{width: '60px'}}>
                                <option value="m">Min</option><option value="h">Hr</option><option value="d">Day</option>
                            </select>
                        </div>
                        <label className="toggle-label" style={{fontSize: '0.8rem'}}>
                            <input type="checkbox" checked={timerRecur} onChange={e => setTimerRecur(e.target.checked)} /> Recurring?
                        </label>
                    </>
                )}

                {/* DESCRIPTION */}
                {['effect', 'timer'].includes(logicType) && (
                    <div>
                        <label style={MINI_LABEL}>Description (Optional)</label>
                        <input className="form-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Custom feedback text..." />
                    </div>
                )}

                <button onClick={handleInsert} style={styles.insertBtn}>Insert</button>
            </div>
        </div>
    );
}