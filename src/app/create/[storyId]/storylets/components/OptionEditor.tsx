// src/app/create/[storyId]/storylets/components/OptionEditor.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { ResolveOption, QualityDefinition, WorldSettings } from '@/engine/models';
import { toggleProperty, hasProperty } from '@/utils/propertyHelpers';
import SmartArea from '@/components/admin/SmartArea';
import BehaviorCard from '@/components/admin/BehaviorCard';
import ProbabilityChart from '@/components/admin/ProbabilityChart';
import { SamplePicker } from '@/components/admin/AudioTrackPicker';
import SoundsModal from '@/components/admin/SoundsModal';

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
                    <SmartArea
                        label="Image"
                        value={data.image_code || ''}
                        onChange={v => handleChange('image_code', v)}
                        storyId={storyId}
                        minHeight="38px"
                        placeholder="icon_id or { $.vip : gold_icon | normal_icon }"
                        qualityDefs={qualityDefs}
                    />
                </div>
            </div>
            <div className="form-row">
                <div style={{ flex: 1 }}>
                     <SmartArea label="Teaser (Option Card)" subLabel="Description shown on the button." value={data.short || ''} onChange={v => handleChange('short', v)} storyId={storyId} minHeight="60px" qualityDefs={qualityDefs} />
                </div>
                <div style={{ flex: 1 }}>
                     <SmartArea label="Teaser Instructions (Meta)" subLabel="Italic text on the button." value={data.meta || ''} onChange={v => handleChange('meta', v)} storyId={storyId} minHeight="60px" qualityDefs={qualityDefs} />
                </div>
            </div>
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
            <div className="admin-panel-box">
                <div className="form-row">
                    <div style={{ flex: 1 }}>
                        <SmartArea 
                            label="Requirement for Visibility" 
                            value={data.visible_if || ''} 
                            onChange={v => handleChange('visible_if', v)} 
                            storyId={storyId} 
                            mode="condition" 
                            placeholder="Leave blank for always visible" 
                            qualityDefs={qualityDefs} 
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <SmartArea 
                            label="Requirement for Selectability" 
                            value={data.unlock_if || ''} 
                            onChange={v => handleChange('unlock_if', v)} 
                            storyId={storyId} 
                            mode="condition" 
                            placeholder="Leave blank for always selectable" 
                            qualityDefs={qualityDefs} 
                        />
                    </div>
                </div>

                {/* Custom Lock Message & Preview */}
                <div style={{ marginTop: '1rem', borderTop: '1px dashed var(--tool-border)', paddingTop: '1rem' }}>
                    <SmartArea 
                        label="Custom Lock Message" 
                        subLabel="Override the default requirement text. Supports {ScribeScript}."
                        value={(data as any).lock_message || ''} 
                        onChange={v => handleChange('lock_message' as any, v)} 
                        storyId={storyId} 
                        minHeight="38px" 
                        placeholder="e.g. You need {5 - $evidence} more evidence." 
                        qualityDefs={qualityDefs} 
                    />
                    
                    {/* Only show preview if there is a requirement but NO custom message */}
                    {data.unlock_if && !(data as any).lock_message && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--tool-text-dim)', background: 'var(--tool-bg-dark)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--tool-border)' }}>
                            <strong style={{ color: 'var(--tool-accent)' }}>Default Preview:</strong> {getLockPreview(data.unlock_if, qualityDefs)}
                        </div>
                    )}
                </div>
            </div>
            <div className="special-field-group" style={{ 
                marginTop: '1.5rem', 
                borderColor: hasDifficulty ? 'var(--warning-color)' : 'var(--tool-border)',
                background: hasDifficulty ? 'var(--warning-bg)' : 'transparent'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasDifficulty ? '1rem' : '0' }}>
                    <label className="special-label" style={{ 
                        color: hasDifficulty ? 'var(--warning-color)' : 'var(--tool-text-dim)', 
                        margin: 0,
                        position: 'relative', top: 'auto', left: 'auto', background: 'none', padding: 0
                    }}>
                        Skill Check (Difficulty)
                    </label>
                    <label className="toggle-label">
                        <input 
                            type="checkbox" 
                            checked={hasDifficulty} 
                            onChange={() => handleChange('challenge', hasDifficulty ? undefined : '50')} 
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

            <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--tool-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <SoundsModal
                    label="Sounds"
                    hasContent={!!(data.clickSoundId || (data as any).soundId || data.passSoundId || data.failSoundId)}
                >
                    <div className="form-group">
                        <label className="form-label">Click Sound</label>
                        <SamplePicker
                            value={(data as any).clickSoundId || ''}
                            onChange={v => handleChange('clickSoundId' as any, v)}
                            placeholder="None — plays immediately on click"
                        />
                        <p className="special-desc">Fires before the option is resolved, regardless of outcome.</p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Default Sound</label>
                        <SamplePicker
                            value={(data as any).soundId || ''}
                            onChange={v => handleChange('soundId' as any, v)}
                            placeholder="None — plays when no skill check is required"
                        />
                        <p className="special-desc">Plays when this option has no skill check (guaranteed pass).</p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Success Sound</label>
                        <SamplePicker
                            value={data.passSoundId || ''}
                            onChange={v => handleChange('passSoundId', v)}
                            placeholder="None — plays on a successful skill check"
                        />
                        <p className="special-desc">Plays after a skill check resolves successfully.</p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Failure Sound</label>
                        <SamplePicker
                            value={data.failSoundId || ''}
                            onChange={v => handleChange('failSoundId', v)}
                            placeholder="None — plays on a failed skill check"
                        />
                        <p className="special-desc">Plays after a skill check resolves as a failure. Only relevant when difficulty is enabled.</p>
                    </div>
                </SoundsModal>
                <button onClick={onDelete} className="unequip-btn" style={{ width: 'auto', padding: '0.3rem 1rem' }}>Delete Option</button>
            </div>
        </div>
    );
}
function ChallengeConfigurator({ value, onChange, qualityDefs, storyId }: { value: string, onChange: (v: string) => void, qualityDefs: QualityDefinition[], storyId: string }) {
    const [mode, setMode] = useState<'simple' | 'logic' | 'manual'>('manual');
    const [globalDefaults, setGlobalDefaults] = useState<{margin: string, min: string, max: string, pivot: string} | null>(null);
    const [qid, setQid] = useState('');
    const [op, setOp] = useState('>>');
    const [target, setTarget] = useState(50);
    const [useDefMargin, setUseDefMargin] = useState(true);
    const [useDefMin, setUseDefMin] = useState(true);
    const [useDefMax, setUseDefMax] = useState(true);
    const [useDefPivot, setUseDefPivot] = useState(true);
    const [margin, setMargin] = useState(10);
    const [min, setMin] = useState(0);
    const [max, setMax] = useState(100);
    const [pivot, setPivot] = useState(60);
    const [chance, setChance] = useState(50);
    useEffect(() => {
        fetch(`/api/admin/settings?storyId=${storyId}`)
            .then(res => res.json())
            .then((settings: WorldSettings) => {
                const config = settings.challengeConfig || {};
                setGlobalDefaults({
                    margin: String(config.defaultMargin || 'target'),
                    min: String(config.minCap ?? '0'),
                    max: String(config.maxCap ?? '100'),
                    pivot: String(config.basePivot ?? '60')
                });
            })
            .catch(err => {
                console.error("Failed to load settings", err);
                setGlobalDefaults({ margin: 'target', min: '0', max: '100', pivot: '60' });
            });
    }, [storyId]);
    useEffect(() => {
        const clean = value.trim();
        if (/^(\d+)$/.test(clean)) {
            setMode('simple');
            setChance(parseInt(clean, 10));
            return;
        }
        const logicMatch = clean.match(/^\{\s*%chance\s*\[\s*\$([a-zA-Z0-9_]+)\s*(>>|<<|><|<>)\s*(\d+)\s*(?:;\s*([^,]+)\s*(?:,\s*([^,]+)\s*(?:,\s*([^,]+)\s*(?:,\s*([^,]+))?)?)?)?\s*\]\s*\}$/);
        
        if (logicMatch) {
            setMode('logic');
            const [, id, op, targetStr, mArg, minArg, maxArg, pivArg] = logicMatch.map(s => s?.trim());
            
            setQid(id);
            setOp(op);
            setTarget(parseInt(targetStr, 10));

            if (mArg) { setUseDefMargin(false); setMargin(parseInt(mArg, 10) || 10); } else { setUseDefMargin(true); }
            if (minArg) { setUseDefMin(false); setMin(parseInt(minArg, 10) || 0); } else { setUseDefMin(true); }
            if (maxArg) { setUseDefMax(false); setMax(parseInt(maxArg, 10) || 100); } else { setUseDefMax(true); }
            if (pivArg) { setUseDefPivot(false); setPivot(parseInt(pivArg, 10) || 60); } else { setUseDefPivot(true); }
            return;
        }
        setMode('manual');
    }, [value]);
    const isFirstRun = useRef(true);
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        if (mode === 'manual') return;

        let newVal = '';
        if (mode === 'simple') {
            newVal = String(chance);
        } else if (mode === 'logic') {
            const needsCustomArgs = !useDefMargin || !useDefMin || !useDefMax || !useDefPivot;
            let params = '';
            if (needsCustomArgs) {
                const mVal = useDefMargin ? (globalDefaults?.margin ?? 'target') : String(margin);
                const minVal = useDefMin ? (globalDefaults?.min ?? '0') : String(min);
                const maxVal = useDefMax ? (globalDefaults?.max ?? '100') : String(max);
                const pivVal = useDefPivot ? (globalDefaults?.pivot ?? '60') : String(pivot);
                params = ` ; ${mVal}, ${minVal}, ${maxVal}, ${pivVal}`;
            }
            newVal = `{%chance[$${qid || 'stat'} ${op} ${target}${params}]}`;
        }
        if (newVal !== value) {
            onChange(newVal);
        }
    }, [mode, qid, op, target, useDefMargin, useDefMin, useDefMax, useDefPivot, margin, min, max, pivot, chance, globalDefaults, onChange, value]);

    const resolveForChart = (input: string): number => {
        try {
            const sanitized = input.replace(/target/g, String(target)).replace(/[^-+*/0-9.() ]/g, '');
            return new Function('return ' + sanitized)();
        } catch (e) { return 0; }
    };
    
    return (
        <div style={{ background: 'var(--tool-bg-input)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--tool-border)' }}>
             <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem' }}>
                <button onClick={() => setMode('simple')} style={{ ...tabStyle, opacity: mode === 'simple' ? 1 : 0.5 }}>Simple %</button>
                <button onClick={() => setMode('logic')} style={{ ...tabStyle, opacity: mode === 'logic' ? 1 : 0.5 }}>Logic Builder</button>
                <button onClick={() => setMode('manual')} style={{ ...tabStyle, opacity: mode === 'manual' ? 1 : 0.5 }}>Manual Code</button>
            </div>

            {mode === 'simple' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label style={{ color: 'var(--tool-text-main)' }}>Success Chance:</label>
                    <input type="number" className="form-input" value={chance} onChange={e => setChance(parseInt(e.target.value, 10) || 0)} style={{ width: '80px', fontSize: '1.2rem', textAlign: 'center' }} min="0" max="100"/>
                    <span style={{ fontSize: '1.2rem', color: 'var(--tool-text-main)' }}>%</span>
                </div>
            )}

            {mode === 'logic' && (
                <div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{ flex: 1 }}><label style={miniLabel}>Stat</label><select className="form-select" value={qid} onChange={e => setQid(e.target.value)}><option value="">Select...</option>{qualityDefs.map(q => <option key={q.id} value={q.id}>{q.name} ({q.id})</option>)}</select></div>
                        <div style={{ width: '120px' }}><label style={miniLabel}>Function</label><select className="form-select" value={op} onChange={e => setOp(e.target.value)}><option value=">>">Progressive</option><option value="<<">Regressive</option><option value="><">Precise</option><option value="<>">Avoid</option></select></div>
                        <div style={{ width: '80px' }}><label style={miniLabel}>Target</label><input className="form-input" type="number" value={target} onChange={e => setTarget(parseInt(e.target.value, 10) || 0)} /></div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem', background: 'var(--tool-bg-sidebar)', padding: '0.5rem', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label className="toggle-label" style={{fontSize: '0.75rem'}} title={String(globalDefaults?.margin ?? 'target')}><input type="checkbox" checked={useDefMargin} onChange={e => setUseDefMargin(e.target.checked)} />Def. Margin ("{globalDefaults?.margin ?? 'target'}")</label>
                            {!useDefMargin && <input className="form-input" style={{padding: '2px 5px'}} type="number" value={margin} onChange={e => setMargin(parseInt(e.target.value, 10) || 0)} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label className="toggle-label" style={{fontSize: '0.75rem'}} title={String(globalDefaults?.min ?? '0')}><input type="checkbox" checked={useDefMin} onChange={e => setUseDefMin(e.target.checked)} />Def. Min ({globalDefaults?.min ?? 0}%)</label>
                            {!useDefMin && <input className="form-input" style={{padding: '2px 5px'}} type="number" value={min} onChange={e => setMin(parseInt(e.target.value, 10) || 0)} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label className="toggle-label" style={{fontSize: '0.75rem'}} title={String(globalDefaults?.max ?? '100')}><input type="checkbox" checked={useDefMax} onChange={e => setUseDefMax(e.target.checked)} />Def. Max ({globalDefaults?.max ?? 100}%)</label>
                            {!useDefMax && <input className="form-input" style={{padding: '2px 5px'}} type="number" value={max} onChange={e => setMax(parseInt(e.target.value, 10) || 0)} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label className="toggle-label" style={{fontSize: '0.75rem'}} title={String(globalDefaults?.pivot ?? '60')}><input type="checkbox" checked={useDefPivot} onChange={e => setUseDefPivot(e.target.checked)} />Def. Pivot ({globalDefaults?.pivot ?? 60}%)</label>
                            {!useDefPivot && <input className="form-input" style={{padding: '2px 5px'}} type="number" value={pivot} onChange={e => setPivot(parseInt(e.target.value, 10) || 0)} />}
                        </div>
                    </div>
                    
                    <div style={{ marginTop: '0.5rem', minHeight: '120px', width: '100%', border: '1px solid var(--tool-border)', background: 'var(--tool-bg-code-editor)', overflow: 'hidden', position: 'relative', borderRadius: '4px', display: 'flex', flexDirection: 'column' }}>
                        <ProbabilityChart 
                            operator={op} 
                            target={target} 
                            margin={resolveForChart(useDefMargin ? (globalDefaults?.margin ?? 'target') : String(margin))} 
                            minCap={resolveForChart(useDefMin ? (globalDefaults?.min ?? '0') : String(min))} 
                            maxCap={resolveForChart(useDefMax ? (globalDefaults?.max ?? '100') : String(max))} 
                            pivot={resolveForChart(useDefPivot ? (globalDefaults?.pivot ?? '60') : String(pivot))} 
                        />
                    </div>
                </div>
            )}

            {mode === 'manual' && (
                <SmartArea value={value} onChange={onChange} storyId={storyId} mode="condition" qualityDefs={qualityDefs} minHeight="80px" placeholder="{%chance[$stat >> 50]}"/>
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
                <div style={{ flex: 1 }}>
                    <SmartArea
                        label="Change Location"
                        subLabel="Moves player to a different location."
                        value={data[`${prefix}_move_to`] || ''}
                        onChange={v => onChange(`${prefix}_move_to`, v)}
                        storyId={storyId}
                        minHeight="38px"
                        placeholder="village_square or { $.banished : exile_zone | village_square }"
                        qualityDefs={qualityDefs}
                        entityType="location"
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <SmartArea
                        label="Fire Storylet"
                        subLabel="Opens a specific storylet immediately."
                        value={data[`${prefix}_redirect`] || ''}
                        onChange={v => onChange(`${prefix}_redirect`, v)}
                        storyId={storyId}
                        minHeight="38px"
                        placeholder="special_event or { $.urgent : emergency_storylet | normal_storylet }"
                        qualityDefs={qualityDefs}
                        entityType="storylet"
                    />
                </div>
            </div>
        </div>
    );
}

const tabStyle: React.CSSProperties = {
    background: 'none', border: 'none', color: 'var(--tool-accent)', 
    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold'
};

const miniLabel: React.CSSProperties = {
    display: 'block', fontSize: '0.7rem', color: 'var(--tool-text-dim)', marginBottom: '2px'
};


const getLockPreview = (condition: string, defs: QualityDefinition[]) => {
    if (!condition) return "";
    const opMap: Record<string, string> = { '>': 'more than', '>=': 'at least', '<': 'less than', '<=': 'at most', '==': 'exactly', '!=': 'not' };
    
    // Naive replacement for preview purposes. Doesn't have live values, but allows for basic logic.
    let readable = condition.replace(/(\$?[a-zA-Z0-9_]+)\s*(>=|<=|==|!=|>|<)\s*([0-9]+|'[^']+'|"[^"]+")/g, (match, rawQid, op, val) => {
        const qid = rawQid.startsWith('$') ? rawQid.substring(1) : rawQid;
        const def = defs.find(d => d.id === qid);
        const name = def?.name || qid;
        const cleanVal = val.replace(/^['"]|['"]$/g, '');
        return `${name} ${opMap[op] || op} ${cleanVal}`;
    });
    
    return `Requires: ${readable.replace(/&&|,/g, ' AND ').replace(/\|\|/g, ' OR ').replace(/\$/g, '')}`;
};