// src/app/create/[storyId]/storylets/components/OptionEditor.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { ResolveOption, QualityDefinition } from '@/engine/models';
import { toggleProperty, hasProperty } from '@/utils/propertyHelpers';
import SmartArea from '@/components/admin/SmartArea';
import BehaviorCard from '@/components/admin/BehaviorCard';
import ProbabilityChart from '@/components/admin/ProbabilityChart';

interface Props {
    data: ResolveOption;
    onChange: (data: ResolveOption) => void;
    onDelete: () => void;
    storyId: string;
    qualityDefs: QualityDefinition[];
}

export default function OptionEditor({ data, onChange, onDelete, storyId, qualityDefs }: Props) {
    const hasDifficulty = !!data.challenge;

    const handleChange = (field: keyof ResolveOption, val: any) => {
        onChange({ ...data, [field]: val });
    };

    const handleTagToggle = (prop: string) => {
        const newTags = toggleProperty(data.tags, prop);
        handleChange('tags', newTags);
    };

    return (
        <div className="space-y-4">
            
            {/* TOP ROW: Label, Cost, Image */}
            <div className="form-row">
                <div style={{ flex: 2 }}>
                    <SmartArea label="Label" value={data.name} onChange={v => handleChange('name', v)} storyId={storyId} minHeight="38px" qualityDefs={qualityDefs} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <SmartArea 
                        label="Cost" 
                        value={data.action_cost || ''} 
                        onChange={v => handleChange('action_cost', v)} 
                        storyId={storyId} 
                        minHeight="38px" 
                        placeholder="1 or $stress++" 
                        qualityDefs={qualityDefs}
                    />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Image</label>
                    <input value={data.image_code || ''} onChange={e => handleChange('image_code', e.target.value)} className="form-input" />
                </div>
            </div>

            {/* TEASER & META */}
            <div className="form-row">
                <div style={{ flex: 1 }}>
                     <SmartArea label="Teaser (Option Card)" subLabel="Description shown on the button." value={data.short || ''} onChange={v => handleChange('short', v)} storyId={storyId} minHeight="60px" qualityDefs={qualityDefs} />
                </div>
                <div style={{ flex: 1 }}>
                     <SmartArea label="Teaser Instructions (Meta)" subLabel="Italic text on the button." value={data.meta || ''} onChange={v => handleChange('meta', v)} storyId={storyId} minHeight="60px" qualityDefs={qualityDefs} />
                </div>
            </div>

            {/* BEHAVIOR TAGS */}
            <div className="special-field-group" style={{ borderColor: 'var(--tool-accent-mauve)' }}>
                <label className="special-label" style={{ color: 'var(--tool-accent-mauve)' }}>Behavior & Tags</label>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <BehaviorCard checked={hasProperty(data.tags, 'instant_redirect')} onChange={() => handleTagToggle('instant_redirect')} label="Instant Redirect" desc="Skips result." />
                    <BehaviorCard checked={hasProperty(data.tags, 'no_return')} onChange={() => handleTagToggle('no_return')} label="No Return" desc="Forces move." />
                    <BehaviorCard checked={hasProperty(data.tags, 'dangerous')} onChange={() => handleTagToggle('dangerous')} label="Dangerous" desc="Red border." />
                    <BehaviorCard checked={hasProperty(data.tags, 'clear_hand')} onChange={() => handleTagToggle('clear_hand')} label="Clear Hand" desc="Removes all cards." />
                    <BehaviorCard 
                        checked={hasProperty(data.tags, 'post_effects_eval')} 
                        onChange={() => handleTagToggle('post_effects_eval')} 
                        label="Delayed Text Eval" 
                        desc="Eval text AFTER effects." 
                    />
                </div>

                <div className="form-group">
                    <SmartArea 
                        label="Dynamic Tags (ScribeScript)" 
                        value={data.dynamic_tags || ''} 
                        onChange={v => handleChange('dynamic_tags', v)} 
                        storyId={storyId} 
                        minHeight="38px"
                        mode="condition"
                        placeholder="{ $gold > 100 ? 'special_tag' : '' }"
                        qualityDefs={qualityDefs}
                    />
                </div>
            </div>

            {/* VISIBILITY CONDITIONS */}
            <div className="admin-panel-box">
                <div className="form-row">
                    <div style={{ flex: 1 }}><SmartArea label="Visible If" value={data.visible_if || ''} onChange={v => handleChange('visible_if', v)} storyId={storyId} mode="condition" placeholder="$gold > 0" qualityDefs={qualityDefs} /></div>
                    <div style={{ flex: 1 }}><SmartArea label="Unlock If" value={data.unlock_if || ''} onChange={v => handleChange('unlock_if', v)} storyId={storyId} mode="condition" placeholder="$gold >= 10" qualityDefs={qualityDefs} /></div>
                </div>
            </div>

            {/* DIFFICULTY / RISK CONFIGURATION */}
            <div className="special-field-group" style={{ 
                marginTop: '1.5rem', 
                borderColor: hasDifficulty ? '#f1c40f' : 'var(--tool-border)',
                background: hasDifficulty ? 'rgba(241, 196, 15, 0.05)' : 'transparent'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasDifficulty ? '1rem' : '0' }}>
                    <label className="special-label" style={{ 
                        color: hasDifficulty ? '#f1c40f' : 'var(--tool-text-dim)', 
                        margin: 0,
                        position: 'relative', top: 'auto', left: 'auto', background: 'none', padding: 0
                    }}>
                        Skill Check (Difficulty)
                    </label>
                    <label className="toggle-label">
                        <input 
                            type="checkbox" 
                            checked={hasDifficulty} 
                            onChange={() => handleChange('challenge', hasDifficulty ? undefined : '{%chance[$stat >> 50]}')} 
                        />
                        Enable Failure State
                    </label>
                </div>

                {hasDifficulty && (
                    <ChallengeConfigurator 
                        value={data.challenge || ''} 
                        onChange={v => handleChange('challenge', v)} 
                        qualityDefs={qualityDefs}
                        storyId={storyId}
                    />
                )}
            </div>

            {/* OUTCOMES */}
            <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, color: 'var(--tool-text-dim)', textTransform: 'uppercase', fontSize: '0.8rem' }}>Outcomes</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--tool-text-dim)' }}>Use <code>%random</code> in text/effects for rare outcomes.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                    <OutcomeColumn 
                        title="Success / Default" 
                        color={hasDifficulty ? "var(--success-color)" : "var(--tool-text-main)"} 
                        isGuaranteed={!hasDifficulty}
                        data={data} 
                        prefix="pass" 
                        onChange={handleChange} 
                        storyId={storyId} 
                        qualityDefs={qualityDefs} 
                    />
                    
                    {hasDifficulty && (
                        <OutcomeColumn 
                            title="Failure" 
                            color="var(--danger-color)" 
                            data={data} 
                            prefix="fail" 
                            onChange={handleChange} 
                            storyId={storyId} 
                            qualityDefs={qualityDefs} 
                        />
                    )}
                </div>
            </div>

            <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--tool-border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={onDelete} className="unequip-btn" style={{ width: 'auto', padding: '0.3rem 1rem' }}>Delete Option</button>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS ---

