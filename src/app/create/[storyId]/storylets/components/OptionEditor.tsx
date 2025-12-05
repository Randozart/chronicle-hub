'use client';

import { useState } from 'react';
import { ResolveOption } from '@/engine/models';
import { toggleProperty, hasProperty } from '@/utils/propertyHelpers';
import SmartArea from '@/components/admin/SmartArea'; // <--- NEW
import BehaviorCard from '../../../../../components/admin/BehaviorCard';

interface Props {
    data: ResolveOption;
    onChange: (data: ResolveOption) => void;
    onDelete: () => void;
    storyId: string;
}

export default function OptionEditor({ data, onChange, onDelete, storyId }: Props) {
    // Remove activeField state
    
    const hasDifficulty = !!data.challenge;
    const hasRarePass = (data.rare_pass_chance || 0) > 0;
    const hasRareFail = (data.rare_fail_chance || 0) > 0;

    const handleChange = (field: keyof ResolveOption, val: any) => {
        onChange({ ...data, [field]: val });
    };

    const handleTagToggle = (prop: string) => {
        const newTags = toggleProperty(data.tags, prop);
        handleChange('tags', newTags);
    };

    const ToggleRare = ({ active, onChange, label }: any) => (
         <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input type="checkbox" checked={active} onChange={onChange} /> {label}
        </label>
    );

    return (
        <div className="space-y-4">
            
            <div className="form-row">
                <div style={{ flex: 2 }}>
                    <SmartArea label="Label" value={data.name} onChange={v => handleChange('name', v)} storyId={storyId} minHeight="38px" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Cost</label>
                    <input value={data.action_cost || ''} onChange={e => handleChange('action_cost', e.target.value)} className="form-input" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Image</label>
                    <input value={data.image_code || ''} onChange={e => handleChange('image_code', e.target.value)} className="form-input" />
                </div>
            </div>

            <div className="form-row">
                <div style={{ flex: 1 }}>
                     <SmartArea label="Teaser" value={data.short || ''} onChange={v => handleChange('short', v)} storyId={storyId} minHeight="60px" />
                </div>
                <div style={{ flex: 1 }}>
                     <SmartArea label="Instruction (Meta)" value={data.meta || ''} onChange={v => handleChange('meta', v)} storyId={storyId} minHeight="60px" />
                </div>
            </div>

            <div className="special-field-group" style={{ borderColor: '#c678dd' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <BehaviorCard checked={hasProperty(data.tags, 'instant_redirect')} onChange={() => handleTagToggle('instant_redirect')} label="Instant Redirect" desc="Skips result." />
                    <BehaviorCard checked={hasProperty(data.tags, 'no_return')} onChange={() => handleTagToggle('no_return')} label="No Return" desc="Forces move." />
                    <BehaviorCard checked={hasProperty(data.tags, 'dangerous')} onChange={() => handleTagToggle('dangerous')} label="Dangerous" desc="Red border." />
                    <BehaviorCard checked={hasDifficulty} onChange={() => handleChange('challenge', hasDifficulty ? undefined : '$luck >= 50')} label="Difficulty" desc="Skill check." />
                </div>
            </div>

            <div className="form-group" style={{ background: '#181a1f', padding: '0.75rem', borderRadius: '4px', border: '1px solid #333' }}>
                <div className="form-row">
                    <div style={{ flex: 1 }}><SmartArea label="Visible If" value={data.visible_if || ''} onChange={v => handleChange('visible_if', v)} storyId={storyId} mode="text" placeholder="$gold > 0" /></div>
                    <div style={{ flex: 1 }}><SmartArea label="Unlock If" value={data.unlock_if || ''} onChange={v => handleChange('unlock_if', v)} storyId={storyId} mode="text" placeholder="$gold >= 10" /></div>
                </div>
                {hasDifficulty && <div style={{ marginTop: '1rem' }}><SmartArea label="Challenge Logic" value={data.challenge || ''} onChange={v => handleChange('challenge', v)} storyId={storyId} mode="condition" /></div>}
            </div>

            <div style={{ borderTop: '1px solid #444', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, color: '#aaa', textTransform: 'uppercase', fontSize: '0.8rem' }}>Outcomes</h4>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <ToggleRare active={hasRarePass} onChange={() => handleChange('rare_pass_chance', hasRarePass ? undefined : 10)} label="Rare Success" />
                        {hasDifficulty && <ToggleRare active={hasRareFail} onChange={() => handleChange('rare_fail_chance', hasRareFail ? undefined : 10)} label="Rare Failure" />}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                    <OutcomeColumn title="Success" color="#2ecc71" data={data} prefix="pass" onChange={handleChange} storyId={storyId} />
                    {hasRarePass && <OutcomeColumn title="Rare Success" color="#f1c40f" data={data} prefix="rare_pass" onChange={handleChange} isRare={true} chanceField="rare_pass_chance" storyId={storyId} />}
                    {hasDifficulty && <OutcomeColumn title="Failure" color="#e74c3c" data={data} prefix="fail" onChange={handleChange} storyId={storyId} />}
                    {hasDifficulty && hasRareFail && <OutcomeColumn title="Rare Failure" color="#c0392b" data={data} prefix="rare_fail" onChange={handleChange} isRare={true} chanceField="rare_fail_chance" storyId={storyId} />}
                </div>
            </div>

            <div style={{ paddingTop: '1rem', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={onDelete} className="unequip-btn" style={{ width: 'auto', padding: '0.3rem 1rem' }}>Delete Option</button>
            </div>
        </div>
    );
}

function OutcomeColumn({ title, color, data, prefix, onChange, isRare, chanceField, storyId }: any) {
    return (
        <div className="outcome-column" style={{ background: `${color}08`, border: `1px solid ${color}40` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ color: color, margin: 0 }}>{title}</h4>
                {isRare && <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><input type="number" value={data[chanceField]} onChange={e => onChange(chanceField, parseInt(e.target.value))} className="form-input" style={{ width: '50px', padding: '2px', textAlign: 'center' }} /><span style={{ fontSize: '0.8rem', color: '#aaa' }}>%</span></div>}
            </div>
            
            <SmartArea label="Narrative" value={data[`${prefix}_long`] || ''} onChange={v => onChange(`${prefix}_long`, v)} storyId={storyId} minHeight="80px" placeholder="What happens?" />
            
            <div style={{ marginTop: '0.5rem' }}>
                <SmartArea label="Changes" value={data[`${prefix}_quality_change`] || ''} onChange={v => onChange(`${prefix}_quality_change`, v)} storyId={storyId} mode="effect" />
            </div>

            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}><label className="form-label">Move To</label><input className="form-input" value={data[`${prefix}_move_to`] || ''} onChange={e => onChange(`${prefix}_move_to`, e.target.value)} placeholder="Loc ID" /></div>
                <div style={{ flex: 1 }}><label className="form-label">Redirect</label><input className="form-input" value={data[`${prefix}_redirect`] || ''} onChange={e => onChange(`${prefix}_redirect`, e.target.value)} placeholder="Storylet ID" /></div>
            </div>
        </div>
    );
}