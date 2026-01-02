'use client';

import { useState, useEffect, use, useMemo } from 'react'; // Added useMemo
import { WorldSettings, QualityType, CharCreateRule, QualityDefinition } from '@/engine/models';
import { useToast } from '@/providers/ToastProvider'; // Added Toast
import CollaboratorManager from './components/CollaboratorManager';
import ThemePreview from './components/ThemePreview';
import SmartArea from '@/components/admin/SmartArea';
import { DataManagement } from './components/DataManagement';

// --- TYPES ---
interface SettingsForm extends WorldSettings {
    char_create: Record<string, CharCreateRule>;
    isPublished?: boolean; 
    coverImage?: string;
    tags?: string[];
    deckDrawCostsAction?: boolean; 
}

export default function SettingsAdmin ({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    
    // DEFAULT STATE
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
    const { showToast } = useToast(); // Hook
    const [qualityDefs, setQualityDefs] = useState<Record<string, QualityDefinition>>({});

    // 1. FETCH DATA
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
                
                const cDataRaw = cRes.ok ? await cRes.json() : {};
                const cData = cDataRaw || {};

                const qData = qRes.ok ? await qRes.json() : {};
                const lData = lRes.ok ? await lRes.json() : {};

                const qIDs = Array.isArray(qData) ? qData.map((q: any) => q.id) : Object.keys(qData || {});
                const lIDs = Array.isArray(lData) ? lData.map((l: any) => l.id) : Object.keys(lData || {});

                setExistingQIDs(qIDs);
                setExistingLocIDs(lIDs);
                
                const defsRecord: Record<string, QualityDefinition> = {};
                if (Array.isArray(qData)) {
                    qData.forEach((q: any) => defsRecord[q.id] = q);
                } else {
                    Object.assign(defsRecord, qData);
                }
                setQualityDefs(defsRecord);

                const normalizedCharCreate: Record<string, CharCreateRule> = {};
                for (const key in cData) {
                    const val = cData[key];
                    if (typeof val === 'string') {
                        normalizedCharCreate[key] = {
                            type: val.includes('|') ? 'label_select' : (val === 'string' ? 'string' : 'static'),
                            rule: val === 'string' ? '' : val,
                            visible: val !== 'static' && !(!isNaN(Number(val))), 
                            readOnly: false,
                            visible_if: '',
                            ordering: 0
                        };
                    } else {
                        normalizedCharCreate[key] = { ...val, ordering: val.ordering || 0 };
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
        // REMOVED: Auto-create confirm popup
        setForm(prev => ({ ...prev, [field]: arr }));
    };

    const missingCurrencies = (form.currencyQualities || []).filter(c => {
        const clean = c.replace('$', '').trim();
        return clean && !existingQIDs.includes(clean);
    });
    
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
            
            const newDef: QualityDefinition = { id: cleanId, type, category: 'system', description: 'Auto-generated...', ...extra };
            setQualityDefs(prev => ({ ...prev, [cleanId]: newDef }));

            showToast(`Created ${cleanId}`, "success");
        } catch(e) { 
            console.error(e); 
            showToast("Failed to create quality", "error"); 
        }

        const newDef: QualityDefinition = { 
             id: cleanId, type, category: 'system', description: 'Auto-generated...', ...extra 
        };
        setQualityDefs(prev => ({ ...prev, [cleanId]: newDef }));


    };
    
    // Callback to add new categories from presets
    const addCategory = (category: string, targetList: 'equip' | 'sheet' = 'sheet') => {
        const listName = targetList === 'equip' ? 'equipCategories' : 'characterSheetCategories';
        const current = form[listName] || [];
        if (!current.includes(category)) {
            handleChange(listName, [...current, category]);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Save Settings
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'settings', itemId: 'settings', data: { ...form, char_create: undefined, isPublished: undefined } })
            });
            // Save Char Create
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'char_create', itemId: 'rules', data: form.char_create })
            });
            // Save Root Fields
            await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId, category: 'root', itemId: 'published', data: form.isPublished }) });
            await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId, category: 'root', itemId: 'coverImage', data: form.coverImage }) });
            await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId, category: 'root', itemId: 'tags', data: form.tags }) });

            showToast("Settings saved!", "success");
        } catch (e) { 
            console.error(e); 
            showToast("Error saving settings.", "error"); 
        } 
        finally { setIsSaving(false); }
    };

    // GLOBAL SAVE TRIGGER
    useEffect(() => {
        const handleGlobalSave = () => handleSave();
        window.addEventListener('global-save-trigger', handleGlobalSave);
        return () => window.removeEventListener('global-save-trigger', handleGlobalSave);
    }, [form]);

    if (isLoading) return <div className="loading-container">Loading...</div>;

    // --- SYSTEM BINDING VALIDATION ---
    const cleanID = (id: string) => id.replace('$', '').trim();
    const isQualityMissing = (bindingValue: string) => {
        if (!bindingValue) return true;
        const clean = cleanID(bindingValue);
        return !existingQIDs.includes(clean);
    };

    const missingSystemQualities = [
        { id: form.actionId, type: QualityType.Counter },
        { id: form.playerName, type: QualityType.String },
        { id: form.playerImage, type: QualityType.String }
    ].filter(q => isQualityMissing(q.id));

    // --- LOCATION VALIDATION ---
    const isStartLocationValid = !form.startLocation || existingLocIDs.includes(form.startLocation);
    const locRule = form.char_create['$location'];
    let charCreateLocationError = "";

    if (locRule) {
        if (['label_select', 'image_select', 'labeled_image_select'].includes(locRule.type)) {
            const options = locRule.rule.split('|').map(opt => opt.split(':')[0].trim());
            const invalidIds = options.filter(id => !existingLocIDs.includes(id));
            if (invalidIds.length > 0) charCreateLocationError = `⚠️ Rule contains invalid Location IDs: ${invalidIds.join(', ')}`;
        } else if (locRule.type === 'static' && !locRule.rule.trim().startsWith('{')) {
            if (!existingLocIDs.includes(locRule.rule.trim())) charCreateLocationError = `⚠️ Rule points to invalid Location ID: '${locRule.rule}'`;
        }
    }

    return (
        <div className="admin-editor-col" style={{ maxWidth: '900px', margin: '0 auto' }}>            
            
            {/* 1. HEADER & META */}
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

            {/* 2. SYSTEM BINDINGS */}
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
                        <p className="special-desc">The specific quality used to track player energy.</p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Player Name ID</label>
                        <input value={form.playerName} onChange={e => handleChange('playerName', e.target.value)} className="form-input" placeholder="$player_name" />
                        <p className="special-desc">Stores the character's display name.</p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Player Portrait ID</label>
                        <input value={form.playerImage} onChange={e => handleChange('playerImage', e.target.value)} className="form-input" placeholder="$player_portrait" />
                        <p className="special-desc">Stores the image code for the avatar.</p>
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
                            ...(!!locRule ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                            ...(!isStartLocationValid && !locRule ? { borderColor: '#e74c3c' } : {})
                        }}
                    />
                    {locRule ? (
                        <div style={{ marginTop: '0.25rem' }}>
                            <p style={{ color: '#e5c07b', fontSize: '0.8rem', margin: 0 }}>
                                🔒 <strong>Managed via Logic:</strong> Defined by the <code>$location</code> rule in Character Initialization.
                            </p>
                            {charCreateLocationError && <p style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '0.25rem', fontWeight: 'bold' }}>{charCreateLocationError}</p>}
                        </div>
                    ) : (
                        <>
                            {!isStartLocationValid && <p style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '0.25rem' }}>⚠️ Warning: Location ID '{form.startLocation}' not found in Locations list.</p>}
                            <p className="special-desc">Where new characters spawn.</p>
                        </>
                    )}
                </div>
            </div>

            {/* 3. GAME RULES (Action Economy) */}
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
                            <p className="special-desc">Real-time minutes per tick.</p>
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
            
            {/* 4. CHALLENGE PHYSICS */}
            <div className="special-field-group" style={{ borderColor: '#f1c40f' }}>
                <label className="special-label" style={{ color: '#f1c40f' }}>Challenge Physics</label>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.8rem', color: '#ccc' }}>
                    <strong>Global Probability Settings:</strong> These defaults are used by the <code>%chance</code> macro if specific parameters (margin, pivot) are not provided in the call.
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
            <div className="special-field-group" style={{ borderColor: '#2ecc71' }}>
                <label className="special-label" style={{ color: '#2ecc71' }}>Economy & UI Layout</label>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.8rem', color: '#ccc' }}>
                    <strong>Organization:</strong> Define which qualities appear in specific parts of the player interface. Qualities not matching these categories will be hidden from the sidebar.
                </div>
                {missingCurrencies.length > 0 && (
                     <div style={{ background: 'rgba(241, 196, 15, 0.15)', border: '1px solid #f1c40f', padding: '0.8rem', borderRadius: '4px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <strong style={{ color: '#f1c40f', display: 'block', marginBottom: '0.25rem' }}>Missing Currencies</strong>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#ccc' }}>
                                The following currencies are defined but not created:
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {missingCurrencies.map(raw => {
                                const clean = raw.replace('$', '').trim();
                                return (
                                    <button 
                                        key={clean} 
                                        onClick={() => createQuality(clean, QualityType.Counter, { name: clean.charAt(0).toUpperCase() + clean.slice(1) })}
                                        style={{ 
                                            background: '#f1c40f', color: 'black', border: 'none', 
                                            borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', 
                                            padding: '4px 10px', fontWeight: 'bold' 
                                        }}
                                    >
                                        + Create {clean}
                                    </button>
                                );
                            })}
                        </div>
                     </div>
                )}
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

            {/* 6. VISUALS */}
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
                                <option value="detective-noir">Detective Noir</option>
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
                        <div className="form-group">
                            <label className="form-label">Location Header Style</label>
                            <select 
                                value={form.locationHeaderStyle || 'standard'} 
                                onChange={e => handleChange('locationHeaderStyle', e.target.value as any)} 
                                className="form-select"
                            >
                                <option value="standard">Standard (Default)</option>
                                <option value="banner">Banner (Wide Image)</option>
                                <option value="square">Square Icon</option>
                                <option value="circle">Circle Icon</option>
                                <option value="hidden">Hidden</option>
                            </select>
                            <p className="special-desc">Controls how the current location name and image are displayed.</p>
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
                    
                    </div>
                    <div>
                        <label className="toggle-label"><input type="checkbox" checked={form.enableParallax !== false} onChange={e => handleChange('enableParallax', e.target.checked)} /> Parallax</label>
                        <label className="toggle-label"><input type="checkbox" checked={form.enableTitle || false} onChange={e => handleChange('enableTitle', e.target.checked)} /> Show Title</label>
                    </div>
                    {form.enableTitle && (
                        <div className="form-group" style={{marginTop:'0.5rem'}}>
                            <label className="form-label">Title Quality ID</label><input value={form.titleQualityId || ''} onChange={e => handleChange('titleQualityId', e.target.value)} className="form-input" placeholder="$current_title" />
                        </div>
                    )}
                    </div>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <ThemePreview theme={form.visualTheme || 'default'} />
                    </div>
                </div>
                 
            </div>

            {/* 8. CHARACTER INITIALIZATION */}
            <div style={{ marginBottom: '3rem' }}>
                <CharCreateEditor 
                    rules={form.char_create || {}} 
                    onChange={r => handleChange('char_create', r)} 
                    storyId={storyId}
                    existingQIDs={existingQIDs}
                    onCreateQuality={createQuality}
                    qualityDefs={qualityDefs} 
                    onAddCategory={(cat, type) => {
                         const field = type === 'equip' ? 'equipCategories' : 'characterSheetCategories';
                         setForm(prev => {
                             const currentList = prev[field] || [];
                             if (currentList.includes(cat)) return prev;
                             return { ...prev, [field]: [...currentList, cat] };
                         });
                    }}
                />
            </div>
            <DataManagement storyId={storyId} />
            <CollaboratorManager storyId={storyId} />
            <div className="admin-form-footer" style={{ justifyContent: 'flex-end' }}><button onClick={handleSave} disabled={isSaving} className="save-btn">{isSaving ? 'Saving...' : 'Save All Settings'}</button></div>
        </div>
    );
}

