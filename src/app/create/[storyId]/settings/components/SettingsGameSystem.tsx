'use client';
import { WorldSettings, QualityDefinition, QualityType } from '@/engine/models';
import SmartArea from '@/components/admin/SmartArea';
import MissingEntityAlert from '@/components/admin/MissingEntityAlert';

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

    const checkMissing = (id: string) => id && !existingQIDs.includes(id.replace('$', '').trim());
    const isUndefinedOrMissing = (id: string) => !id || checkMissing(id);

    const renderMissingQuality = (id: string, type: QualityType) => {
        if (checkMissing(id)) {
            return (
                <MissingEntityAlert 
                    id={id} 
                    type="quality" 
                    storyId={storyId} 
                    onCreate={() => onCreateQuality(id, type)}
                    isRequired={true} 
                />
            );
        }
        return null;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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
            <div>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--tool-text-main)', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem' }}>
                    Challenge Physics
                </h4>
                <p className="form-label" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
                    Global defaults for Margin-based Probability. All fields are ScribeScript-enabled and can use the <code>target</code> keyword to make calculations relative to the check's target value.
                    <br/><a 
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
                        <SmartArea 
                            label="Default Margin" 
                            value={settings.challengeConfig?.defaultMargin || ''} 
                            onChange={v => handleChallengeChange('defaultMargin', v)} 
                            storyId={storyId} 
                            minHeight="38px" 
                            placeholder="target" 
                            subLabel="Can be a number (10), use the 'target' keyword (target / 2), or another $quality" 
                        />
                    </div>
                    <div style={{flex:1}}>
                        <SmartArea 
                            label="Base Pivot %" 
                            value={String(settings.challengeConfig?.basePivot ?? '')} 
                            onChange={v => handleChallengeChange('basePivot', v)} 
                            storyId={storyId} 
                            minHeight="38px" 
                            placeholder="60" 
                            subLabel="Success chance when Skill == Target" 
                            qualityDefs={qualityDefs}
                        />
                    </div>
                </div>
                <div className="form-row">
                    <div style={{flex:1}}>
                        <SmartArea 
                            label="Min Chance Cap %" 
                            value={String(settings.challengeConfig?.minCap ?? '')} 
                            onChange={v => handleChallengeChange('minCap', v)} 
                            storyId={storyId} 
                            minHeight="38px" 
                            placeholder="0" 
                            subLabel="Lowest possible success chance" 
                            qualityDefs={qualityDefs}
                        />
                    </div>
                    <div style={{flex:1}}>
                        <SmartArea 
                            label="Max Chance Cap %" 
                            value={String(settings.challengeConfig?.maxCap ?? '')} 
                            onChange={v => handleChallengeChange('maxCap', v)} 
                            storyId={storyId} 
                            minHeight="38px" 
                            placeholder="100" 
                            subLabel="Highest possible success chance" 
                            qualityDefs={qualityDefs}
                        />
                    </div>
                </div>
            </div>
            <div>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--tool-text-main)', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem' }}>
                    System Bindings
                </h4>
                <p className="special-desc" style={{ marginBottom: '1rem' }}>
                    Map Engine concepts to your specific Qualities. Toggling features off (like Identity) disables the need for a binding.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group">
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem', minHeight: '1.2rem'}}>
                            <label className="form-label" style={{marginBottom:0}}>Action Counter ID</label>
                        </div>
                        {settings.useActionEconomy ? (
                            <>
                                <input value={settings.actionId} onChange={e => handleChange('actionId', e.target.value)} className="form-input" placeholder="actions / $actions / custom_id" />
                                {renderMissingQuality(settings.actionId, QualityType.Counter)}
                                {isUndefinedOrMissing(settings.actionId) && (
                                    <p className="special-desc" style={{color: 'var(--tool-text-dim)', fontStyle: 'italic'}}>
                                        If undefined, engine uses ghost variable (max 20, regen enabled).
                                    </p>
                                )}
                            </>
                        ) : (
                            <div className="form-label" style={{color: 'var(--warning-color)', marginTop: '0.5rem'}}>Disabled</div>
                        )}
                    </div>
                    <div className="form-group">
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem', minHeight: '1.2rem'}}>
                            <label className="form-label" style={{marginBottom:0}}>Current Location ID</label>
                        </div>
                        <input value={settings.locationId || ''} onChange={e => handleChange('locationId', e.target.value)} className="form-input" placeholder="current_location / $current_location / custom_id" />
                        {settings.locationId && renderMissingQuality(settings.locationId, QualityType.String)}
                        
                        {isUndefinedOrMissing(settings.locationId || '') ? (
                            <p className="special-desc" style={{color: 'var(--tool-text-dim)', fontStyle: 'italic'}}>
                                If undefined, location is tracked internally only.
                            </p>
                        ) : (
                            <p className="special-desc" style={{color: 'var(--success-color)'}}>
                                Enabled. Setting this quality will trigger travel.
                            </p>
                        )}
                    </div>
                    <div className="form-group">
                         <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem', minHeight: '1.2rem'}}>
                            <label className="form-label" style={{marginBottom:0}}>Player Name ID</label>
                            <label className="toggle-label" style={{fontSize:'0.7rem'}}>
                                <input type="checkbox" checked={settings.hideProfileIdentity || false} onChange={e => handleChange('hideProfileIdentity', e.target.checked)} /> 
                                Anonymous
                            </label>
                        </div>

                        {!settings.hideProfileIdentity ? (
                            <>
                                <input value={settings.playerName} onChange={e => handleChange('playerName', e.target.value)} className="form-input" placeholder="player_name / $player_name / custom_id"  />
                                {renderMissingQuality(settings.playerName, QualityType.String)}
                                {isUndefinedOrMissing(settings.playerName) && (
                                    <p className="special-desc" style={{color: 'var(--tool-text-dim)', fontStyle: 'italic'}}>
                                        If undefined, character names will appear blank.
                                    </p>
                                )}
                            </>
                        ) : (
                            <div className="form-label" style={{color: 'var(--warning-color)', marginTop: '0.5rem'}}>Disabled</div>
                        )}
                    </div>
                    <div className="form-group">
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem', minHeight: '1.2rem'}}>
                            <label className="form-label" style={{marginBottom:0}}>Portrait ID</label>
                            <label className="toggle-label" style={{fontSize:'0.7rem'}}>
                                <input type="checkbox" checked={settings.enablePortrait !== false} onChange={e => handleChange('enablePortrait', e.target.checked)} disabled={settings.hideProfileIdentity} /> 
                                Show
                            </label>
                        </div>
                        {!settings.hideProfileIdentity && settings.enablePortrait !== false ? (
                            <>
                                <input value={settings.playerImage} onChange={e => handleChange('playerImage', e.target.value)} className="form-input" placeholder="player_portrait / $player_portrait / custom_id" />
                                {renderMissingQuality(settings.playerImage, QualityType.String)}
                                {isUndefinedOrMissing(settings.playerImage) && (
                                    <p className="special-desc" style={{color: 'var(--tool-text-dim)', fontStyle: 'italic'}}>
                                        If undefined, defaults to standard silhouette.
                                    </p>
                                )}
                            </>
                        ) : (
                            <div className="form-label" style={{color: 'var(--warning-color)', marginTop: '0.5rem'}}>Disabled</div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}