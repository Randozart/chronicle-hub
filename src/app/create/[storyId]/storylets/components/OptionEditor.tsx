'use client';

import { useState } from 'react';
import { ResolveOption } from '@/engine/models';
import { toggleProperty, hasProperty } from '@/utils/propertyHelpers';
import GameImage from '@/components/GameImage'; // Assuming you want previews
import ScribeAssistant from '../../components/ScribeAssistant';

interface Props {
    data: ResolveOption;
    onChange: (data: ResolveOption) => void;
    onDelete: () => void;
    storyId: string;
}

export default function OptionEditor({ data, onChange, onDelete, storyId }: Props) {
    
    // Assistant State
    const [assistantTarget, setAssistantTarget] = useState<{ field: keyof ResolveOption, mode: 'condition' | 'effect' } | null>(null);

    const handleChange = (field: keyof ResolveOption, val: any) => {
        onChange({ ...data, [field]: val });
    };

    const handlePropToggle = (prop: string) => {
        const newProps = toggleProperty(data.properties, prop);
        handleChange('properties', newProps);
    };

    const handleAssistantInsert = (text: string) => {
        if (!assistantTarget) return;
        const currentVal = (data[assistantTarget.field] as string) || "";
        
        // Smart separators
        const isEffect = assistantTarget.mode === 'effect';
        const separator = isEffect ? ', ' : ' && ';
        
        const newVal = currentVal.length > 0 
            ? currentVal.trim().endsWith(isEffect ? ',' : '&') 
                ? currentVal + " " + text 
                : currentVal + separator + text
            : text;
            
        handleChange(assistantTarget.field, newVal);
    };

    // Helper for the lightning button
    const AssistantBtn = ({ field, mode }: { field: keyof ResolveOption, mode: 'condition' | 'effect' }) => (
        <button 
            onClick={() => setAssistantTarget({ field, mode })}
            style={{ position: 'absolute', right: 5, top: 24, background: 'none', border: 'none', cursor: 'pointer', color: '#f1c40f' }}
            title="Insert Logic"
        >
            ⚡
        </button>
    );

    return (
        <div className="space-y-4" style={{ position: 'relative' }}>
            
            {/* ASSISTANT POPUP */}
            {assistantTarget && (
                <div style={{ position: 'absolute', top: '50px', right: 0, zIndex: 100 }}>
                    <ScribeAssistant 
                        storyId={storyId} 
                        mode={assistantTarget.mode} 
                        onInsert={handleAssistantInsert} 
                        onClose={() => setAssistantTarget(null)} 
                    />
                </div>
            )}

            {/* MAIN INFO */}
            <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">Label</label>
                    <input value={data.name} onChange={e => handleChange('name', e.target.value)} className="form-input" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Cost</label>
                    <input value={data.action_cost || ''} onChange={e => handleChange('action_cost', e.target.value)} className="form-input" placeholder="1" />
                </div>
            </div>

            {/* BEHAVIOR (Checkboxes) */}
            <div className="special-field-group" style={{ borderColor: '#c678dd' }}>
                <label className="special-label" style={{ color: '#c678dd', marginBottom: '0.5rem' }}>Behavior</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <label className="toggle-label">
                        <input type="checkbox" checked={hasProperty(data.properties, 'instant_redirect')} onChange={() => handlePropToggle('instant_redirect')} />
                        Instant Redirect
                    </label>
                    <label className="toggle-label">
                        <input type="checkbox" checked={hasProperty(data.properties, 'no_return')} onChange={() => handlePropToggle('no_return')} />
                        No Return
                    </label>
                    <label className="toggle-label">
                        <input type="checkbox" checked={hasProperty(data.properties, 'dangerous')} onChange={() => handlePropToggle('dangerous')} />
                        Dangerous (Red)
                    </label>
                    <label className="toggle-label">
                        <input type="checkbox" checked={!!data.random} onChange={() => handleChange('random', data.random ? undefined : '$luck >= 50')} />
                        Has Difficulty
                    </label>
                </div>
            </div>

            {/* LOGIC GATES */}
            <div className="form-row">
                <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label">Visible If</label>
                    <input value={data.visible_if || ''} onChange={e => handleChange('visible_if', e.target.value)} className="form-input" />
                    <AssistantBtn field="visible_if" mode="condition" />
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label">Unlock If</label>
                    <input value={data.unlock_if || ''} onChange={e => handleChange('unlock_if', e.target.value)} className="form-input" />
                    <AssistantBtn field="unlock_if" mode="condition" />
                </div>
            </div>

            {/* SKILL CHECK */}
            {data.random !== undefined && (
                <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label" style={{ color: '#f1c40f' }}>Challenge Logic</label>
                    <input value={data.random} onChange={e => handleChange('random', e.target.value)} className="form-input" placeholder="$stat >= 50 [10]" />
                </div>
            )}

            {/* RESULTS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                
                {/* SUCCESS */}
                <div className="outcome-column" style={{ background: 'rgba(46, 204, 113, 0.05)', border: '1px solid #2ecc71' }}>
                    <h4 style={{ color: '#2ecc71', marginTop: 0 }}>Success</h4>
                    <textarea className="form-textarea" rows={3} value={data.pass_long} onChange={e => handleChange('pass_long', e.target.value)} placeholder="Result text..." />
                    
                    <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                        <label className="form-label">Effects</label>
                        <input className="form-input" value={data.pass_quality_change || ''} onChange={e => handleChange('pass_quality_change', e.target.value)} />
                        <AssistantBtn field="pass_quality_change" mode="effect" />
                    </div>

                    <div style={{ marginTop: '0.5rem' }}>
                        <label className="form-label">Move To (Location ID)</label>
                        <input className="form-input" value={data.pass_move_to || ''} onChange={e => handleChange('pass_move_to', e.target.value)} />
                    </div>
                </div>

                {/* FAILURE (Only if Difficulty is on) */}
                {data.random !== undefined && (
                    <div className="outcome-column" style={{ background: 'rgba(231, 76, 60, 0.05)', border: '1px solid #e74c3c' }}>
                        <h4 style={{ color: '#e74c3c', marginTop: 0 }}>Failure</h4>
                        <textarea className="form-textarea" rows={3} value={data.fail_long || ''} onChange={e => handleChange('fail_long', e.target.value)} placeholder="Result text..." />
                        
                        <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                            <label className="form-label">Effects</label>
                            <input className="form-input" value={data.fail_quality_change || ''} onChange={e => handleChange('fail_quality_change', e.target.value)} />
                            <AssistantBtn field="fail_quality_change" mode="effect" />
                        </div>
                         <div style={{ marginTop: '0.5rem' }}>
                            <label className="form-label">Move To (Location ID)</label>
                            <input className="form-input" value={data.fail_move_to || ''} onChange={e => handleChange('fail_move_to', e.target.value)} />
                        </div>
                    </div>
                )}
            </div>

            <div style={{ paddingTop: '1rem', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={onDelete} className="unequip-btn" style={{ width: 'auto', padding: '0.3rem 1rem' }}>Delete Option</button>
            </div>
        </div>
    );
}