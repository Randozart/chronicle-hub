// src/app/create/[storyId]/settings/page.tsx
'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { WorldSettings, QualityType, CharCreateRule, QualityDefinition } from '@/engine/models';
import CollaboratorManager from './components/CollaboratorManager';
import ThemePreview from './components/ThemePreview';
import SmartArea from '@/components/admin/SmartArea';

interface SettingsForm extends WorldSettings {
    char_create: Record<string, CharCreateRule>;
    isPublished?: boolean; 
    coverImage?: string;
    tags?: string[];
    deckDrawCostsAction?: boolean; 
}

export default function SettingsAdmin ({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    
    const [form, setForm] = useState<SettingsForm>({
        useActionEconomy: true,
        maxActions: 20,
        actionId: "$actions",
        regenIntervalInMinutes: 10,
        regenAmount: 1,
        defaultActionCost: 1,
        defaultDrawCost: "1", 
        characterSheetCategories: [],
        equipCategories: [],
        currencyQualities: [],
        playerName: "$player_name",
        playerImage: "$player_portrait",
        deckDrawCostsAction: true, 
        char_create: {}, 
        layoutStyle: 'nexus',
        visualTheme: 'default',
        startLocation: 'village',
        enablePortrait: true,
        enableTitle: false,
        allowScribeScriptInInputs: false,
    });
    
    const [existingQIDs, setExistingQIDs] = useState<string[]>([]); 
    const [existingLocIDs, setExistingLocIDs] = useState<string[]>([]); 
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [sRes, cRes, qRes, lRes] = await Promise.all([
                    fetch(`/api/admin/settings?storyId=${storyId}`),
                    fetch(`/api/admin/char_create?storyId=${storyId}`),
                    fetch(`/api/admin/qualities?storyId=${storyId}`),
                    fetch(`/api/admin/locations?storyId=${storyId}`)
                ]);
                
                const sData = await sRes.json();
                const cData = cRes.ok ? await cRes.json() : {};
                const qData = qRes.ok ? await qRes.json() : {};
                const lData = lRes.ok ? await lRes.json() : {};

                setExistingQIDs(Object.keys(qData));
                setExistingLocIDs(Object.keys(lData));

                const normalizedCharCreate: Record<string, CharCreateRule> = {};
                for (const key in cData) {
                    const val = cData[key];
                    if (typeof val === 'string') {
                        normalizedCharCreate[key] = {
                            type: val.includes('|') ? 'label_select' : (val === 'string' ? 'string' : 'static'),
                            rule: val === 'string' ? '' : val,
                            visible: val !== 'static' && !(!isNaN(Number(val))), 
                            readOnly: false,
                            visible_if: ''
                        };
                    } else {
                        normalizedCharCreate[key] = val;
                    }
                }

                setForm(prev => ({ 
                    ...prev, 
                    ...sData,
                    characterSheetCategories: sData.characterSheetCategories || [],
                    equipCategories: sData.equipCategories || [],
                    currencyQualities: sData.currencyQualities || [],
                    char_create: normalizedCharCreate,
                    challengeConfig: sData.challengeConfig || {}
                }));
            } catch (e) {
                console.error("Failed to load settings", e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [storyId]);

    const handleChange = (field: keyof SettingsForm, val: any) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    const handleArrayChange = (field: 'characterSheetCategories' | 'equipCategories' | 'tags' | 'currencyQualities', strVal: string) => {
        const arr = strVal.split(',').map(s => s.trim()).filter(Boolean);
        setForm(prev => ({ ...prev, [field]: arr }));
    };
    
    const handleChallengeChange = (field: string, val: any) => {
        setForm(prev => ({
            ...prev,
            challengeConfig: {
                ...prev.challengeConfig,
                [field]: val
            }
        }));
    };

    const createQuality = async (qid: string, type: QualityType = QualityType.Counter, extra: Partial<QualityDefinition> = {}) => {
        const cleanId = qid.replace('$', '').trim();
        if (existingQIDs.includes(cleanId)) return;

        const newQuality: QualityDefinition = {
            id: cleanId,
            name: cleanId.charAt(0).toUpperCase() + cleanId.slice(1).replace(/_/g, ' '),
            type: type,
            category: 'system',
            description: 'Auto-generated system quality.',
            ...extra
        };

        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'qualities', itemId: cleanId, data: newQuality })
            });
            setExistingQIDs(prev => [...prev, cleanId]); 
        } catch(e) { console.error(e); }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'settings', itemId: 'settings', data: { ...form, char_create: undefined, isPublished: undefined } })
            });
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'char_create', itemId: 'rules', data: form.char_create })
            });
            await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId, category: 'root', itemId: 'published', data: form.isPublished }) });
            await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId, category: 'root', itemId: 'coverImage', data: form.coverImage }) });
            await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId, category: 'root', itemId: 'tags', data: form.tags }) });

            alert("Saved!");
        } catch (e) { console.error(e); alert("Error saving."); } 
        finally { setIsSaving(false); }
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    const cleanID = (id: string) => id.replace('$', '').trim();
    const missingSystemQualities = [
        { id: form.actionId, type: QualityType.Counter },
        { id: form.playerName, type: QualityType.String },
        { id: form.playerImage, type: QualityType.String }
    ].filter(q => q.id && !existingQIDs.includes(q.id.replace('$', '')));
    
    const isStartLocationValid = !form.startLocation || existingLocIDs.includes(form.startLocation);

    // 1. Validate Global Setting
    const isGlobalLocationValid = !form.startLocation || existingLocIDs.includes(form.startLocation);

    // 2. Validate Character Creation Logic ($location)
    let charCreateLocationError = "";
    const locRule = form.char_create['$location'];

    if (locRule) {
        if (['label_select', 'image_select', 'labeled_image_select'].includes(locRule.type)) {
            // Format: "id:Label | id2:Label" -> Extract IDs
            const options = locRule.rule.split('|').map(opt => opt.split(':')[0].trim());
            const invalidIds = options.filter(id => !existingLocIDs.includes(id));
            
            if (invalidIds.length > 0) {
                charCreateLocationError = `⚠️ Rule contains invalid Location IDs: ${invalidIds.join(', ')}`;
            }
        } else if (locRule.type === 'static' && !locRule.rule.trim().startsWith('{')) {
            // Format: "village_id" (Direct string, not ScribeScript block)
            if (!existingLocIDs.includes(locRule.rule.trim())) {
                charCreateLocationError = `⚠️ Rule points to invalid Location ID: '${locRule.rule}'`;
            }
        }
    }
    
    return (
        <div className="admin-editor-col" style={{ maxWidth: '900px', margin: '0 auto' }}>            
            
            <div style={{ borderBottom: '1px solid #444', paddingBottom: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>Game Settings</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: form.isPublished ? '#2ecc71' : '#e74c3c', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                            {form.isPublished ? 'LIVE' : 'PRIVATE'}
                        </span>
                        <label className="toggle-label">
                            <input type="checkbox" checked={form.isPublished || false} onChange={e => handleChange('isPublished', e.target.checked)} />
                            Publish
                        </label>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Cover Image URL</label>
                        <input value={form.coverImage || ''} onChange={e => handleChange('coverImage', e.target.value)} className="form-input" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Tags</label>
                        <input defaultValue={form.tags?.join(', ')} onBlur={e => handleArrayChange('tags', e.target.value)} className="form-input" placeholder="fantasy, sci-fi" />
                    </div>
                </div>
            </div>

            <div className="special-field-group" style={{ borderColor: '#e5c07b' }}>
                <label className="special-label" style={{ color: '#e5c07b' }}>System Bindings</label>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.8rem', color: '#ccc' }}>
                    <strong>Map Engine Concepts to Data:</strong> The engine is agnostic. It does not know what "Health" or "Gold" is. 
                    Use these fields to tell the engine which of your Qualities represent core system features.
                </div>
                
                {missingSystemQualities.length > 0 && (
                    <div style={{ background: 'rgba(231, 76, 60, 0.1)', border: '1px solid #e74c3c', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem' }}>
                        <p style={{ margin: '0 0 0.5rem 0', color: '#e74c3c', fontSize: '0.8rem', fontWeight: 'bold' }}>Missing Quality Definitions:</p>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {missingSystemQualities.map(q => (
                                <button key={q.id} onClick={() => createQuality(q.id, q.type)} style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px' }}>+ Create {q.id}</button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="form-row" style={{ marginTop: '1.5rem' }}>
                    <div className="form-group">
                        <label className="form-label">Action Counter ID</label>
                        <input value={form.actionId} onChange={e => handleChange('actionId', e.target.value)} className="form-input" placeholder="$actions" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Player Name ID</label>
                        <input value={form.playerName} onChange={e => handleChange('playerName', e.target.value)} className="form-input" placeholder="$player_name" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Player Portrait ID</label>
                        <input value={form.playerImage} onChange={e => handleChange('playerImage', e.target.value)} className="form-input" placeholder="$player_portrait" />
                    </div>
                </div>
                <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label className="form-label">Starting Location ID</label>
                    <input 
                        value={form.startLocation || ''} 
                        onChange={e => handleChange('startLocation', e.target.value)} 
                        className="form-input" 
                        placeholder="village" 
                        disabled={!!locRule}
                        style={{
                            // If managed by logic, dim it. If invalid (and active), red border.
                            ...(!!locRule ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                            ...(!isGlobalLocationValid && !locRule ? { borderColor: '#e74c3c' } : {})
                        }}
                    />
                    
                    {/* FEEDBACK AREA */}
                    {locRule ? (
                        <div style={{ marginTop: '0.25rem' }}>
                            <p style={{ color: '#e5c07b', fontSize: '0.8rem', margin: 0 }}>
                                🔒 <strong>Managed via Logic:</strong> Defined by the <code>$location</code> rule in Character Initialization.
                            </p>
                            {charCreateLocationError && (
                                <p style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '0.25rem', fontWeight: 'bold' }}>
                                    {charCreateLocationError}
                                </p>
                            )}
                        </div>
                    ) : (
                        <>
                            {!isGlobalLocationValid && (
                                <p style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                    ⚠️ Warning: Location ID '{form.startLocation}' not found in Locations list.
                                </p>
                            )}
                            <p className="special-desc">Where new characters spawn.</p>
                        </>
                    )}
                </div>
            </div>


            <div className="special-field-group" style={{ borderColor: '#61afef' }}>
                <label className="special-label" style={{ color: '#61afef' }}>Game Rules & Action Economy</label>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.8rem', color: '#ccc' }}>
                    <strong>Energy System:</strong> Configure how the player spends and regains actions. 
                    Values like "Max Actions" or "Regen Amount" can be <strong>Dynamic Logic</strong> (e.g. <code>{`{ 10 + $vitality }`}</code>), allowing stats to affect the economy.
                </div>
                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '2rem' }}>
                    <label className="toggle-label">
                        <input type="checkbox" checked={form.useActionEconomy} onChange={e => handleChange('useActionEconomy', e.target.checked)} />
                        Enable Action/Time Economy
                    </label>
                    
                    <label className="toggle-label">
                        <input type="checkbox" checked={form.deckDrawCostsAction !== false} onChange={e => handleChange('deckDrawCostsAction', e.target.checked)} />
                        Drawing Cards Costs Action
                    </label>
                </div>

                {form.useActionEconomy && (
                    <div className="form-row">
                         <div className="form-group" style={{ flex: 1 }}>
                            <SmartArea label="Max Actions" value={String(form.maxActions)} onChange={v => handleChange('maxActions', v)} storyId={storyId} minHeight="38px" placeholder="20" subLabel="Logic allowed (e.g. {10 + $vit})" />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <SmartArea label="Regen Amount" value={String(form.regenAmount)} onChange={v => handleChange('regenAmount', v)} storyId={storyId} minHeight="38px" placeholder="1" subLabel="Added every interval." />
                        </div>
                         <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Interval (Min)</label>
                            <input type="number" value={form.regenIntervalInMinutes} onChange={e => handleChange('regenIntervalInMinutes', parseInt(e.target.value))} className="form-input" />
                            <p className="special-desc">Real-time minutes per tick. Does not allow for ScribeScript logic.</p>
                        </div>
                    </div>
                )}
                 <div className="form-row">
                    <div style={{ flex: 1 }}><SmartArea label="Default Action Cost" value={String(form.defaultActionCost || "")} onChange={v => handleChange('defaultActionCost', v)} storyId={storyId} minHeight="38px" placeholder="1" subLabel="Cost per storylet choice." /></div>
                    <div style={{ flex: 1 }}><SmartArea label="Default Draw Cost" value={String(form.defaultDrawCost || "")} onChange={v => handleChange('defaultDrawCost', v)} storyId={storyId} minHeight="38px" placeholder="1" subLabel="Cost per card draw." /></div>
                </div>
                
                <div className="form-group" style={{ marginTop: '1rem', borderTop: '1px dashed #444', paddingTop: '1rem' }}>
                    <label className="toggle-label">
                        <input type="checkbox" checked={form.allowScribeScriptInInputs || false} onChange={e => handleChange('allowScribeScriptInInputs', e.target.checked)} />
                        Allow ScribeScript in Player Inputs
                    </label>
                    <p className="special-desc" style={{ color: form.allowScribeScriptInInputs ? '#e74c3c' : '#777' }}>
                        {form.allowScribeScriptInInputs 
                            ? "WARNING: Players can use ScribeScript logic in their name and other text fields." 
                            : "Secure Mode (Default): Braces {} in player input are treated as plain text."}
                    </p>
                </div>
            </div>
            
            {/* 4. CHALLENGE PHYSICS (Unchanged) */}
            <div className="special-field-group" style={{ borderColor: '#f1c40f' }}>
                <label className="special-label" style={{ color: '#f1c40f' }}>Challenge Physics</label>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.8rem', color: '#ccc' }}>
                    <strong>Global Probability Settings:</strong> These defaults are used by the <code>%chance</code> macro if specific parameters (margin, pivot) are not provided in the call. <code>$target</code> lets you use the target number in the margin calculation. 
                    Otherwise it defaults to <code>0</code> - <code>2 * target number</code>.
                </div>
                <div className="form-row" style={{ marginTop: '1rem' }}>
                    <div className="form-group">
                        <SmartArea label="Default Margin" value={form.challengeConfig?.defaultMargin || ''} onChange={v => handleChallengeChange('defaultMargin', v)} storyId={storyId} minHeight="38px" placeholder="$target" />
                    </div>
                    <div className="form-group"><label className="form-label">Pivot %</label><input type="number" value={form.challengeConfig?.basePivot ?? 60} onChange={e => handleChallengeChange('basePivot', parseInt(e.target.value))} className="form-input" /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Min Chance %</label><input type="number" value={form.challengeConfig?.minCap ?? 0} onChange={e => handleChallengeChange('minCap', parseInt(e.target.value))} className="form-input" /></div>
                    <div className="form-group"><label className="form-label">Max Chance %</label><input type="number" value={form.challengeConfig?.maxCap ?? 100} onChange={e => handleChallengeChange('maxCap', parseInt(e.target.value))} className="form-input" /></div>
                </div>
            </div>

            {/* 5. ECONOMY & UI Categories */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.8rem', color: '#ccc' }}>
                <strong>Organization:</strong> Define which qualities appear in specific parts of the player interface. Qualities not matching these categories will be hidden from the sidebar.
            </div>
            <div className="special-field-group" style={{ borderColor: '#2ecc71' }}>
                <label className="special-label" style={{ color: '#2ecc71' }}>Economy & UI Layout</label>

                <div className="form-group">
                    <label className="form-label">Currencies</label>
                    <input defaultValue={form.currencyQualities?.join(', ')} onBlur={e => handleArrayChange('currencyQualities', e.target.value)} className="form-input" placeholder="gold, echoes" />
                    <p className="special-desc">Comma-separated IDs. These appear in the top wallet bar.</p>
                </div>
                <div className="form-group">
                    <label className="form-label">Sidebar Categories</label>
                    <input defaultValue={form.characterSheetCategories.join(', ')} onBlur={e => handleArrayChange('characterSheetCategories', e.target.value)} className="form-input" placeholder="character, menace" />
                    <p className="special-desc">Qualities with these categories appear in the main sidebar.</p>
                </div>
                <div className="form-group">
                    <label className="form-label">Equipment Slots</label>
                    <input defaultValue={form.equipCategories?.join(', ')} onBlur={e => handleArrayChange('equipCategories', e.target.value)} className="form-input" placeholder="head, body" />
                    <p className="special-desc">Creates wearable slots for items matching these categories.</p>
                </div>
            </div>

            {/* 6. VISUALS (Unchanged) */}
             <div className="special-field-group" style={{ borderColor: '#c678dd' }}>
                <label className="special-label" style={{ color: '#c678dd' }}>Visuals</label>
                 <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Layout & Theme</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                             <select value={form.layoutStyle || 'nexus'} onChange={e => handleChange('layoutStyle', e.target.value as any)} className="form-select">
                                <option value="nexus">Classic</option>
                                <option value="london">Cinematic</option>
                                <option value="elysium">Immersive</option>
                                <option value="tabletop">Tabletop</option>
                            </select>
                            <select value={form.visualTheme || 'default'} onChange={e => handleChange('visualTheme', e.target.value)} className="form-select">
                                <option value="default">Default</option>
                                <option value="victorian">Victorian</option>
                                <option value="terminal">Terminal</option>
                                <option value="parchment">Parchment</option>
                                <option value="noir">Noir</option>
                                <option value="cyberpunk">Cyberpunk</option>
                                <option value="dark-fantasy">Dark Fantasy</option>
                                <option value="pirate">Pirate</option>
                                <option value="solarpunk">Solarpunk</option>
                                <option value="lab">Laboratory</option>
                                <option value="druidic">Druidic</option>
                                <option value="neo-tokyo">Synthwave</option>
                                <option value="gothic">Gothic</option>
                                <option value="western">Western</option>
                                <option value="grimdark-sci-fi">Dark Sci-Fi</option>
                                <option value="jrpg-bright">Bright JRPG</option>
                                <option value="abyssal">Abyssal</option>
                                <option value="arcanotech">Magitech</option>
                                <option value="terminal-amber">VT220</option>
                                <option value="arabesque">Arabesque</option>
                                <option value="art-deco">Art Deco</option>
                                <option value="steampunk">Steampunk</option>
                                <option value="candy">Bubblegum</option>
                                <option value="stone-dwarven">Mountain Dwarf</option>
                                <option value="classic-scifi">Classic Sci-Fi</option>
                                <option value="revolutionary">Revolutionary</option>
                                <option value="solar">Utopia</option>
                                <option value="occult-academic">Occult Academia</option>
                                <option value="renaissance">Renaissance</option>
                                <option value="ink-brass">Dieselpunk</option>
                                <option value="ukiyoe">Ukiyo-e</option>
                                <option value="imperial-rome">Imperial Rome</option>
                                <option value="corpocracy">Corpocracy</option>
                                <option value="witch-folk">Witch Folk</option>
                                <option value="vaporwave">Vaporwave</option>
                                <option value="nordic">Nordic</option>
                                <option value="frontier">Frontier</option>
                                <option value="bayou">Bayou</option>
                                <option value="starship">Starship</option>
                                <option value="dark-parchment">Dark Parchment</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <ThemePreview theme={form.visualTheme || 'default'} />
                    </div>
                </div>
                 <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem' }}>
                    <label className="toggle-label"><input type="checkbox" checked={form.enablePortrait !== false} onChange={e => handleChange('enablePortrait', e.target.checked)} /> Show Portrait</label>
                    {form.enablePortrait !== false && (
                         <div className="form-group" style={{ marginTop: '0' }}>
                            <select value={form.portraitStyle || 'circle'} onChange={e => handleChange('portraitStyle', e.target.value as any)} className="form-select" style={{ fontSize: '0.8rem', padding: '2px 8px' }}>
                                <option value="circle">Circle</option>
                                <option value="square">Square</option>
                                <option value="rect">Portrait</option>
                            </select>
                         </div>
                     )}
                     <label className="toggle-label"><input type="checkbox" checked={form.enableTitle || false} onChange={e => handleChange('enableTitle', e.target.checked)} /> Show Title</label>
                     <label className="toggle-label"><input type="checkbox" checked={form.enableParallax !== false} onChange={e => handleChange('enableParallax', e.target.checked)} /> Parallax</label>
                 </div>
                 {form.enableTitle && (
                     <div className="form-group" style={{marginTop:'0.5rem'}}><label className="form-label">Title Quality ID</label><input value={form.titleQualityId || ''} onChange={e => handleChange('titleQualityId', e.target.value)} className="form-input" placeholder="$current_title" /></div>
                 )}
            </div>

            {/* 8. CHARACTER INITIALIZATION */}
            <div style={{ marginBottom: '3rem' }}>
                <CharCreateEditor 
                    rules={form.char_create || {}} 
                    onChange={r => handleChange('char_create', r)} 
                    systemKeys={{
                        actions: form.actionId,
                        name: form.playerName,
                        image: form.playerImage
                    }}
                    storyId={storyId}
                    existingQIDs={existingQIDs}
                    onCreateQuality={createQuality}
                />
            </div>
            
            <CollaboratorManager storyId={storyId} />
            <div className="admin-form-footer" style={{ justifyContent: 'flex-end' }}><button onClick={handleSave} disabled={isSaving} className="save-btn">{isSaving ? 'Saving...' : 'Save All Settings'}</button></div>
        </div>
    );
}

// --- CHAR CREATE EDITOR SUB-COMPONENT ---

interface CharCreateProps {
    rules: Record<string, CharCreateRule>;
    onChange: (r: Record<string, CharCreateRule>) => void;
    systemKeys: { actions: string; name: string; image: string };
    storyId: string; 
    existingQIDs: string[];
    onCreateQuality: (id: string, type: QualityType, extra?: any) => void;
}

function CharCreateEditor({ rules, onChange, systemKeys, storyId, existingQIDs, onCreateQuality }: CharCreateProps) {
    const [newKey, setNewKey] = useState("");
    
    // ... (Dependency logic same as before) ...
    const { hierarchy, depthMap, roots } = useMemo(() => {
        const h: Record<string, string[]> = {};
        const parents: Record<string, string> = {};
        
        Object.keys(rules).forEach(key => {
            const rule = rules[key];
            if (rule.visible_if) {
                const match = rule.visible_if.match(/\$([a-zA-Z0-9_]+)/);
                if (match) {
                    const parentId = `$${match[1]}`;
                    if (rules[parentId]) {
                        if (!h[parentId]) h[parentId] = [];
                        h[parentId].push(key);
                        parents[key] = parentId;
                    }
                }
            }
        });
        const roots = Object.keys(rules).filter(k => !parents[k]);
        const d: Record<string, number> = {};
        const calcDepth = (k: string, lvl: number) => {
            d[k] = lvl;
            if (h[k]) h[k].forEach(child => calcDepth(child, lvl + 1));
        };
        roots.forEach(k => calcDepth(k, 0));
        return { hierarchy: h, depthMap: d, roots };
    }, [rules]);

    const renderOrder: string[] = [];
    const traverse = (key: string) => {
        renderOrder.push(key);
        if (hierarchy[key]) hierarchy[key].forEach(traverse);
    };
    roots.forEach(traverse);
    // Add orphans
    Object.keys(rules).forEach(k => { if(!renderOrder.includes(k)) renderOrder.push(k); });

    const handleUpdate = (key: string, field: keyof CharCreateRule, val: any) => {
        onChange({ ...rules, [key]: { ...rules[key], [field]: val } });
    };

    const handleDelete = (key: string) => { const next = { ...rules }; delete next[key]; onChange(next); };

    const handleAdd = () => { 
        const qid = newKey.startsWith('$') ? newKey : `$${newKey}`;
        onChange({ ...rules, [qid]: { type: 'static', rule: "0", visible: false, readOnly: false, visible_if: '' } }); 
        setNewKey(""); 
    };

    // --- PRESETS ---
    const addPronounSystem = () => {
        onCreateQuality('pronouns', QualityType.String, { tags: ['hidden'], text_variants: {
            "subject": "{ $.stringValue == 'he/him' ? 'he' : ($.stringValue == 'she/her' ? 'she' : ($.stringValue == 'they/them' ? 'they' : {$prn_subj})) }",
            "object": "{ $.stringValue == 'he/him' ? 'him' : ($.stringValue == 'she/her' ? 'her' : ($.stringValue == 'they/them' ? 'them' : {$prn_obj})) }",
            "possessive": "{ $.stringValue == 'he/him' ? 'his' : ($.stringValue == 'she/her' ? 'her' : ($.stringValue == 'they/them' ? 'their' : {$prn_poss})) }",
        }});
        onCreateQuality('prn_subj', QualityType.String, { name: "Subject", tags: ['hidden'] });
        onCreateQuality('prn_obj', QualityType.String, { name: "Object", tags: ['hidden'] });
        onCreateQuality('prn_poss', QualityType.String, { name: "Possessive", tags: ['hidden'] });

        const newRules = { ...rules };
        newRules['$pronouns'] = { type: 'label_select', rule: "he/him:He/Him | she/her:She/Her | they/them:They/Them | Custom:Custom", visible: true, readOnly: false, visible_if: '' };
        newRules['$prn_subj'] = { type: 'string', rule: '', visible: true, readOnly: false, visible_if: "$pronouns == 'Custom'" };
        newRules['$prn_obj'] = { type: 'string', rule: '', visible: true, readOnly: false, visible_if: "$pronouns == 'Custom'" };
        newRules['$prn_poss'] = { type: 'string', rule: '', visible: true, readOnly: false, visible_if: "$pronouns == 'Custom'" };
        onChange(newRules);
    };
    
    // NEW PRESET: Simple Identity
    const addSimpleIdentity = () => {
        const newRules = { ...rules };
        newRules['$player_name'] = { type: 'string', rule: '', visible: true, readOnly: false, visible_if: '' };
        onChange(newRules);
    };

    // NEW PRESET: Complex Identity
    const addComplexIdentity = () => {
        onCreateQuality('first_name', QualityType.String);
        onCreateQuality('last_name', QualityType.String);
        const newRules = { ...rules };
        newRules['$first_name'] = { type: 'string', rule: '', visible: true, readOnly: false, visible_if: '' };
        newRules['$last_name'] = { type: 'string', rule: '', visible: true, readOnly: false, visible_if: '' };
        newRules['$player_name'] = { type: 'static', rule: "{$first_name} {$last_name}", visible: true, readOnly: true, visible_if: '' };
        onChange(newRules);
    };

    // NEW PRESET: Simple Stats
    const addSimpleStats = () => {
        onCreateQuality('body', QualityType.Pyramidal);
        onCreateQuality('mind', QualityType.Pyramidal);
        onCreateQuality('spirit', QualityType.Pyramidal);
        const newRules = { ...rules };
        newRules['$body'] = { type: 'static', rule: "10", visible: true, readOnly: true, visible_if: '' };
        newRules['$mind'] = { type: 'static', rule: "10", visible: true, readOnly: true, visible_if: '' };
        newRules['$spirit'] = { type: 'static', rule: "10", visible: true, readOnly: true, visible_if: '' };
        onChange(newRules);
    };

    // NEW PRESET: Variable Start Location
    const addVariableLocation = () => {
        // Requires user to have created locations first ideally, but we can set up the structure
        const newRules = { ...rules };
        newRules['$location'] = { type: 'label_select', rule: "village:The Village | city:The City", visible: true, readOnly: false, visible_if: '' };
        onChange(newRules);
    };

    const addClassSystem = () => {
        // 1. Define the Qualities
        
        // Core Attributes
        onCreateQuality('class', QualityType.String, { 
            name: "Character Class",
            category: "Identity" 
        });
        onCreateQuality('strength', QualityType.Pyramidal, { name: "Strength", category: "Attributes" });
        onCreateQuality('intellect', QualityType.Pyramidal, { name: "Intellect", category: "Attributes" });
        onCreateQuality('dexterity', QualityType.Pyramidal, { name: "Dexterity", category: "Attributes" });
        onCreateQuality('protection', QualityType.Counter, { name: "Protection", category: "Hidden" }); // Needed for armor

        // Skills (Dynamic Names based on Level)
        onCreateQuality('armor_skill', QualityType.Counter, {
            name: "Armor Proficiency",
            category: "Skills",
            // Logic: Checks level ($) to return text
            description: "{ $. == 3 : 'Heavy Armor' | $. == 2 : 'Medium Armor' | $. == 1 : 'Light Armor' | 'Unarmored' }"
        });

        onCreateQuality('magical_studies', QualityType.Pyramidal, {
            name: "Magical Studies",
            category: "Skills",
            description: "{ $. >= 10 : 'Archmage' | $. >= 5 : 'Adept' | $. >= 1 : 'Novice' | 'Uninitiated' }"
        });

        onCreateQuality('thievery', QualityType.Pyramidal, {
            name: "Thievery",
            category: "Skills",
            description: "{ $. >= 10 : 'Master Thief' | $. >= 5 : 'Burglar' | $. >= 1 : 'Pickpocket' | 'Honest' }"
        });

        // Equipment
        // Note: The bonus field uses ScribeScript to conditionally apply the dexterity penalty!
        onCreateQuality('starting_plate', QualityType.Equipable, {
            name: "Old Plate Armor",
            category: "Body", // Assuming you have a 'Body' slot defined in settings
            // Logic: If Skill >= 3, just Protection. Else, Protection AND Dex penalty.
            bonus: "{ $armor_skill >= 3 : '$protection + 5' | '$protection + 5, $dexterity - 5' }",
            description: "A heavy suit of iron. { $armor_skill < 3 : '**You lack the skill to move freely in this.**' | 'It fits like a second skin.' }",
            tags: ['auto_equip'] // Automatically equip when given
        });

        onCreateQuality('thieves_tools', QualityType.Equipable, {
            name: "Thieves' Tools",
            category: "Hand",
            bonus: "$thievery + 1",
            description: "A set of picks and tension wrenches.",
            tags: ['auto_equip']
        });

        onCreateQuality('student_wand', QualityType.Equipable, {
            name: "Student Wand",
            category: "Hand",
            bonus: "$intellect + 1",
            description: "Birch and owl feather.",
            tags: ['auto_equip']
        });

        // 2. Define the Character Creation Rules
        const newRules = { ...rules };

        // The Input
        newRules['$class'] = { 
            type: 'label_select', 
            rule: "Warrior:Warrior | Mage:Mage | Rogue:Rogue", 
            visible: true, 
            readOnly: false, 
            visible_if: '' 
        };

        // Derived Attributes (Dependent on Class)
        // Note: We use single quotes for strings inside logic: 'Warrior'
        newRules['$strength'] = { 
            type: 'static', 
            rule: "{ $class == 'Warrior' : 10 | $class == 'Rogue' : 4 | 2 }", 
            visible: true, 
            readOnly: true, 
            visible_if: '' 
        };
        newRules['$dexterity'] = { 
            type: 'static', 
            rule: "{ $class == 'Rogue' : 10 | $class == 'Warrior' : 4 | 2 }", 
            visible: true, 
            readOnly: true, 
            visible_if: '' 
        };
        newRules['$intellect'] = { 
            type: 'static', 
            rule: "{ $class == 'Mage' : 10 | 2 }", 
            visible: true, 
            readOnly: true, 
            visible_if: '' 
        };

        // Derived Skills (Hidden unless relevant)
        newRules['$armor_skill'] = { 
            type: 'static', 
            rule: "{ $class == 'Warrior' : 3 | $class == 'Rogue' : 1 | 0 }", 
            visible: true, 
            readOnly: true, 
            // Only show this field if the value is > 0
            visible_if: "$class == 'Warrior' || $class == 'Rogue'" 
        };

        newRules['$thievery'] = { 
            type: 'static', 
            rule: "{ $class == 'Rogue' : 1 | 0 }", 
            visible: true, 
            readOnly: true, 
            visible_if: "$class == 'Rogue'" 
        };
        
        newRules['$magical_studies'] = { 
            type: 'static', 
            rule: "{ $class == 'Mage' : 1 | 0 }", 
            visible: true, 
            readOnly: true, 
            visible_if: "$class == 'Mage'" 
        };

        // Starting Equipment (Hidden Logic)
        // We use this to "give" the items. Since they have 'auto_equip' tags, they will go on immediately.
        newRules['$starting_plate'] = {
            type: 'static',
            rule: "{ $class == Warrior : 1 | 0 }",
            visible: true, // Hidden from player
            readOnly: true,
            visible_if: "$class == 'Warrior'"
        };
        newRules['$thieves_tools'] = {
            type: 'static',
            rule: "{ $class == Rogue : 1 | 0 }",
            visible: true, 
            readOnly: true,
            visible_if: "$class == 'Rogue'"
        };
        newRules['$student_wand'] = {
            type: 'static',
            rule: "{ $class == Mage : 1 | 0 }",
            visible: true, 
            readOnly: true,
            visible_if: "$class == 'Mage'"
        };

        onChange(newRules);
    };

    return (
        <div className="special-field-group" style={{ borderColor: '#98c379' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <label className="special-label" style={{ color: '#98c379', margin: 0 }}>Character Initialization</label>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <PresetBtn onClick={addSimpleIdentity} label="+ Simple Name" />
                    <PresetBtn onClick={addComplexIdentity} label="+ Complex Name" />
                    <PresetBtn onClick={addSimpleStats} label="+ Simple Stats" />
                    <PresetBtn onClick={addClassSystem} label="+ (Complex) Class System" />
                    <PresetBtn onClick={addPronounSystem} label="+ Pronouns" />
                    <PresetBtn onClick={addVariableLocation} label="+ Location" />
                </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#ccc' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>How to use:</strong> Define the starting qualities for new characters. You can create inputs, choices, or hidden values.</p>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.4' }}>
                    <li><strong>Static/Calc:</strong> A fixed starting value (e.g. <code>10</code>) or a ScribeScript formula (e.g. <code>{'{ $class == \'Warrior\' : 10 | 3 }'}</code>).</li>
                    <li><strong>Inputs (Text):</strong> Allows the player to type a value.</li>
                    <li><strong>Selectors:</strong> Defined as <code>value:Label | value2:Label2</code>.</li>
                    <li><strong>Dependency:</strong> To make a quality depend on another (like Stats depending on Class), create a separate rule for the stat, set it to <strong>Static/Calc</strong>, and reference the class variable in the Rule field.</li>
                </ul>
            </div>
            
            {/* ... Render Logic (Same as before) ... */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {renderOrder.map(key => {
                    const rule = rules[key];
                    const depth = depthMap[key] || 0;
                    const isDerived = rule.rule.includes('$') || rule.rule.includes('@');
                    const isConditional = !!rule.visible_if;
                    
                    let rulePlaceholder = "Value";
                    if (rule.type === 'label_select') rulePlaceholder = "1:Sir | 2:Dame";
                    if (rule.type === 'image_select') rulePlaceholder = "img_1:Label | img_2:Label";
                    if (rule.type === 'static') rulePlaceholder = "10 or { $other * 2 }";

                    return (
                         <div key={key} style={{ 
                            background: '#1e2127', padding: '0.75rem', borderRadius: '4px', 
                            borderLeft: `3px solid ${depth > 0 ? '#61afef' : '#98c379'}`,
                            marginLeft: `${depth * 20}px`
                        }}>
                             <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <div style={{ fontFamily: 'monospace', color: '#98c379', flex: 1, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    {isConditional && <span title={`Visible If: ${rule.visible_if}`}>👁️</span>}
                                    {key}
                                    {isDerived && <span title="Derived/Calculated Value" style={{ color: '#c678dd' }}>ƒ</span>}
                                </div>
                                <select 
                                    value={rule.type} 
                                    onChange={e => handleUpdate(key, 'type', e.target.value as any)} 
                                    className="form-select" 
                                    style={{ width: '120px', padding: '2px' }}
                                >
                                    <option value="string">Text Input</option>
                                    <option value="static">Static/Calc</option>
                                    <option value="label_select">Buttons</option>
                                    <option value="image_select">Images</option>
                                    <option value="labeled_image_select">Img+Label</option>
                                </select>
                                <button onClick={() => handleDelete(key)} style={{color: '#e06c75', background: 'none', border: 'none', cursor: 'pointer'}}>✕</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <input 
                                        value={rule.rule} 
                                        onChange={e => handleUpdate(key, 'rule', e.target.value)} 
                                        className="form-input" 
                                        placeholder={rulePlaceholder}
                                    />
                                </div>
                                {rule.type !== 'static' && (
                                     <div>
                                         <input 
                                            value={rule.visible_if || ''} 
                                            onChange={e => handleUpdate(key, 'visible_if', e.target.value)} 
                                            className="form-input" 
                                            placeholder="Visible If (e.g. $q == 1)"
                                        />
                                     </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '15px', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                                <label className="toggle-label">
                                    <input type="checkbox" checked={rule.visible} onChange={e => handleUpdate(key, 'visible', e.target.checked)} /> Visible
                                </label>
                                <label className="toggle-label">
                                    <input type="checkbox" checked={rule.readOnly} onChange={e => handleUpdate(key, 'readOnly', e.target.checked)} /> Read-Only
                                </label>
                            </div>
                        </div>
                    );
                })}
            </div>
             <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #333' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="$quality_id" className="form-input" style={{ flex: 1 }} />
                    <button onClick={handleAdd} className="save-btn" style={{ width: 'auto', padding: '0.5rem 1.5rem', height: 'fit-content' }}>Add Rule</button>
                </div>
            </div>
        </div>
    );
}

function PresetBtn({ onClick, label }: { onClick: () => void, label: string }) {
    return <button onClick={onClick} style={{ fontSize: '0.7rem', padding: '4px 8px', background: '#2a3e5c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{label}</button>;
}