// --- SUB-COMPONENT: CharCreateEditor (Refactored) ---

interface CharCreateProps {
    rules: Record<string, CharCreateRule>;
    onChange: (r: Record<string, CharCreateRule>) => void;
    storyId: string; 
    existingQIDs: string[];
    onCreateQuality: (id: string, type: QualityType, extra?: any) => void;
    onAddCategory: (cat: string, type: 'equip' | 'sheet') => void;
    qualityDefs: Record<string, QualityDefinition>; // NEW
}

function CharCreateEditor({ rules, onChange, storyId, onCreateQuality, onAddCategory }: CharCreateProps) {
    const [newKey, setNewKey] = useState("");
    const [draggedKey, setDraggedKey] = useState<string | null>(null);

    const sortedKeys = useMemo(() => {
        return Object.keys(rules).sort((a, b) => (rules[a].ordering || 0) - (rules[b].ordering || 0));
    }, [rules]);

    
    const handleUpdate = (key: string, field: keyof CharCreateRule, val: any) => {
        onChange({ ...rules, [key]: { ...rules[key], [field]: val } });
    };

    const handleDelete = (key: string) => { const next = { ...rules }; delete next[key]; onChange(next); };

    const handleAdd = () => { 
        const qid = newKey.startsWith('$') ? newKey : `$${newKey}`;
        const maxOrder = sortedKeys.length > 0 ? (rules[sortedKeys[sortedKeys.length - 1]].ordering || 0) + 1 : 0;
        onChange({ ...rules, [qid]: { type: 'static', rule: "0", visible: false, readOnly: false, visible_if: '', ordering: maxOrder } }); 
        setNewKey(""); 
    };

    const onDragStart = (e: React.DragEvent, key: string) => { setDraggedKey(key); e.dataTransfer.effectAllowed = "move"; };
    const onDragOver = (e: React.DragEvent, targetKey: string) => { e.preventDefault(); };
    const onDrop = (e: React.DragEvent, targetKey: string) => {
        e.preventDefault();
        if (!draggedKey || draggedKey === targetKey) return;
        const fromIndex = sortedKeys.indexOf(draggedKey);
        const toIndex = sortedKeys.indexOf(targetKey);
        const newOrder = [...sortedKeys];
        newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, draggedKey);
        const nextRules = { ...rules };
        newOrder.forEach((k, idx) => { nextRules[k] = { ...nextRules[k], ordering: idx }; });
        onChange(nextRules);
        setDraggedKey(null);
    };
    
    // --- PRESETS ---

    const addSimpleIdentity = () => {
        const baseOrder = sortedKeys.length;
        const newRules = { ...rules };
        newRules['$identity_header'] = { type: 'header', rule: "Identity", visible: true, readOnly: true, visible_if: '', ordering: baseOrder };
        newRules['$player_name'] = { type: 'string', rule: '', visible: true, readOnly: false, visible_if: '', ordering: baseOrder + 1 };
        onChange(newRules);
    };

    const removeSimpleIdentity = () => {
        const next = { ...rules };
        delete next['$identity_header'];
        delete next['$player_name'];
        onChange(next);
    };

    const addComplexIdentity = () => {
        const baseOrder = sortedKeys.length;
        onCreateQuality('first_name', QualityType.String);
        onCreateQuality('last_name', QualityType.String);
        
        const newRules = { ...rules };
        // Header
        newRules['$identity_header'] = { type: 'header', rule: "Identity", visible: true, readOnly: true, visible_if: '', ordering: baseOrder, displayMode: 'modal' } as any;
        
        // Hidden from card (default), visible in modal
        newRules['$first_name'] = { type: 'string', rule: '', visible: true, readOnly: false, visible_if: '', ordering: baseOrder + 1 };
        newRules['$last_name'] = { type: 'string', rule: '', visible: true, readOnly: false, visible_if: '', ordering: baseOrder + 2 };
        
        // Visible on card
        newRules['$player_name'] = { type: 'static', rule: "{$first_name} {$last_name}", visible: true, readOnly: true, visible_if: '', ordering: baseOrder + 3, showOnCard: true };
        
        onChange(newRules);
    };
    
    const removeComplexIdentity = () => {
        const next = { ...rules };
        delete next['$identity_header'];
        delete next['$first_name'];
        delete next['$last_name'];
        delete next['$player_name'];
        onChange(next);
    };

     const addClassSystem = () => {
        const baseOrder = sortedKeys.length;
        
        // 1. Define Qualities
        onCreateQuality('class', QualityType.String, { name: "Character Class", category: "Identity" });
        onCreateQuality('strength', QualityType.Pyramidal, { name: "Strength", category: "Attributes" });
        onCreateQuality('intellect', QualityType.Pyramidal, { name: "Intellect", category: "Attributes" });
        onCreateQuality('dexterity', QualityType.Pyramidal, { name: "Dexterity", category: "Attributes" });
        
        // Skills with Dynamic Descriptions
        onCreateQuality('armor_skill', QualityType.Counter, {
            name: "Armor Proficiency", category: "Skills",
            description: "{ $. == 3: Heavy Armor | $. == 2: Medium Armor | $. == 1: Light Armor | Unarmored }"
        });
        onCreateQuality('magical_studies', QualityType.Pyramidal, {
            name: "Magical Studies", category: "Skills",
            description: "{ $. >= 10: Archmage | $. >= 5: Adept | $. >= 1: Novice | Uninitiated }"
        });
        onCreateQuality('thievery', QualityType.Pyramidal, {
            name: "Thievery", category: "Skills",
            description: "{ $. >= 10: Master Thief | $. >= 5: Burglar | $. >= 1: Pickpocket | Honest }"
        });

        // Equipment
        onCreateQuality('starting_plate', QualityType.Equipable, {
            name: "Old Plate Armor", category: "Body", 
            bonus: "{ $armor_skill >= 3 : $protection + 5 | $protection + 5, $dexterity - 5 }", 
            description: "A heavy suit of iron.", tags: ['auto_equip'] 
        });
        onCreateQuality('thieves_tools', QualityType.Equipable, { name: "Thieves' Tools", category: "Hand", bonus: "$thievery + 1", tags: ['auto_equip'] });
        onCreateQuality('student_wand', QualityType.Equipable, { name: "Student Wand", category: "Hand", bonus: "$intellect + 1", tags: ['auto_equip'] });

        onAddCategory("Body", 'equip');
        onAddCategory("Hand", 'equip');
        onAddCategory("Attributes", 'sheet');
        onAddCategory("Skills", 'sheet');

        // 2. Rules
        const newRules = { ...rules };
        
        // Header is a Modal Button
        newRules['$class_header'] = { type: 'header', rule: "Class Selection", visible: true, readOnly: true, visible_if: '', displayMode: 'modal', ordering: baseOrder };
        
        newRules['$class_name'] = { type: 'static', rule: "{ $class == 0 : Pick a Class | {$class} }", visible: true, readOnly: true, visible_if: '', ordering: baseOrder + 1, showOnCard: true };
        
        // The Selector (Inside Modal)
        newRules['$class'] = { type: 'label_select', rule: "Warrior:Warrior | Mage:Mage | Rogue:Rogue", visible: true, readOnly: false, visible_if: '', ordering: baseOrder + 2 };
        
        // Attributes (Visible on Card)
        newRules['$strength'] = { type: 'static', rule: "{ $class == Warrior : 10 | $class == Rogue : 4 | 2 }", visible: true, readOnly: true, visible_if: '', ordering: baseOrder + 3, showOnCard: true };
        newRules['$dexterity'] = { type: 'static', rule: "{ $class == Rogue : 10 | $class == Warrior : 4 | 2 }", visible: true, readOnly: true, visible_if: '', ordering: baseOrder + 4, showOnCard: true };
        newRules['$intellect'] = { type: 'static', rule: "{ $class == Mage : 10 | 2 }", visible: true, readOnly: true, visible_if: '', ordering: baseOrder + 5, showOnCard: true };
        
        newRules['$armor_skill'] = { type: 'static', rule: "{ $class == Warrior : 3 | $class == Rogue : 1 | 0 }", visible: false, readOnly: true, visible_if: "", ordering: baseOrder + 6 };
        newRules['$thievery'] = { type: 'static', rule: "{ $class == Rogue : 5 | 0 }", visible: false, readOnly: true, visible_if: "", ordering: baseOrder + 7 };
        newRules['$magical_studies'] = { type: 'static', rule: "{ $class == Mage : 5 | 0 }", visible: false, readOnly: true, visible_if: "", ordering: baseOrder + 8 };
        // Derived Skills (Visible on Card) - Using .description property!
        // We use $armor_skill[VALUE].description to show the text for the *calculated* value
        newRules['$armor_skill_level'] = { type: 'static', rule: "{$armor_skill[{$armor_skill}].description}", visible: true, readOnly: true, visible_if: "$class == Warrior || $class == Rogue", ordering: baseOrder + 9, showOnCard: true };
        newRules['$thievery_level'] = { type: 'static', rule: "{$thievery[{$thievery}].description}", visible: true, readOnly: true, visible_if: "$class == Rogue", ordering: baseOrder + 10, showOnCard: true };
        newRules['$magical_studies_level'] = { type: 'static', rule: "{$magical_studies[{$magical_studies}].description}", visible: true, readOnly: true, visible_if: "$class == Mage", ordering: baseOrder + 11, showOnCard: true };

        // Hidden Calculation Fields (To drive the display fields above)
        
        
        // Items (Hidden)
        newRules['$starting_plate'] = { type: 'static', rule: "{ $class == Warrior : 1 | 0 }", visible: false, readOnly: true, visible_if: '$class == Warrior', ordering: baseOrder + 12 };
        newRules['$thieves_tools'] = { type: 'static', rule: "{ $class == Rogue : 1 | 0 }", visible: false, readOnly: true, visible_if: '$class == Rogue', ordering: baseOrder + 13 };
        newRules['$student_wand'] = { type: 'static', rule: "{ $class == Mage : 1 | 0 }", visible: false, readOnly: true, visible_if: '$class == Mage', ordering: baseOrder + 14 };

        onChange(newRules);
    };
    
    const removeClassSystem = () => {
        const next = { ...rules };
        ['$class_header','$class','$strength','$dexterity','$intellect','$armor_skill','$starting_plate',
            '$thieves_tools','$student_wand', '$magical_studies', '$thievery','$magical_studies_level','$thievery_level', '$armor_skill_level', '$class_name'].forEach(k => delete next[k]);
        onChange(next);
    };

    const addPronounSystem = () => {
        const baseOrder = sortedKeys.length;
        onCreateQuality('pronouns', QualityType.String, { 
            tags: ['is_pronoun_set'], 
            text_variants: {
                "subject": "{ $.stringValue == he/him : he | $.stringValue == she/her : she | $.stringValue == they/them : they | {$prn_subj} }",
                "object": "{ $.stringValue == he/him : him | $.stringValue == she/her : her | $.stringValue == they/them : them | {$prn_obj} }",
                "possessive": "{ $.stringValue == he/him : his | $.stringValue == she/her : her | $.stringValue == they/them : their | {$prn_poss} }"
            }
        });
        const newRules = { ...rules };
        newRules['$pronouns_header'] = { type: 'header', rule: "Pronouns", visible: true, readOnly: true, visible_if: '', ordering: baseOrder };
        newRules['$pronouns'] = { type: 'label_select', rule: "he/him:He/Him | she/her:She/Her | they/them:They/Them | Custom:Custom", visible: true, readOnly: false, visible_if: '', ordering: baseOrder + 1 };
        newRules['$prn_subj'] = { type: 'string', rule: '', visible: true, readOnly: false, visible_if: "$pronouns == Custom", ordering: baseOrder + 2 };
        newRules['$prn_obj'] = { type: 'string', rule: '', visible: true, readOnly: false, visible_if: "$pronouns == Custom", ordering: baseOrder + 3 };
        newRules['$prn_poss'] = { type: 'string', rule: '', visible: true, readOnly: false, visible_if: "$pronouns == Custom", ordering: baseOrder + 4 };
        onChange(newRules);
    };
    
    const removePronounSystem = () => {
        const next = { ...rules };
        ['$pronouns_header','$pronouns','$prn_subj','$prn_obj','$prn_poss'].forEach(k => delete next[k]);
        onChange(next);
    };

    const addSimpleStats = () => {
        const baseOrder = sortedKeys.length;
        onCreateQuality('body', QualityType.Pyramidal);
        onCreateQuality('mind', QualityType.Pyramidal);
        onCreateQuality('spirit', QualityType.Pyramidal);
        const newRules = { ...rules };
        newRules['$stats_header'] = { type: 'header', rule: "Stats", visible: true, readOnly: true, visible_if: '', ordering: baseOrder };
        newRules['$body'] = { type: 'static', rule: "10", visible: true, readOnly: true, visible_if: '', ordering: baseOrder + 1 };
        newRules['$mind'] = { type: 'static', rule: "10", visible: true, readOnly: true, visible_if: '', ordering: baseOrder + 2 };
        newRules['$spirit'] = { type: 'static', rule: "10", visible: true, readOnly: true, visible_if: '', ordering: baseOrder + 3 };
        onChange(newRules);
    };
    
    const removeSimpleStats = () => {
        const next = { ...rules };
        ['$stats_header','$body','$mind','$spirit'].forEach(k => delete next[k]);
        onChange(next);
    };

    const addVariableLocation = () => {
         const baseOrder = sortedKeys.length;
         const newRules = { ...rules };
         newRules['$location'] = { type: 'label_select', rule: "village:The Village | city:The City", visible: true, readOnly: false, visible_if: '', ordering: baseOrder };
         onChange(newRules);
    };
    
    const removeVariableLocation = () => {
        const next = { ...rules };
        delete next['$location'];
        onChange(next);
    };

    const hasRule = (k: string) => !!rules[k];

    return (
        <div className="special-field-group" style={{ borderColor: '#98c379' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <label className="special-label" style={{ color: '#98c379', margin: 0 }}>Character Initialization</label>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <PresetToggle label="Simple Name" has={hasRule('$player_name') && !hasRule('$first_name')} onAdd={addSimpleIdentity} onRemove={removeSimpleIdentity} />
                    <PresetToggle label="Complex Name" has={hasRule('$first_name')} onAdd={addComplexIdentity} onRemove={removeComplexIdentity} />
                    <PresetToggle label="Stats" has={hasRule('$body')} onAdd={addSimpleStats} onRemove={removeSimpleStats} />
                    <PresetToggle label="Class System" has={hasRule('$class')} onAdd={addClassSystem} onRemove={removeClassSystem} />
                    <PresetToggle label="Pronouns" has={hasRule('$pronouns')} onAdd={addPronounSystem} onRemove={removePronounSystem} />
                    <PresetToggle label="Location" has={hasRule('$location')} onAdd={addVariableLocation} onRemove={removeVariableLocation} />
                </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#ccc' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>How to use:</strong> Define the starting qualities. Drag to reorder.</p>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.4' }}>
                     <li><strong>Headers:</strong> Create sections. Can be set as "Modal Root" to group subsequent fields into a popup.</li>
                     <li><strong>Static/Calc:</strong> A fixed value or formula. Now supports <code>Visible If</code> conditions.</li>
                     <li><strong>Inputs/Selects:</strong> Player choices.</li>
                </ul>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {sortedKeys.map(key => {
                    const rule = rules[key];
                    const isDerived = rule.rule.includes('$') || rule.rule.includes('@');
                    const isConditional = !!rule.visible_if;
                    
                    let rulePlaceholder = "Value";
                    if (rule.type === 'label_select') rulePlaceholder = "1:Sir | 2:Dame";
                    if (rule.type === 'image_select') rulePlaceholder = "img_1:Label | img_2:Label";
                    if (rule.type === 'static') rulePlaceholder = "10 or { $other * 2 }";

                    return (
                         <div 
                            key={key} 
                            draggable
                            onDragStart={(e) => onDragStart(e, key)}
                            onDragOver={(e) => onDragOver(e, key)}
                            onDrop={(e) => onDrop(e, key)}
                            style={{ 
                                background: '#1e2127', padding: '0.75rem', borderRadius: '4px', 
                                borderLeft: `3px solid ${rule.type === 'header' ? '#c678dd' : '#98c379'}`,
                                cursor: 'move',
                                opacity: draggedKey === key ? 0.5 : 1
                            }}
                        >
                             <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <div style={{ fontFamily: 'monospace', color: rule.type === 'header' ? '#c678dd' : '#98c379', flex: 1, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ cursor: 'grab', marginRight: '5px', opacity: 0.5 }}>☰</span>
                                    {isConditional && <span title={`Visible If: ${rule.visible_if}`}>👁️</span>}
                                    {key}
                                    {isDerived && <span title="Derived/Calculated Value" style={{ color: '#c678dd' }}>ƒ</span>}
                                    {rule.type === 'header' && rule.displayMode === 'modal' && <span style={{fontSize:'0.7rem', border:'1px solid #c678dd', padding:'0 4px', borderRadius:'4px'}}>MODAL</span>}
                                </div>
                                <select 
                                    value={rule.type} 
                                    onChange={e => handleUpdate(key, 'type', e.target.value as any)} 
                                    className="form-select" 
                                    style={{ width: '120px', padding: '2px' }}
                                >
                                    <option value="header">-- Header --</option>
                                    <option value="string">Text Input</option>
                                    <option value="static">Static/Calc</option>
                                    <option value="label_select">Buttons</option>
                                    <option value="image_select">Images</option>
                                    <option value="labeled_image_select">Img+Label</option>
                                </select>
                                <button onClick={() => handleDelete(key)} style={{color: '#e06c75', background: 'none', border: 'none', cursor: 'pointer'}}>✕</button>
                            </div>

                            {/* CONTROLS ROW */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <input 
                                        value={rule.rule} 
                                        onChange={e => handleUpdate(key, 'rule', e.target.value)} 
                                        className="form-input" 
                                        placeholder={rulePlaceholder}
                                        style={rule.type === 'header' ? { fontWeight: 'bold', color: '#fff' } : {}}
                                    />
                                    <span className="property-hint" style={{marginLeft: 0}}>
                                        {rule.type === 'header' ? 'Section Title' : 'Rule / Data'}
                                    </span>
                                </div>
                                <div>
                                    <input 
                                        value={rule.visible_if || ''} 
                                        onChange={e => handleUpdate(key, 'visible_if', e.target.value)} 
                                        className="form-input" 
                                        placeholder="Visible If (e.g. $q == 1)"
                                    />
                                    <span className="property-hint" style={{marginLeft: 0}}>Condition</span>
                                </div>
                            </div>

                            {/* FLAGS ROW */}
                            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.8rem', borderTop: '1px dashed #333', paddingTop: '0.5rem' }}>
                                {/* ... Visible / ReadOnly ... */}
                                <label className="toggle-label">
                                    <input type="checkbox" checked={rule.visible} onChange={e => handleUpdate(key, 'visible', e.target.checked)} /> Visible
                                </label>
                                <label className="toggle-label">
                                    <input type="checkbox" checked={rule.readOnly} onChange={e => handleUpdate(key, 'readOnly', e.target.checked)} /> Read-Only
                                </label>

                                {/* NEW: Show On Card (Only if NOT a header) */}
                                {rule.type !== 'header' && (
                                     <label className="toggle-label" title="If inside a Modal Section, check this to ALSO show it on the main card.">
                                        <input type="checkbox" checked={!!rule.showOnCard} onChange={e => handleUpdate(key, 'showOnCard', e.target.checked)} /> 
                                        Show on Card
                                    </label>
                                )}

                                {rule.type === 'string' && (
                                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
                                        <label style={{ marginRight:'5px', color:'#aaa' }}>Format:</label>
                                        <select 
                                            value={rule.input_transform || 'none'}
                                            onChange={e => handleUpdate(key, 'input_transform', e.target.value as any)}
                                            className="form-select"
                                            style={{ width: 'auto', padding: '2px' }}
                                        >
                                            <option value="none">None</option>
                                            <option value="lowercase">lowercase</option>
                                            <option value="uppercase">UPPERCASE</option>
                                            <option value="capitalize">Capitalize</option>
                                        </select>
                                    </div>
                                )}
                                
                                {rule.type === 'header' && (
                                    <div style={{ marginLeft: 'auto' }}>
                                        <label className="toggle-label" title="If checked, this header becomes a button that opens a popup for the settings below it.">
                                           <input 
                                               type="checkbox" 
                                               checked={rule.displayMode === 'modal'} 
                                               onChange={e => handleUpdate(key, 'displayMode', e.target.checked ? 'modal' : 'inline')} 
                                           /> 
                                           As Modal Button
                                        </label>
                                    </div>
                                )}

                                {['label_select', 'image_select', 'labeled_image_select'].includes(rule.type) && (
                                     <div style={{ marginLeft: 'auto' }}>
                                         <label className="toggle-label">
                                            <input 
                                                type="checkbox" 
                                                checked={rule.displayMode === 'modal'} 
                                                onChange={e => handleUpdate(key, 'displayMode', e.target.checked ? 'modal' : 'inline')} 
                                            /> 
                                            Use Modal
                                         </label>
                                     </div>
                                )}
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

function PresetToggle({ has, onAdd, onRemove, label }: { has: boolean, onAdd: () => void, onRemove: () => void, label: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', background: has ? 'rgba(46, 204, 113, 0.2)' : '#2a3e5c', borderRadius: '4px', overflow: 'hidden', border: has ? '1px solid #2ecc71' : 'none' }}>
            <button 
                onClick={has ? undefined : onAdd}
                disabled={has}
                style={{ 
                    fontSize: '0.7rem', padding: '4px 8px', 
                    background: 'transparent', color: has ? '#2ecc71' : 'white', border: 'none', 
                    cursor: has ? 'default' : 'pointer' 
                }}
            >
                {has ? `✓ ${label}` : `+ ${label}`}
            </button>
            {has && (
                <button 
                    onClick={onRemove}
                    style={{ 
                        fontSize: '0.7rem', padding: '4px 6px', 
                        background: 'rgba(0,0,0,0.2)', color: '#e06c75', border: 'none', borderLeft: '1px solid #2ecc71',
                        cursor: 'pointer' 
                    }}
                    title="Remove Preset"
                >
                    ✕
                </button>
            )}
        </div>
    );
}