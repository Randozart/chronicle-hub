'use client';

import { ResolveOption } from '@/engine/models';

interface Props {
    data: ResolveOption;
    onChange: (data: ResolveOption) => void;
    onDelete: () => void;
}

export default function OptionEditor({ data, onChange, onDelete }: Props) {
    
    // Toggle States
    const hasDifficulty = !!data.random; 
    const hasRarePass = (data.rare_pass_chance || 0) > 0;
    const hasRareFail = (data.rare_fail_chance || 0) > 0;

    const handleChange = (field: keyof ResolveOption, val: any) => {
        if (field === 'random' && val === '') val = undefined;
        onChange({ ...data, [field]: val });
    };

    // Helpers
    const toggleDifficulty = () => handleChange('random', hasDifficulty ? undefined : "$luck >= 50");
    const toggleRarePass = () => handleChange('rare_pass_chance', hasRarePass ? undefined : 10);
    const toggleRareFail = () => handleChange('rare_fail_chance', hasRareFail ? undefined : 10);
    
    const toggleTag = (tags: string | undefined, tag: string) => {
        const tagList = (tags || '').split(',').map(s => s.trim()).filter(Boolean);
        const newTags = tagList.includes(tag) 
            ? tagList.filter(t => t !== tag) 
            : [...tagList, tag];
        handleChange('properties', newTags.join(', '));
    };

    return (
        <div className="space-y-4">
            
            {/* --- 1. MAIN INFO --- */}
            <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">Button Label (Name)</label>
                    <input 
                        value={data.name} 
                        onChange={e => handleChange('name', e.target.value)}
                        className="form-input"
                    />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Option ID</label>
                    <input 
                        value={data.id} 
                        disabled 
                        className="form-input" 
                        style={{ opacity: 0.6 }} 
                    />
                </div>
            </div>

            <div className="toggle-row">
                <label className="toggle-label">
                    <input 
                        type="checkbox" 
                        checked={(data.properties || '').includes('instant_redirect')}
                        onChange={() => toggleTag(data.properties, 'instant_redirect')}
                    />
                    Instant Redirect (No Result Text)
                </label>
            </div>

            <div className="form-group">
                <label className="form-label">Custom Tags</label>
                <input 
                    placeholder="other_tag"
                    value={data.properties || ''} 
                    onChange={e => handleChange('properties', e.target.value)}
                    className="form-input"
                />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">Image Code</label>
                    <input 
                        value={data.image_code || ''} 
                        onChange={e => handleChange('image_code', e.target.value)}
                        className="form-input"
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Action Cost</label>
                    <input 
                        value={data.action_cost || ''} 
                        onChange={e => handleChange('action_cost', e.target.value)}
                        className="form-input"
                        placeholder="1"
                    />
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">Properties (Tags)</label>
                    <input 
                        placeholder="e.g. instant_redirect"
                        value={data.properties || ''} 
                        onChange={e => handleChange('properties', e.target.value)}
                        className="form-input"
                    />
                </div>
            </div>
            
            <div className="form-group">
                <label className="form-label">Short Description (Tooltip)</label>
                <input 
                    value={data.short || ''} 
                    onChange={e => handleChange('short', e.target.value)}
                    className="form-input"
                />
            </div>

            <div className="form-group">
                <label className="form-label">Meta Text (Instruction)</label>
                <input 
                    value={data.meta || ''} 
                    onChange={e => handleChange('meta', e.target.value)}
                    className="form-input"
                    placeholder="e.g. 'This will consume your items'"
                    style={{ fontStyle: 'italic', color: '#aaa' }}
                />
            </div>

            {/* --- 2. REQUIREMENTS & LOGIC --- */}
            <div className="form-group" style={{ background: '#181a1f', padding: '0.75rem', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label className="form-label">Logic & Outcomes</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <input type="checkbox" checked={hasDifficulty} onChange={toggleDifficulty} /> 
                            Skill Check / Difficulty
                        </label>
                        <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <input type="checkbox" checked={hasRarePass} onChange={toggleRarePass} /> 
                            Rare Success
                        </label>
                        {hasDifficulty && (
                            <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input type="checkbox" checked={hasRareFail} onChange={toggleRareFail} /> 
                                Rare Failure
                            </label>
                        )}
                    </div>
                </div>

                <div className="form-row">
                    <input placeholder="Visible If..." value={data.visible_if || ''} onChange={e => handleChange('visible_if', e.target.value)} className="form-input" />
                    <input placeholder="Unlock If..." value={data.unlock_if || ''} onChange={e => handleChange('unlock_if', e.target.value)} className="form-input" />
                </div>

                {hasDifficulty && (
                    <div style={{ marginTop: '0.5rem' }}>
                        <input 
                            placeholder="Skill Check (e.g. $stat >= 50 [10])" 
                            value={data.random || ''} 
                            onChange={e => handleChange('random', e.target.value)}
                            className="form-input"
                            style={{ borderColor: '#d19a66', borderLeftWidth: '4px' }} 
                        />
                    </div>
                )}
            </div>

            {/* --- 3. OUTCOMES GRID (Using CSS Grid) --- */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '1rem',
                width: '100%' 
            }}>
                
                <OutcomeColumn 
                    title="STANDARD SUCCESS"
                    color="#2ecc71"
                    data={data}
                    prefix="pass" 
                    onChange={handleChange}
                />

                {hasRarePass && (
                    <OutcomeColumn 
                        title={`RARE SUCCESS (${data.rare_pass_chance}%)`}
                        color="#f1c40f"
                        data={data}
                        prefix="rare_pass"
                        onChange={handleChange}
                        chanceField="rare_pass_chance"
                    />
                )}

                {hasDifficulty && (
                    <OutcomeColumn 
                        title="FAILURE"
                        color="#e74c3c"
                        data={data}
                        prefix="fail"
                        onChange={handleChange}
                    />
                )}

                {hasDifficulty && hasRareFail && (
                    <OutcomeColumn 
                        title={`RARE FAILURE (${data.rare_fail_chance}%)`}
                        color="#c0392b"
                        data={data}
                        prefix="rare_fail"
                        onChange={handleChange}
                        chanceField="rare_fail_chance"
                    />
                )}
            </div>

            {/* --- FOOTER --- */}
            <div style={{ paddingTop: '1rem', borderTop: '1px solid #333', display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={onDelete} className="unequip-btn" style={{ width: 'auto', padding: '0.3rem 1rem', fontSize: '0.8rem' }}>Delete Option</button>
            </div>
        </div>
    );
}

function OutcomeColumn({ title, color, data, prefix, onChange, chanceField }: any) {
    return (
        <div className="outcome-column" style={{ 
            border: `1px solid ${color}`, 
            background: `${color}0D` 
        }}>
            <h4 style={{ color: color, margin: '0 0 0.5rem 0', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                {title}
                {chanceField && (
                    <input 
                        type="number" 
                        value={data[chanceField]} 
                        onChange={e => onChange(chanceField, parseInt(e.target.value))}
                        style={{ width: '50px', background: '#181a1f', border: '1px solid #333', color: '#fff', fontSize: '0.8rem' }} 
                    />
                )}
            </h4>
            
            <label className="form-label">Result Text</label>
            <textarea 
                value={data[`${prefix}_long`] || ''} 
                onChange={e => onChange(`${prefix}_long`, e.target.value)}
                className="form-textarea"
                rows={4}
            />

            <label className="form-label" style={{ marginTop: '0.5rem' }}>Quality Changes</label>
            <textarea 
                value={data[`${prefix}_quality_change`] || ''} 
                onChange={e => onChange(`${prefix}_quality_change`, e.target.value)}
                className="form-textarea"
                placeholder="$gold += 10"
                rows={2}
            />

            <label className="form-label" style={{ marginTop: '0.5rem' }}>Redirect To (ID)</label>
            <input 
                value={data[`${prefix}_redirect`] || ''} 
                onChange={e => onChange(`${prefix}_redirect`, e.target.value)}
                className="form-input"
            />

            <label className="form-label" style={{ marginTop: '0.5rem' }}>Move To (Location ID)</label>
            <input 
                value={data[`${prefix}_move_to`] || ''} 
                onChange={e => onChange(`${prefix}_move_to`, e.target.value)}
                className="form-input"
            />
        </div>
    );
}