function ChallengeConfigurator({ value, onChange, qualityDefs, storyId }: { value: string, onChange: (v: string) => void, qualityDefs: QualityDefinition[], storyId: string }) {
    const [mode, setMode] = useState<'simple' | 'logic' | 'manual'>('manual');
    
    // Logic State
    const [qid, setQid] = useState('');
    const [op, setOp] = useState('>>');
    const [target, setTarget] = useState('50');
    
    // Independent Defaults
    const [useDefMargin, setUseDefMargin] = useState(true);
    const [useDefMin, setUseDefMin] = useState(true);
    const [useDefMax, setUseDefMax] = useState(true);
    const [useDefPivot, setUseDefPivot] = useState(true);
    
    const [margin, setMargin] = useState('10');
    const [min, setMin] = useState('0');
    const [max, setMax] = useState('100');
    const [pivot, setPivot] = useState('60');
    
    // Simple State
    const [chance, setChance] = useState('50');

    // Helper to generate the string based on current state
    const generateString = () => {
        if (mode === 'simple') {
            return chance;
        }
        if (mode === 'logic') {
            const needsCustomArgs = !useDefMargin || !useDefMin || !useDefMax || !useDefPivot;
            
            let params = '';
            if (needsCustomArgs) {
                const mVal = useDefMargin ? '10' : (margin || '10');
                const minVal = useDefMin ? '0' : (min || '0');
                const maxVal = useDefMax ? '100' : (max || '100');
                const pivVal = useDefPivot ? '60' : (pivot || '60');
                params = ` ; ${mVal}, ${minVal}, ${maxVal}, ${pivVal}`;
            }

            return `{%chance[$${qid || 'stat'} ${op} ${target || '0'}${params}]}`;
        }
        return value;
    };

    // PARSER: Ingest prop changes
    useEffect(() => {
        const clean = value.trim();

        if (clean === generateString().trim()) {
            return; 
        }
        
        // Simple Mode Check
        if (/^(\d+)$/.test(clean)) {
            setMode('simple');
            setChance(clean);
            return;
        }

        // Logic Mode Check: {%chance[$q op target ...]}
        // Groups: 1=id, 2=op, 3=target, 4=margin, 5=min, 6=max, 7=pivot
        const logicMatch = clean.match(/^\{\s*%chance\s*\[\s*\$([a-zA-Z0-9_]+)\s*(>>|<<|><|<>)\s*(\d+)\s*(?:;\s*([\d]+)\s*(?:,\s*([\d]+)\s*,\s*([\d]+)\s*(?:,\s*([\d]+))?)?)?\s*\]\s*\}$/);
        
        if (logicMatch) {
            setMode('logic');
            setQid(logicMatch[1]);
            setOp(logicMatch[2]);
            setTarget(logicMatch[3]);
            
            // Logic for args:
            const mArg = logicMatch[4];
            const minArg = logicMatch[5];
            const maxArg = logicMatch[6];
            const pivArg = logicMatch[7];

            if (mArg) {
                setUseDefMargin(false);
                setMargin(mArg);
                
                if (minArg) { setUseDefMin(false); setMin(minArg); } 
                else { setUseDefMin(true); }

                if (maxArg) { setUseDefMax(false); setMax(maxArg); } 
                else { setUseDefMax(true); }

                if (pivArg) { setUseDefPivot(false); setPivot(pivArg); }
                else { setUseDefPivot(true); }

            } else {
                setUseDefMargin(true);
                setUseDefMin(true);
                setUseDefMax(true);
                setUseDefPivot(true);
            }
            return;
        }

        setMode('manual');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]); 

    // BUILDER
    const isFirstRun = useRef(true);
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        if (mode === 'manual') return; 

        const newVal = generateString();
        if (newVal !== value) {
            onChange(newVal);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, qid, op, target, useDefMargin, useDefMin, useDefMax, useDefPivot, margin, min, max, pivot, chance]);


    return (
        <div style={{ background: '#21252b', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--tool-border)' }}>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                <button onClick={() => setMode('simple')} style={{ ...tabStyle, opacity: mode === 'simple' ? 1 : 0.5 }}>Simple %</button>
                <button onClick={() => setMode('logic')} style={{ ...tabStyle, opacity: mode === 'logic' ? 1 : 0.5 }}>Logic Builder</button>
                <button onClick={() => setMode('manual')} style={{ ...tabStyle, opacity: mode === 'manual' ? 1 : 0.5 }}>Manual Code</button>
            </div>

            {/* SIMPLE MODE */}
            {mode === 'simple' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label style={{ color: '#ccc' }}>Success Chance:</label>
                    <input 
                        type="number" 
                        className="form-input" 
                        value={chance} 
                        onChange={e => setChance(e.target.value)} 
                        style={{ width: '80px', fontSize: '1.2rem', textAlign: 'center' }} 
                        min="0" max="100"
                    />
                    <span style={{ fontSize: '1.2rem', color: '#ccc' }}>%</span>
                </div>
            )}

            {/* LOGIC BUILDER */}
            {mode === 'logic' && (
                <div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={miniLabel}>Stat</label>
                            <select className="form-select" value={qid} onChange={e => setQid(e.target.value)}>
                                <option value="">Select...</option>
                                {qualityDefs.map(q => <option key={q.id} value={q.id}>{q.name} ({q.id})</option>)}
                            </select>
                        </div>
                        <div style={{ width: '120px' }}>
                            <label style={miniLabel}>Function</label>
                            <select className="form-select" value={op} onChange={e => setOp(e.target.value)}>
                                <option value=">>">Progressive</option>
                                <option value="<<">Regressive</option>
                                <option value="><">Precise</option>
                                <option value="<>">Avoid</option>
                            </select>
                        </div>
                        <div style={{ width: '80px' }}>
                            <label style={miniLabel}>Target</label>
                            <input className="form-input" type="number" value={target} onChange={e => setTarget(e.target.value)} />
                        </div>
                    </div>

                    {/* INDIVIDUAL DEFAULTS ROW */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem', background: '#181a1f', padding: '0.5rem', borderRadius: '4px' }}>
                        
                        {/* Margin */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label className="toggle-label" style={{fontSize: '0.75rem'}}>
                                <input type="checkbox" checked={useDefMargin} onChange={e => setUseDefMargin(e.target.checked)} />
                                Default Margin (10)
                            </label>
                            {!useDefMargin && (
                                <input className="form-input" style={{padding: '2px 5px'}} placeholder="10" value={margin} onChange={e => setMargin(e.target.value)} />
                            )}
                        </div>

                        {/* Min */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label className="toggle-label" style={{fontSize: '0.75rem'}}>
                                <input type="checkbox" checked={useDefMin} onChange={e => setUseDefMin(e.target.checked)} />
                                Default Min (0%)
                            </label>
                            {!useDefMin && (
                                <input className="form-input" style={{padding: '2px 5px'}} placeholder="0" value={min} onChange={e => setMin(e.target.value)} />
                            )}
                        </div>

                        {/* Max */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label className="toggle-label" style={{fontSize: '0.75rem'}}>
                                <input type="checkbox" checked={useDefMax} onChange={e => setUseDefMax(e.target.checked)} />
                                Default Max (100%)
                            </label>
                            {!useDefMax && (
                                <input className="form-input" style={{padding: '2px 5px'}} placeholder="100" value={max} onChange={e => setMax(e.target.value)} />
                            )}
                        </div>

                        {/* Pivot (NEW) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label className="toggle-label" style={{fontSize: '0.75rem'}}>
                                <input type="checkbox" checked={useDefPivot} onChange={e => setUseDefPivot(e.target.checked)} />
                                Default Pivot (60)
                            </label>
                            {!useDefPivot && (
                                <input className="form-input" style={{padding: '2px 5px'}} placeholder="60" value={pivot} onChange={e => setPivot(e.target.value)} />
                            )}
                        </div>
                    </div>
                    
                    {/* Visualizer Container */}
                    <div style={{ 
                        marginTop: '0.5rem', 
                        minHeight: '120px',
                        width: '100%', 
                        border: '1px solid #333', 
                        background: '#111',
                        overflow: 'hidden',
                        position: 'relative',
                        borderRadius: '4px',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <ProbabilityChart 
                            operator={op} 
                            target={parseInt(target)||50} 
                            margin={useDefMargin ? 10 : parseInt(margin)||10} 
                            minCap={useDefMin ? 0 : parseInt(min)||0} 
                            maxCap={useDefMax ? 100 : parseInt(max)||100} 
                            pivot={useDefPivot ? 60 : parseInt(pivot)||60} 
                        />
                    </div>
                </div>
            )}

            {/* MANUAL MODE */}
            {mode === 'manual' && (
                <SmartArea 
                    value={value} 
                    onChange={onChange} 
                    storyId={storyId} 
                    mode="condition" 
                    qualityDefs={qualityDefs} 
                    minHeight="80px"
                    placeholder="{%chance[$stat >> 50]}"
                />
            )}
        </div>
    );
}

function OutcomeColumn({ title, color, data, prefix, onChange, storyId, qualityDefs, isGuaranteed }: any) {
    const containerStyle = isGuaranteed ? {
        paddingTop: '0.5rem' 
    } : {
        background: `color-mix(in srgb, ${color}, transparent 95%)`,
        border: `1px solid color-mix(in srgb, ${color}, transparent 60%)`,
        padding: '1rem',
        borderRadius: '4px'
    };

    return (
        <div className="outcome-column" style={containerStyle}>
            <h4 style={{ 
                color: color, 
                margin: '0 0 0.5rem 0',
                fontSize: '0.9rem',
                opacity: isGuaranteed ? 0.8 : 1
            }}>
                {title}
            </h4>
            
            <SmartArea 
                label="Resolution Body" 
                value={data[`${prefix}_long`] || ''} 
                onChange={v => onChange(`${prefix}_long`, v)} 
                storyId={storyId} 
                minHeight="80px" 
                placeholder="What happens?" 
                qualityDefs={qualityDefs} 
            />

            <div style={{ marginTop: '0.5rem' }}>
                <SmartArea 
                    label="Resolution Instructions (Meta)" 
                    value={data[`${prefix}_meta`] || ''} 
                    onChange={v => onChange(`${prefix}_meta`, v)} 
                    storyId={storyId} 
                    minHeight="40px" 
                    placeholder="Instructions shown after resolution." 
                    qualityDefs={qualityDefs} 
                />
            </div>
            
            <div style={{ marginTop: '0.5rem' }}>
                <SmartArea label="Changes" value={data[`${prefix}_quality_change`] || ''} onChange={v => onChange(`${prefix}_quality_change`, v)} storyId={storyId} mode="effect" qualityDefs={qualityDefs} />
            </div>

            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}><label className="form-label">Move To</label><input className="form-input" value={data[`${prefix}_move_to`] || ''} onChange={e => onChange(`${prefix}_move_to`, e.target.value)} placeholder="Loc ID" /></div>
                <div style={{ flex: 1 }}><label className="form-label">Redirect</label><input className="form-input" value={data[`${prefix}_redirect`] || ''} onChange={e => onChange(`${prefix}_redirect`, e.target.value)} placeholder="Storylet ID" /></div>
            </div>
        </div>
    );
}

const tabStyle: React.CSSProperties = {
    background: 'none', border: 'none', color: '#61afef', 
    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold'
};

const miniLabel: React.CSSProperties = {
    display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: '2px'
};