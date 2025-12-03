'use client';

import { useState } from 'react';
import { ResolveOption } from '@/engine/models';
import { toggleProperty, hasProperty } from '@/utils/propertyHelpers';
import SparkleIcon from '@/components/icons/SparkleIcon';
import ScribeAssistant from '../../components/ScribeAssistant';

interface Props {
    data: ResolveOption;
    onChange: (data: ResolveOption) => void;
    onDelete: () => void;
    storyId: string;
}

export default function OptionEditor({ data, onChange, onDelete, storyId }: Props) {
    
    const [activeField, setActiveField] = useState<{ key: keyof ResolveOption, mode: 'condition' | 'effect' } | null>(null);

    // Toggles
    const hasDifficulty = !!data.challenge; // Updated to 'challenge'
    const hasRarePass = (data.rare_pass_chance || 0) > 0;
    const hasRareFail = (data.rare_fail_chance || 0) > 0;

    const handleChange = (field: keyof ResolveOption, val: any) => {
        onChange({ ...data, [field]: val });
    };

    const handlePropToggle = (prop: string) => {
        const newTags = toggleProperty(data.tags, prop); // Updated to 'tags'
        handleChange('tags', newTags);
    };

    const handleAssistantInsert = (text: string) => {
        if (!activeField) return;
        const currentVal = (data[activeField.key] as string) || "";
        
        const isEffect = activeField.mode === 'effect';
        const separator = isEffect ? ', ' : ' && ';
        
        const newVal = currentVal.length > 0 
            ? currentVal.trim().endsWith(isEffect ? ',' : '&') 
                ? currentVal + " " + text 
                : currentVal + separator + text
            : text;
        handleChange(activeField.key, newVal);
    };

    

    const ToggleRare = ({ active, onChange, label }: any) => (
         <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input type="checkbox" checked={active} onChange={onChange} /> 
            {label}
        </label>
    );

    // Helper for outcome text areas
    const AssistantBtn = ({ field, mode }: { field: keyof ResolveOption, mode: 'condition' | 'effect' }) => (
        <button 
            onClick={() => setActiveField({ key: field, mode })}
            style={{ 
                position: 'absolute', right: 6, top: 4, 
                background: 'none', border: 'none', cursor: 'pointer', 
                color: '#61afef', fontSize: '0.75rem', fontWeight: 'bold',
                display: 'flex', alignItems: 'center', gap: '4px'
            }}
            title="Insert Logic"
        >
            <SparkleIcon className="w-3 h-3" /> Add
        </button>
    );

    return (
        <div className="space-y-4" style={{ position: 'relative' }}>
            
            {/* GLOBAL ASSISTANT FALLBACK (for text areas) */}
            {activeField && (
                <div style={{ display: 'none' }}></div>
            )}

            {/* 1. LABEL & COST */}
            <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">Button Label</label>
                    <input value={data.name} onChange={e => handleChange('name', e.target.value)} className="form-input" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Cost</label>
                    <input value={data.action_cost || ''} onChange={e => handleChange('action_cost', e.target.value)} className="form-input" placeholder="1" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Image</label>
                    <input value={data.image_code || ''} onChange={e => handleChange('image_code', e.target.value)} className="form-input" placeholder="key_img" />
                </div>
            </div>

            {/* --- NEW: TEASER TEXT --- */}
            <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Short Description (Teaser)</label>
                    <input 
                        value={data.short || ''} 
                        onChange={e => handleChange('short', e.target.value)} 
                        className="form-input" 
                        placeholder="A risky gamble..."
                    />
                    <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>Shown on the button.</p>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Instruction (Meta)</label>
                    <input 
                        value={data.meta || ''} 
                        onChange={e => handleChange('meta', e.target.value)} 
                        className="form-input" 
                        placeholder="Requires 5 Gold"
                        style={{ fontStyle: 'italic', color: '#aaa' }}
                    />
                    <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>Italic text inside the button.</p>
                </div>
            </div>
            {/* ----------------------- */}

            {/* 2. BEHAVIOR */}
            <div className="special-field-group" style={{ borderColor: '#c678dd' }}>
                <label className="special-label" style={{ color: '#c678dd', marginBottom: '0.5rem' }}>Behavior</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <BehaviorCard checked={hasProperty(data.tags, 'instant_redirect')} onChange={() => handlePropToggle('instant_redirect')} label="Instant Redirect" desc="Skips result text." />
                    <BehaviorCard checked={hasProperty(data.tags, 'no_return')} onChange={() => handlePropToggle('no_return')} label="No Return" desc="Forces move to location." />
                    <BehaviorCard checked={hasProperty(data.tags, 'dangerous')} onChange={() => handlePropToggle('dangerous')} label="Dangerous" desc="Adds red warning border." />
                    <BehaviorCard checked={hasDifficulty} onChange={() => handleChange('challenge', hasDifficulty ? undefined : '$luck >= 50')} label="Difficulty Check" desc="Adds Success/Failure mechanics." />
                </div>
            </div>

            {/* 3. REQUIREMENTS */}
            <div className="form-group" style={{ background: '#181a1f', padding: '0.75rem', borderRadius: '4px', border: '1px solid #333' }}>
                <div className="form-row">
                    <LogicInput 
                        label="Visible If" field="visible_if" mode="condition" placeholder="$gold > 0" data={data}
                        handleChange={handleChange}
                        activeField={activeField}
                        setActiveField={setActiveField}
                        storyId={storyId}
                        handleAssistantInsert={handleAssistantInsert}
                    />
                    <LogicInput 
                        label="Unlock If" field="unlock_if" mode="condition" placeholder="$gold >= 10" data={data}
                        handleChange={handleChange}
                        activeField={activeField}
                        setActiveField={setActiveField}
                        storyId={storyId}
                        handleAssistantInsert={handleAssistantInsert}
                    />
                </div>
                {hasDifficulty && (
                    <div style={{ marginTop: '1rem' }}>
                         <LogicInput 
                            label="Challenge Logic" field="challenge" mode="condition" placeholder="$stat >= 50 [10]" data={data}
                            handleChange={handleChange}
                            activeField={activeField}
                            setActiveField={setActiveField}
                            storyId={storyId}
                            handleAssistantInsert={handleAssistantInsert}
                        />
                         <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px' }}>
                             Tip: Use the assistant 🪄 to build Broad Difficulty curves or Luck checks.
                         </p>
                    </div>
                )}
            </div>

            {/* 4. OUTCOMES */}
            <div style={{ borderTop: '1px solid #444', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, color: '#aaa', textTransform: 'uppercase', fontSize: '0.8rem' }}>Outcomes</h4>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <ToggleRare active={hasRarePass} onChange={() => handleChange('rare_pass_chance', hasRarePass ? undefined : 10)} label="Rare Success" />
                        {hasDifficulty && <ToggleRare active={hasRareFail} onChange={() => handleChange('rare_fail_chance', hasRareFail ? undefined : 10)} label="Rare Failure" />}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                    <OutcomeColumn title="Success" color="#2ecc71" data={data} prefix="pass" onChange={handleChange} LogicInput={LogicInput} activeField={activeField} setActiveField={setActiveField} storyId={storyId} handleAssistantInsert={handleAssistantInsert} />
                    {hasRarePass && <OutcomeColumn title="Rare Success" color="#f1c40f" data={data} prefix="rare_pass" onChange={handleChange} LogicInput={LogicInput} isRare={true} chanceField="rare_pass_chance" activeField={activeField} setActiveField={setActiveField} storyId={storyId} handleAssistantInsert={handleAssistantInsert} />}
                    {hasDifficulty && <OutcomeColumn title="Failure" color="#e74c3c" data={data} prefix="fail" onChange={handleChange} LogicInput={LogicInput} activeField={activeField} setActiveField={setActiveField} storyId={storyId} handleAssistantInsert={handleAssistantInsert} />}
                    {hasDifficulty && hasRareFail && <OutcomeColumn title="Rare Failure" color="#c0392b" data={data} prefix="rare_fail" onChange={handleChange} LogicInput={LogicInput} isRare={true} chanceField="rare_fail_chance" activeField={activeField} setActiveField={setActiveField} storyId={storyId} handleAssistantInsert={handleAssistantInsert} />}
                </div>
            </div>

            <div style={{ paddingTop: '1rem', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={onDelete} className="unequip-btn" style={{ width: 'auto', padding: '0.3rem 1rem' }}>Delete Option</button>
            </div>
        </div>
    );
}

// -- Sub Components --

function BehaviorCard({ checked, onChange, label, desc }: any) {
    return (
        <div 
            onClick={onChange}
            style={{ 
                padding: '0.5rem', borderRadius: '4px', cursor: 'pointer',
                border: checked ? '1px solid #61afef' : '1px solid #333',
                background: checked ? 'rgba(97, 175, 239, 0.1)' : '#21252b' 
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: checked ? '#61afef' : '#ccc' }}>
                <input type="checkbox" checked={checked} readOnly />
                {label}
            </div>
            <p style={{ margin: '4px 0 0 24px', fontSize: '0.7rem', color: '#777' }}>{desc}</p>
        </div>
    );
}

function OutcomeColumn({ title, color, data, prefix, onChange, LogicInput, isRare, chanceField, activeField, setActiveField, storyId, handleAssistantInsert }: any) {
    
    // Helper for textarea buttons
    const AssistantBtn = ({ field }: { field: string }) => (
        <button 
            onClick={() => setActiveField({ key: field as any, mode: 'text' })} // Assuming text mode for body? Or effect?
            // Actually, body text needs 'text' mode.
            style={{ 
                position: 'absolute', right: 6, top: 6, 
                background: 'none', border: 'none', cursor: 'pointer', 
                color: '#61afef', fontSize: '0.7rem', fontWeight: 'bold',
                display: 'flex', alignItems: 'center', gap: '4px'
            }}
            title="Insert Variable"
        >
            <SparkleIcon className="w-3 h-3" /> Add
        </button>
    );

    return (
        <div className="outcome-column" style={{ background: `${color}08`, border: `1px solid ${color}40` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ color: color, margin: 0 }}>{title}</h4>
                {isRare && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input type="number" value={data[chanceField]} onChange={e => onChange(chanceField, parseInt(e.target.value))} className="form-input" style={{ width: '50px', padding: '2px', textAlign: 'center' }} />
                        <span style={{ fontSize: '0.8rem', color: '#aaa' }}>%</span>
                    </div>
                )}
            </div>
            
            <div style={{ position: 'relative' }}>
                <label className="form-label">Narrative</label>
                <textarea className="form-textarea" rows={4} value={data[`${prefix}_long`] || ''} onChange={e => onChange(`${prefix}_long`, e.target.value)} placeholder="What happens?" />
                {/* You can add AssistantBtn here if you want text injection in results */}
            </div>
            
            <div style={{ marginTop: '0.5rem' }}>
                <LogicInput
                    label="Changes (Ledger)"
                    field={`${prefix}_quality_change` as keyof ResolveOption}
                    mode="effect"
                    placeholder="$gold += 10"
                    data={data}
                    handleChange={onChange}
                    activeField={activeField}
                    setActiveField={setActiveField}
                    storyId={storyId}
                    handleAssistantInsert={handleAssistantInsert}
                />
            </div>

            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                    <label className="form-label">Move To</label>
                    <input className="form-input" value={data[`${prefix}_move_to`] || ''} onChange={e => onChange(`${prefix}_move_to`, e.target.value)} placeholder="Loc ID" />
                </div>
                 <div style={{ flex: 1 }}>
                    <label className="form-label">Redirect</label>
                    <input className="form-input" value={data[`${prefix}_redirect`] || ''} onChange={e => onChange(`${prefix}_redirect`, e.target.value)} placeholder="Storylet ID" />
                </div>
            </div>
            
             {/* RENDER POPUP for text area if needed, though LogicInput handles its own */}
             {activeField?.key === `${prefix}_long` && (
                <div style={{ position: 'relative', zIndex: 50 }}>
                    <ScribeAssistant storyId={storyId} mode="text" onInsert={handleAssistantInsert} onClose={() => setActiveField(null)} />
                </div>
             )}
        </div>
    );
}

interface LogicInputProps {
    label: string;
    field: keyof ResolveOption;
    mode: 'condition' | 'effect';
    placeholder?: string;

    data: ResolveOption;
    handleChange: (field: keyof ResolveOption, value: any) => void;

    activeField: { key: keyof ResolveOption; mode: 'condition' | 'effect' } | null;
    setActiveField: React.Dispatch<
        React.SetStateAction<{ key: keyof ResolveOption; mode: 'condition' | 'effect' } | null>
    >;

    storyId: string;
    handleAssistantInsert: (text: string) => void;
}

export function LogicInput({
    label,
    field,
    mode,
    placeholder,
    data,
    handleChange,
    activeField,
    setActiveField,
    storyId,
    handleAssistantInsert,
}: LogicInputProps) {
    return (
        <div style={{ position: 'relative', flex: 1 }}>
            <label className="form-label">{label}</label>

            <div style={{ position: 'relative' }}>
                <input
                    placeholder={placeholder}
                    value={(data[field] as string) || ''}
                    onChange={e => handleChange(field, e.target.value)}
                    className="form-input"
                    style={{ paddingRight: '90px' }}
                />

                <button
                    onClick={() =>
                        setActiveField(
                            activeField?.key === field
                                ? null
                                : { key: field, mode }
                        )
                    }
                    style={{
                        position: 'absolute',
                        right: 6,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(97, 175, 239, 0.1)',
                        border: '1px solid rgba(97, 175, 239, 0.3)',
                        color: '#61afef',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        transition: 'all 0.2s',
                    }}
                    className="hover:bg-blue-900/30"
                >
                    Logic
                </button>
            </div>

            {activeField?.key === field && (
                <ScribeAssistant
                    storyId={storyId}
                    mode={mode}
                    onInsert={handleAssistantInsert}
                    onClose={() => setActiveField(null)}
                />
            )}
        </div>
    );
}
