// src/components/admin/ScribeAssistant.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { QualityDefinition } from '@/engine/models';
import ProbabilityChart from './ProbabilityChart'; 

const styles = {
    // ... (Keep existing styles)
    container: {
        position: 'absolute' as const, bottom: '100%', right: 0, marginBottom: '10px',
        zIndex: 100, background: '#181a1f', border: '1px solid #61afef', padding: '1rem', 
        borderRadius: '8px', width: '380px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
    },
    insertBtn: { width: '100%', marginTop: '0.5rem', padding: '0.5rem', background: '#2a3e5c', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }
};

const MINI_LABEL: React.CSSProperties = { display: 'block', fontSize: '0.7rem', color: '#aaa', marginBottom: '3px' };

// Added 'collections'
type LogicType = 'variable' | 'conditional' | 'challenge' | 'random' | 'effect' | 'timer' | 'batch' | 'collections';

interface Props {
    storyId: string;
    mode: 'text' | 'effect' | 'condition'; 
    onInsert: (text: string) => void;
    onClose: () => void;
    initialTab?: LogicType;
}

export default function ScribeAssistant({ storyId, mode, onInsert, onClose, initialTab }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    
    // --- DRAG & RESIZE STATE ---
    const [position, setPosition] = useState({ x: window.innerWidth / 2 - 200, y: 100 });
    const [size, setSize] = useState({ width: 400, height: 'auto' as number | 'auto' });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // --- LOGIC STATE ---
    const getDefaultTab = (): LogicType => {
        if (mode === 'effect') return 'effect';
        if (mode === 'condition') return 'conditional';
        return 'variable';
    };
    const [logicType, setLogicType] = useState<LogicType>(initialTab || getDefaultTab());
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    
    // Form Inputs
    const [selectedQ, setSelectedQ] = useState("");
    const [scope, setScope] = useState("$"); 
    const [property, setProperty] = useState(""); 
    
    // NEW: Variable Assignment Logic
    const [isAssignment, setIsAssignment] = useState(false);
    const [assignAlias, setAssignAlias] = useState("");

    const [operator, setOperator] = useState(mode === 'effect' ? '+=' : '>=');
    const [value, setValue] = useState("1");
    const [desc, setDesc] = useState("");
    const [source, setSource] = useState("");
    
    // Challenge Inputs
    const [chalOp, setChalOp] = useState(">>");
    const [target, setTarget] = useState("50");
    const [margin, setMargin] = useState("10"); 
    const [pivot, setPivot] = useState("60");   
    const [minCap, setMinCap] = useState("0");
    const [maxCap, setMaxCap] = useState("100");
    const [chalOutput, setChalOutput] = useState<'number' | 'bool' | 'macro'>('number');

    // Timer Inputs
    const [timerCmd, setTimerCmd] = useState("schedule");
    const [timeAmt, setTimeAmt] = useState("1");
    const [timeUnit, setTimeUnit] = useState("h");
    const [selectedCat, setSelectedCat] = useState("");

    // NEW: Collection Inputs
    const [colCmd, setColCmd] = useState("pick");
    const [colCount, setColCount] = useState("1");
    const [colFilter, setColFilter] = useState("");
    const [colSep, setColSep] = useState("comma");

    // Load Data
    useEffect(() => {
        fetch(`/api/admin/qualities?storyId=${storyId}`).then(r => r.json()).then(data => {
            const list = Object.values(data) as QualityDefinition[];
            list.sort((a, b) => (a.category === 'system' ? -1 : 1));
            setQualities(list);
            if (list.length > 0) setSelectedQ(list[0].id);
            const cats = new Set<string>();
            list.forEach(q => { if (q.category) q.category.split(',').forEach(c => cats.add(c.trim())); });
            setCategories(Array.from(cats).sort());
            if (Array.from(cats).length > 0) setSelectedCat(Array.from(cats)[0]);
        });
    }, [storyId]);

    // --- DRAG HANDLERS (Unchanged) ---
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
            } else if (isResizing && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setSize({ width: Math.max(300, e.clientX - rect.left), height: 'auto' });
            }
        };
        const handleMouseUp = () => { setIsDragging(false); setIsResizing(false); };
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }, [isDragging, isResizing, dragOffset]);

    const onMouseDownHeader = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    // --- INSERTION LOGIC ---
    const handleInsert = () => {
        let result = "";
        const qTag = `${scope}${selectedQ}`;
        const propSuffix = property ? `.${property}` : '';

        switch (logicType) {
            case 'variable':
                // Check if user wants assignment: {@alias = $quality}
                if (isAssignment && assignAlias) {
                    result = `{@${assignAlias} = ${qTag}${propSuffix}}`;
                } else {
                    result = `{${qTag}${propSuffix}}`;
                }
                break;
            case 'conditional':
                if (mode === 'condition') {
                    result = `${qTag}${propSuffix} ${operator} ${value}`;
                } else {
                    result = `{ ${qTag}${propSuffix} ${operator} ${value} : 'True' | 'False' }`;
                }
                break;
            case 'challenge':
                const args: string[] = [];
                if (margin || pivot || minCap !== "0" || maxCap !== "100") {
                    args.push(margin || "0"); 
                    if (minCap !== "0" || maxCap !== "100" || pivot) {
                        args.push(minCap || "0");
                        args.push(maxCap || "100");
                        if (pivot) args.push(pivot);
                    }
                }
                const argsStr = args.length > 0 ? ` ; ${args.join(', ')}` : '';
                const expr = `${qTag} ${chalOp} ${target}${argsStr}`;
                
                if (chalOutput === 'bool') result = `{ ${expr} }%`;
                else if (chalOutput === 'macro') result = `{%chance[${expr}]}`;
                else result = `{ ${expr} }`;
                break;
            case 'random':
                if (operator === '~') result = `{ 1 ~ 100 }`;
                else if (operator === '|') result = `{ Option A | Option B }`;
                else {
                    const invert = desc === 'invert' ? ' ; invert' : '';
                    result = `{%random[${value}${invert}]}`;
                }
                break;
            case 'effect':
                const metas: string[] = [];
                if (desc) metas.push(`desc:${desc}`);
                if (source) metas.push(`source:${source}`);
                const metaStr = metas.length > 0 ? `[${metas.join(', ')}]` : '';
                result = `${qTag}${metaStr} ${operator} ${value}`;
                break;
            case 'batch':
                result = `{%all[${selectedCat}]} ${operator} ${value}`;
                break;
            case 'timer':
                const tEffect = `${qTag} ${operator} ${value}`;
                const tTime = `${timeAmt}${timeUnit}`;
                result = `{%${timerCmd}[${tEffect} : ${tTime}]}`;
                break;
            // NEW: COLLECTIONS
            case 'collections':
                const colArgs: string[] = [selectedCat]; // Required
                const colOpts: string[] = []; // Optional
                
                if (colCmd === 'pick') {
                    colOpts.push(colCount);
                    if (colFilter) colOpts.push(colFilter);
                } else if (colCmd === 'roll') {
                    if (colFilter) colOpts.push(colFilter);
                } else if (colCmd === 'list') {
                    colOpts.push(colSep);
                    if (colFilter) colOpts.push(colFilter);
                }
                
                const optStr = colOpts.length > 0 ? ` ; ${colOpts.join(', ')}` : '';
                result = `{%${colCmd}[${colArgs.join('')}${optStr}]}`;
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

    const showTab = (t: LogicType) => {
        if (mode === 'effect') return ['effect', 'timer', 'batch'].includes(t);
        // Include 'collections' in text mode
        return ['variable', 'conditional', 'challenge', 'random', 'collections'].includes(t);
    };

    return (
        <div 
            ref={containerRef} 
            style={{
                position: 'fixed', left: position.x, top: position.y, width: size.width,
                zIndex: 9999, background: '#181a1f', border: '1px solid #61afef',
                borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                display: 'flex', flexDirection: 'column'
            }}
        >
            {/* HEADER (Draggable) */}
            <div 
                onMouseDown={onMouseDownHeader}
                style={{ 
                    display: 'flex', justifyContent: 'space-between', padding: '1rem', 
                    alignItems: 'center', cursor: 'grab', background: 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid #333', borderRadius: '8px 8px 0 0'
                }}
            >
                <h4 style={{ margin: 0, color: '#61afef', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', pointerEvents: 'none' }}>
                    Scribe Assistant v6.1
                </h4>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
            </div>

            <div style={{ padding: '1rem' }}>
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {showTab('variable') && <TabButton type="variable" label="Variable" />}
                    {showTab('conditional') && <TabButton type="conditional" label="If/Else" />}
                    {showTab('challenge') && <TabButton type="challenge" label="Challenge" />}
                    {showTab('collections') && <TabButton type="collections" label="Lists" />}
                    {showTab('random') && <TabButton type="random" label="Random" />}
                    {showTab('effect') && <TabButton type="effect" label="Effect" />}
                    {showTab('batch') && <TabButton type="batch" label="Batch" />}
                    {showTab('timer') && <TabButton type="timer" label="Timer" />}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    
                    {/* --- TARGET SELECTION --- */}
                    {['variable', 'conditional', 'challenge', 'effect', 'timer'].includes(logicType) && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div style={{ width: '90px' }}>
                                <label style={MINI_LABEL}>Scope</label>
                                <select className="form-select" value={scope} onChange={e => setScope(e.target.value)} style={{ padding: '2px' }}>
                                    <option value="$">$ Local</option>
                                    <option value="#"># World</option>
                                    <option value="$.">$. Self</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={MINI_LABEL}>Quality</label>
                                <select className="form-select" value={selectedQ} onChange={e => setSelectedQ(e.target.value)}>
                                    {qualities.map(q => <option key={q.id} value={q.id}>{q.name || q.id} ({q.type})</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* --- CHALLENGE UI (Unchanged) --- */}
                    {logicType === 'challenge' && (
                        <>
                             {/* ... (Keep existing chart and inputs) ... */}
                             <div style={{ marginBottom: '0.5rem', border: '1px solid #333', borderRadius: '4px', overflow: 'hidden' }}>
                                <ProbabilityChart operator={chalOp} target={parseInt(target)||50} margin={parseInt(margin)||0} minCap={parseInt(minCap)||0} maxCap={parseInt(maxCap)||100} pivot={parseInt(pivot)||60} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <div style={{ width: '120px' }}>
                                    <label style={MINI_LABEL}>Op</label>
                                    <select className="form-select" value={chalOp} onChange={e => setChalOp(e.target.value)}>
                                        <option value=">>">{">>"} High</option>
                                        <option value="<<">{"<<"} Low</option>
                                        <option value="><">{"><"} Exact</option>
                                        <option value="<>">{"<>"} Avoid</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={MINI_LABEL}>Target</label>
                                    <input className="form-input" value={target} onChange={e => setTarget(e.target.value)} placeholder="50" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <div><label style={MINI_LABEL}>Margin</label><input className="form-input" value={margin} onChange={e => setMargin(e.target.value)} placeholder="10" /></div>
                                <div><label style={MINI_LABEL}>Pivot</label><input className="form-input" value={pivot} onChange={e => setPivot(e.target.value)} placeholder="60" /></div>
                            </div>
                            <div>
                                <label style={MINI_LABEL}>Output Format</label>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: chalOutput === 'number' ? '#61afef' : '#aaa' }}>
                                        <input type="radio" checked={chalOutput === 'number'} onChange={() => setChalOutput('number')} /> Number
                                    </label>
                                    <label style={{ fontSize: '0.8rem', color: chalOutput === 'bool' ? '#61afef' : '#aaa' }}>
                                        <input type="radio" checked={chalOutput === 'bool'} onChange={() => setChalOutput('bool')} /> Bool (%)
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    {/* --- STANDARD OPERATORS --- */}
                     {['conditional', 'effect', 'batch', 'timer'].includes(logicType) && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div style={{ width: '100px' }}>
                                <label style={MINI_LABEL}>Op</label>
                                <select className="form-select" value={operator} onChange={e => setOperator(e.target.value)}>
                                    {mode === 'effect' || logicType === 'effect' 
                                        ? <><option value="+=">+=</option><option value="-=">-=</option><option value="=">=</option></> 
                                        : <><option value=">=">&ge;</option><option value="<=">&le;</option><option value="==">==</option><option value="!=">!=</option></>}
                                </select>
                            </div>
                            <div style={{flex:1}}>
                                <label style={MINI_LABEL}>Value</label>
                                <input className="form-input" value={value} onChange={e => setValue(e.target.value)} />
                            </div>
                        </div>
                    )}
                    
                    {/* --- VARIABLE PROPERTIES --- */}
                    {logicType === 'variable' && (
                        <>
                            <div>
                                <label style={MINI_LABEL}>Property</label>
                                <select className="form-select" value={property} onChange={e => setProperty(e.target.value)}>
                                    <option value="">Value / Level (Default)</option>
                                    <option value="name">Name</option>
                                    <option value="description">Description</option>
                                    <option value="plural">Plural Name</option>
                                    <option value="capital">Capitalized Value</option>
                                </select>
                            </div>
                            {/* Variable Assignment Checkbox */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', background: '#2c313a', padding: '0.5rem', borderRadius: '4px' }}>
                                <input type="checkbox" checked={isAssignment} onChange={e => setIsAssignment(e.target.checked)} />
                                <label style={{ fontSize: '0.8rem', color: '#ccc' }}>Save as Alias (@var)</label>
                                {isAssignment && (
                                    <input 
                                        className="form-input" 
                                        value={assignAlias} 
                                        onChange={e => setAssignAlias(e.target.value)} 
                                        placeholder="alias_name" 
                                        style={{ flex: 1, padding: '2px 4px', fontSize: '0.8rem' }}
                                    />
                                )}
                            </div>
                        </>
                    )}

                    {/* --- COLLECTIONS UI (NEW) --- */}
                    {logicType === 'collections' && (
                        <>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <div style={{ width: '120px' }}>
                                    <label style={MINI_LABEL}>Command</label>
                                    <select className="form-select" value={colCmd} onChange={e => setColCmd(e.target.value)}>
                                        <option value="pick">Pick Random</option>
                                        <option value="roll">Weighted Roll</option>
                                        <option value="list">List Names</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={MINI_LABEL}>Category</label>
                                    <select className="form-select" value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            {/* Contextual Options */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                {colCmd === 'pick' && (
                                    <div>
                                        <label style={MINI_LABEL}>Count</label>
                                        <input className="form-input" value={colCount} onChange={e => setColCount(e.target.value)} />
                                    </div>
                                )}
                                {colCmd === 'list' && (
                                    <div>
                                        <label style={MINI_LABEL}>Separator</label>
                                        <select className="form-select" value={colSep} onChange={e => setColSep(e.target.value)}>
                                            <option value="comma">Comma (, )</option>
                                            <option value="pipe">Pipe ( | )</option>
                                            <option value="newline">New Line</option>
                                            <option value="and">And</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={MINI_LABEL}>Filter (Optional)</label>
                                <input 
                                    className="form-input" 
                                    value={colFilter} 
                                    onChange={e => setColFilter(e.target.value)} 
                                    placeholder=">0 OR $.cost < 5"
                                />
                            </div>
                        </>
                    )}

                    {/* --- BATCH CATEGORY --- */}
                    {logicType === 'batch' && (
                        <div>
                            <label style={MINI_LABEL}>Target Category</label>
                            <select className="form-select" value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    )}
                    
                    {/* --- TIMER --- */}
                    {logicType === 'timer' && (
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
                    )}

                    {/* --- RANDOM --- */}
                    {logicType === 'random' && (
                        <div>
                             <label style={MINI_LABEL}>Type</label>
                             <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                                 <button onClick={() => setOperator('|')} className="form-select" style={{ flex: 1, background: operator === '|' ? '#2a3e5c' : undefined }}>Choice</button>
                                 <button onClick={() => setOperator('~')} className="form-select" style={{ flex: 1, background: operator === '~' ? '#2a3e5c' : undefined }}>Range</button>
                                 <button onClick={() => setOperator('%')} className="form-select" style={{ flex: 1, background: operator === '%' ? '#2a3e5c' : undefined }}>% Check</button>
                             </div>
                             {operator === '%' && (
                                 <input className="form-input" value={value} onChange={e => setValue(e.target.value)} placeholder="Probability (0-100)" />
                             )}
                        </div>
                    )}
                    
                    {/* --- METADATA --- */}
                    {logicType === 'effect' && (
                        <>
                            <div>
                                <label style={MINI_LABEL}>Description Override</label>
                                <input className="form-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Custom text for log..." />
                            </div>
                            <div>
                                <label style={MINI_LABEL}>Source Tag</label>
                                <input className="form-input" value={source} onChange={e => setSource(e.target.value)} placeholder="found in..." />
                            </div>
                        </>
                    )}

                    <button onClick={handleInsert} style={styles.insertBtn}>Insert Code</button>
                </div>
            </div>

            {/* RESIZE HANDLE */}
            <div 
                onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsResizing(true);
                }}
                style={{
                    position: 'absolute', bottom: 0, right: 0, 
                    width: '15px', height: '15px', 
                    cursor: 'nwse-resize', 
                    background: 'linear-gradient(135deg, transparent 50%, #61afef 50%)',
                    borderRadius: '0 0 8px 0'
                }}
            />
        </div>
    );
}