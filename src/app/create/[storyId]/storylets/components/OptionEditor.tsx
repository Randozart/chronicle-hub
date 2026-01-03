'use client';

import { ResolveOption, QualityDefinition } from '@/engine/models';
import { toggleProperty, hasProperty } from '@/utils/propertyHelpers';
import SmartArea from '@/components/admin/SmartArea';
import BehaviorCard from '@/components/admin/BehaviorCard';

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
                    <label className="form-label">Image</label>
                    <input value={data.image_code || ''} onChange={e => handleChange('image_code', e.target.value)} className="form-input" />
                </div>
            </div>

            <div className="form-row">
                <div style={{ flex: 1 }}>
                     <SmartArea label="Teaser" value={data.short || ''} onChange={v => handleChange('short', v)} storyId={storyId} minHeight="60px" qualityDefs={qualityDefs} />
                </div>
                <div style={{ flex: 1 }}>
                     <SmartArea label="Instruction (Meta)" value={data.meta || ''} onChange={v => handleChange('meta', v)} storyId={storyId} minHeight="60px" qualityDefs={qualityDefs} />
                </div>
            </div>

            {/* TAGS & BEHAVIOR */}
            <div className="special-field-group" style={{ borderColor: 'var(--tool-accent-mauve)' }}>
                <label className="special-label" style={{ color: 'var(--tool-accent-mauve)' }}>Behavior & Tags</label>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <BehaviorCard checked={hasProperty(data.tags, 'instant_redirect')} onChange={() => handleTagToggle('instant_redirect')} label="Instant Redirect" desc="Skips result." />
                    <BehaviorCard checked={hasProperty(data.tags, 'no_return')} onChange={() => handleTagToggle('no_return')} label="No Return" desc="Forces move." />
                    <BehaviorCard checked={hasProperty(data.tags, 'dangerous')} onChange={() => handleTagToggle('dangerous')} label="Dangerous" desc="Red border." />
                    <BehaviorCard checked={hasProperty(data.tags, 'clear_hand')} onChange={() => handleTagToggle('clear_hand')} label="Clear Hand" desc="Removes all cards." />
                    <BehaviorCard checked={hasDifficulty} onChange={() => handleChange('challenge', hasDifficulty ? undefined : '{%chance[$stat >> 50]}')} label="Difficulty" desc="Skill check." />
                </div>

                {/* DYNAMIC TAGS */}
                <div className="form-group">
                    <SmartArea 
                        label="Dynamic Tags (ScribeScript)" 
                        value={data.dynamic_tags || ''} 
                        onChange={v => handleChange('dynamic_tags', v)} 
                        storyId={storyId} 
                        minHeight="38px"
                        mode="condition"
                        placeholder="{ $gold > 100 ? 'special_tag' : '' }"
                        subLabel="Comma-separated list calculated at runtime."
                        qualityDefs={qualityDefs}
                    />
                </div>
            </div>

            {/* CONDITIONS */}
            <div className="admin-panel-box">
                <div className="form-row">
                    <div style={{ flex: 1 }}><SmartArea label="Visible If" value={data.visible_if || ''} onChange={v => handleChange('visible_if', v)} storyId={storyId} mode="condition" placeholder="$gold > 0" qualityDefs={qualityDefs} /></div>
                    <div style={{ flex: 1 }}><SmartArea label="Unlock If" value={data.unlock_if || ''} onChange={v => handleChange('unlock_if', v)} storyId={storyId} mode="condition" placeholder="$gold >= 10" qualityDefs={qualityDefs} /></div>
                </div>
                {hasDifficulty && (
                    <div style={{ marginTop: '1rem' }}>
                        <SmartArea 
                            label="Challenge Probability (0-100)" 
                            value={data.challenge || ''} 
                            onChange={v => handleChange('challenge', v)} 
                            storyId={storyId} 
                            mode="condition" 
                            initialTab="challenge"
                            placeholder="{%chance[$stat >> 50]}"
                            qualityDefs={qualityDefs}
                        />
                    </div>
                )}
            </div>

            {/* OUTCOMES */}
            <div style={{ borderTop: '1px solid var(--tool-border)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, color: 'var(--tool-text-dim)', textTransform: 'uppercase', fontSize: '0.8rem' }}>Outcomes</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--tool-text-dim)' }}>Use <code>%random</code> in text/effects for rare outcomes.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                    <OutcomeColumn title="Success" color="var(--success-color)" data={data} prefix="pass" onChange={handleChange} storyId={storyId} qualityDefs={qualityDefs} />
                    {hasDifficulty && <OutcomeColumn title="Failure" color="var(--danger-color)" data={data} prefix="fail" onChange={handleChange} storyId={storyId} qualityDefs={qualityDefs} />}
                </div>
            </div>

            <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--tool-border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={onDelete} className="unequip-btn" style={{ width: 'auto', padding: '0.3rem 1rem' }}>Delete Option</button>
            </div>
        </div>
    );
}

function OutcomeColumn({ title, color, data, prefix, onChange, storyId, qualityDefs }: any) {
    return (
        <div className="outcome-column" style={{ 
            background: `color-mix(in srgb, ${color}, transparent 95%)`, /* Dynamic Tint */
            border: `1px solid color-mix(in srgb, ${color}, transparent 60%)` 
        }}>
            <h4 style={{ color: color, margin: '0 0 0.5rem 0' }}>{title}</h4>
            
            <SmartArea label="Narrative" value={data[`${prefix}_long`] || ''} onChange={v => onChange(`${prefix}_long`, v)} storyId={storyId} minHeight="80px" placeholder="What happens?" qualityDefs={qualityDefs} />
            
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