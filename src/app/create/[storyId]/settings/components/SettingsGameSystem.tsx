'use client';
import { WorldSettings, QualityDefinition, QualityType } from '@/engine/models';
import SmartArea from '@/components/admin/SmartArea';

interface Props {
    settings: WorldSettings;
    onChange: (field: string, val: any) => void;
    storyId: string;
    qualityDefs: QualityDefinition[];
    onCreateQuality: (id: string, type: QualityType, extra?: any) => void;
    existingQIDs: string[];
}

export default function SettingsGameSystem({ settings, onChange, storyId, qualityDefs, onCreateQuality, existingQIDs }: Props) {
    
    const handleChange = (field: keyof WorldSettings, val: any) => onChange(field, val);
    const handleChallengeChange = (field: string, val: any) => {
        onChange('challengeConfig', { ...(settings.challengeConfig || {}), [field]: val });
    };

    // Helper to check missing system qualities
    const checkMissing = (id: string) => id && !existingQIDs.includes(id.replace('$', '').trim());

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* 1. ECONOMY */}
            <div>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--tool-text-main)', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem' }}>
                    Action Economy & Time
                </h4>
                
                <p className="special-desc" style={{ marginBottom: '1rem' }}>
                    Define how players spend energy. You can use logic (e.g. <code>{`{ 10 + $vitality }`}</code>) for dynamic caps/regen.
                </p>

                <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
                    <label className="toggle-label">
                        <input type="checkbox" checked={settings.useActionEconomy} onChange={e => handleChange('useActionEconomy', e.target.checked)} /> 
                        Enable Action Economy
                    </label>
                    <label className="toggle-label" style={{ opacity: settings.useActionEconomy ? 1 : 0.5 }}>
                        <input type="checkbox" checked={settings.deckDrawCostsAction} onChange={e => handleChange('deckDrawCostsAction', e.target.checked)} disabled={!settings.useActionEconomy} /> 
                        Drawing Cards Costs 1 Action
                    </label>
                </div>

                {settings.useActionEconomy ? (
                    <>
                        <div className="form-row">
                            <div style={{flex:1}}>
                                <SmartArea label="Max Actions" value={String(settings.maxActions)} onChange={v => handleChange('maxActions', v)} storyId={storyId} minHeight="38px" qualityDefs={qualityDefs} subLabel="e.g. 20 or { 10 + $endurance }"/>
                            </div>
                            <div style={{flex:1}}>
                                <SmartArea label="Regen Amount" value={String(settings.regenAmount)} onChange={v => handleChange('regenAmount', v)} storyId={storyId} minHeight="38px" qualityDefs={qualityDefs} subLabel="Actions restored per tick."/>
                            </div>
                            <div className="form-group" style={{flex:1}}>
                                <label className="form-label">Interval (Min)</label>
                                <input type="number" value={settings.regenIntervalInMinutes} onChange={e => handleChange('regenIntervalInMinutes', parseInt(e.target.value))} className="form-input" style={{ height: '40px' }}/>
                                <p className="special-desc">Real-time minutes per tick.</p>
                            </div>
                        </div>
                        <div className="form-row">
                            <div style={{ flex: 1 }}><SmartArea label="Default Action Cost" value={String(settings.defaultActionCost || "")} onChange={v => handleChange('defaultActionCost', v)} storyId={storyId} minHeight="38px" qualityDefs={qualityDefs} placeholder="1" subLabel="Cost per storylet choice." /></div>
                            <div style={{ flex: 1 }}><SmartArea label="Default Draw Cost" value={String(settings.defaultDrawCost || "")} onChange={v => handleChange('defaultDrawCost', v)} storyId={storyId} minHeight="38px" qualityDefs={qualityDefs} placeholder="1" subLabel="Cost per card draw." /></div>
                        </div>
                    </>
                ) : (
                    <div className="form-label">
                        Actions are free. Players can play unlimited storylets and draw cards without waiting.
                    </div>
                )}
            </div>

            {/* 2. PHYSICS */}
            <div>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--tool-text-main)', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem' }}>
                    Challenge Physics
                </h4>
                {/* ADD THIS SNIPPET */}
                <p className="special-desc" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
                    Global defaults for Margin-based Probability. 
                    <a 
                        href="/docs/scribescript#challenges" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ color: 'var(--tool-accent)', textDecoration: 'none', marginLeft: '8px' }}
                    >
                        Read Docs: Challenges
                    </a>
                </p>
                
                <div className="form-row">
                    <div style={{flex:1}}>
                        <SmartArea label="Default Margin" value={settings.challengeConfig?.defaultMargin || ''} onChange={v => handleChallengeChange('defaultMargin', v)} storyId={storyId} minHeight="38px" placeholder="$target" subLabel="Difficulty spread (e.g. Target +/- Margin)." />
                    </div>
                    <div className="form-group" style={{flex:1}}>
                        <label className="form-label">Base Pivot %</label>
                        <input type="number" value={settings.challengeConfig?.basePivot ?? 60} onChange={e => handleChallengeChange('basePivot', parseInt(e.target.value))} className="form-input" style={{ height: '40px' }} />
                        <p className="special-desc">Success chance when Skill == Target.</p>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group" style={{flex:1}}>
                        <label className="form-label">Min Chance Cap %</label>
                        <input type="number" value={settings.challengeConfig?.minCap ?? 0} onChange={e => handleChallengeChange('minCap', parseInt(e.target.value))} className="form-input" style={{ height: '40px' }} />
                        <p className="special-desc">Lowest possible success chance (e.g. 1% to prevent impossible checks).</p>
                    </div>
                    <div className="form-group" style={{flex:1}}>
                        <label className="form-label">Max Chance Cap %</label>
                        <input type="number" value={settings.challengeConfig?.maxCap ?? 100} onChange={e => handleChallengeChange('maxCap', parseInt(e.target.value))} className="form-input" style={{ height: '40px' }} />
                        <p className="special-desc">Highest possible success chance (e.g. 99% to ensure risk of failure).</p>
                    </div>
                </div>
            </div>

            {/* 3. BINDINGS */}
            <div>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--tool-text-main)', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem' }}>
                    System Bindings
                </h4>
                <p className="special-desc" style={{ marginBottom: '1rem' }}>
                    Map Engine concepts to your specific Qualities. Toggling features off (like Identity) disables the need for a binding.
                </p>
                
                <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem', minHeight: '1.2rem'}}>
                            <label className="form-label" style={{marginBottom:0}}>Action Counter ID</label>
                        </div>

                            {settings.useActionEconomy ? (
                                <>
                                    <input value={settings.actionId} onChange={e => handleChange('actionId', e.target.value)} className="form-input" placeholder="$actions" />
                                    {checkMissing(settings.actionId) && <button onClick={() => onCreateQuality(settings.actionId, QualityType.Counter)} className="quick-create-btn">Create {settings.actionId}</button>}
                                </>
                            ) : (
                                <div className="form-label" style = {{color: 'var(--warning-color)', marginTop: '1rem'}}>Disabled (Economy Inactive)</div>
                            )}
                    </div>

                    <div className="form-group" style={{ flex: 1 }}>
                         <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem', minHeight: '1.2rem'}}>
                            <label className="form-label" style={{marginBottom:0}}>Player Name ID</label>
                            <label className="toggle-label" style={{fontSize:'0.7rem'}}>
                                <input type="checkbox" checked={settings.hideProfileIdentity || false} onChange={e => handleChange('hideProfileIdentity', e.target.checked)} /> 
                                Anonymous
                            </label>
                        </div>

                        {!settings.hideProfileIdentity ? (
                            <>
                                <input value={settings.playerName} onChange={e => handleChange('playerName', e.target.value)} className="form-input" placeholder="$player_name" />
                                {checkMissing(settings.playerName) && <button onClick={() => onCreateQuality(settings.playerName, QualityType.String)} className="quick-create-btn">Create {settings.playerName}</button>}
                            </>
                        ) : (
                            <div className="form-label" style = {{color: 'var(--warning-color)', marginTop: '1rem'}}>Disabled (Anonymous Protagonist)</div>
                        )}
                    </div>

                    <div className="form-group" style={{ flex: 1 }}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem', minHeight: '1.2rem'}}>
                            <label className="form-label" style={{marginBottom:0}}>Portrait ID</label>
                            <label className="toggle-label" style={{fontSize:'0.7rem'}}>
                                <input type="checkbox" checked={settings.enablePortrait !== false} onChange={e => handleChange('enablePortrait', e.target.checked)} disabled={settings.hideProfileIdentity} /> 
                                Show
                            </label>
                        </div>
                        {!settings.hideProfileIdentity && settings.enablePortrait !== false ? (
                            <>
                                <input value={settings.playerImage} onChange={e => handleChange('playerImage', e.target.value)} className="form-input" placeholder="$player_portrait" />
                                {checkMissing(settings.playerImage) && <button onClick={() => onCreateQuality(settings.playerImage, QualityType.String)} className="quick-create-btn">Create {settings.playerImage}</button>}
                            </>
                        ) : (
                            <div className="form-label" style = {{color: 'var(--warning-color)', marginTop: '1rem'}}>Disabled (Portrait Hidden)</div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .info-box { padding: 0.8rem; background: rgba(255,255,255,0.05); border-radius: 4px; color: var(--tool-text-dim); font-style: italic; font-size: 0.9rem; }
                .disabled-input { padding: 0.6rem; border: 1px dashed var(--tool-border); color: var(--tool-text-dim); border-radius: 4px; font-size: 0.85rem; background: rgba(0,0,0,0.2); }
                .quick-create-btn { margin-top: 5px; font-size: 0.75rem; background: var(--success-color); color: #000; border: none; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-weight: bold; }
                .special-desc { font-size: 0.8rem; color: var(--tool-text-dim); margin-top: 4px; }
            `}</style>
        </div>
    );
}