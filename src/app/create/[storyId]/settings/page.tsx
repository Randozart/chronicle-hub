'use client';

import { useState, useEffect, use } from 'react';
import { WorldSettings, QualityType } from '@/engine/models';
import CollaboratorManager from './components/CollaboratorManager';
import ThemePreview from './components/ThemePreview';
import SmartArea from '@/components/admin/SmartArea'; // <--- RESTORED

interface SettingsForm extends WorldSettings {
    char_create: Record<string, string>;
    isPublished?: boolean; 
    coverImage?: string;
    tags?: string[];    
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
    });
    
    const [existingQIDs, setExistingQIDs] = useState<string[]>([]); 
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // 1. FETCH DATA
    useEffect(() => {
        const load = async () => {
            try {
                const [sRes, cRes, qRes] = await Promise.all([
                    fetch(`/api/admin/settings?storyId=${storyId}`),
                    fetch(`/api/admin/char_create?storyId=${storyId}`),
                    fetch(`/api/admin/qualities?storyId=${storyId}`)
                ]);
                
                const sData = await sRes.json();
                const cData = cRes.ok ? await cRes.json() : {};
                const qData = qRes.ok ? await qRes.json() : {};

                setExistingQIDs(Object.keys(qData));

                setForm(prev => ({ 
                    ...prev, 
                    ...sData,
                    characterSheetCategories: sData.characterSheetCategories || [],
                    equipCategories: sData.equipCategories || [],
                    currencyQualities: sData.currencyQualities || [],
                    char_create: cData || {},
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

    // --- AUTO-CREATOR HELPER ---
    const createQuality = async (qid: string, type: QualityType = QualityType.Counter) => {
        const cleanId = qid.replace('$', '');
        if (existingQIDs.includes(cleanId)) return;

        const newQuality = {
            id: cleanId,
            name: cleanId.charAt(0).toUpperCase() + cleanId.slice(1).replace(/_/g, ' '),
            type: type,
            category: 'system',
            description: 'Auto-generated system quality.'
        };

        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'qualities', itemId: cleanId, data: newQuality })
            });
            setExistingQIDs(prev => [...prev, cleanId]); 
            alert(`Created quality: ${cleanId}`);
        } catch(e) { console.error(e); }
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

            alert("Saved!");
        } catch (e) { console.error(e); alert("Error saving."); } 
        finally { setIsSaving(false); }
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    // VALIDATION CHECKS
    const cleanID = (id: string) => id.replace('$', '').trim();
    
    const missingCurrencies = (form.currencyQualities || [])
        .filter(c => Boolean(c))
        .filter(c => !existingQIDs.includes(cleanID(c)));

    const missingSystemQualities = [
        { id: form.actionId, type: QualityType.Counter },
        { id: form.playerName, type: QualityType.String },
        { id: form.playerImage, type: QualityType.String }
    ].filter(q => q.id && !existingQIDs.includes(q.id.replace('$', '')));


    return (
        <div className="admin-editor-col" style={{ maxWidth: '900px', margin: '0 auto' }}>            
            
            {/* 1. HEADER */}
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
                        <p className="special-desc">Image displayed on the main page.</p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Tags</label>
                        <input defaultValue={form.tags?.join(', ')} onBlur={e => handleArrayChange('tags', e.target.value)} className="form-input" />
                        <p className="special-desc">Tags which describe your world and genre so other users can find it more easily in the community arcade.</p>
                    </div>
                </div>
            </div>

            {/* 2. SYSTEM BINDINGS */}
            <div className="special-field-group" style={{ borderColor: '#e5c07b' }}>
                <label className="special-label" style={{ color: '#e5c07b' }}>System Bindings</label>
                <p className="special-desc">
                    Tell the engine which of your Qualities represent core system features. 
                    This allows you to use variables like <code>$actions</code> or <code>$player_name</code> in your narrative.
                </p>

                {/* Auto-Fix System Qualities */}
                {missingSystemQualities.length > 0 && (
                    <div style={{ background: 'rgba(231, 76, 60, 0.1)', border: '1px solid #e74c3c', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem' }}>
                        <p style={{ margin: '0 0 0.5rem 0', color: '#e74c3c', fontSize: '0.8rem', fontWeight: 'bold' }}>Missing Quality Definitions:</p>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {missingSystemQualities.map(q => (
                                <button 
                                    key={q.id}
                                    onClick={() => createQuality(q.id, q.type)}
                                    style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px' }}
                                >
                                    + Create {q.id}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="form-row" style={{ marginTop: '1.5rem' }}>
                    <div className="form-group">
                        <label className="form-label">Action Counter ID</label>
                        <input value={form.actionId} onChange={e => handleChange('actionId', e.target.value)} className="form-input" placeholder="$actions" />
                        <p className="special-desc">Resource used for tracking actions or energy. Can be further defined under <strong>Game Rules</strong>.</p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Player Name ID</label>
                        <input value={form.playerName} onChange={e => handleChange('playerName', e.target.value)} className="form-input" placeholder="$player_name" />
                        <p className="special-desc">String quality which stores the player's name, and displays this on their profile page.</p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Player Portrait ID</label>
                        <input value={form.playerImage} onChange={e => handleChange('playerImage', e.target.value)} className="form-input" placeholder="$player_portrait" />
                        <p className="special-desc">String quality which stores the image code for the player's portrait.</p>
                    </div>
                </div>
                <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label className="form-label">Starting Location ID</label>
                    <input value={form.startLocation || ''} onChange={e => handleChange('startLocation', e.target.value)} className="form-input" placeholder="village" />
                    <p className="special-desc">Where new characters spawn if not specified in creation rules. Defaults to the quality <em>$location</em> in Character Initialisation</p>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic', marginTop: '0.5rem' }}>
                    * Ensure these IDs exist in your Qualities list and are initialized in "Character Creation" below.
                </p>
            </div>

            {/* 3. GAME RULES (Updated with SmartArea) */}
            <div className="special-field-group" style={{ borderColor: '#61afef' }}>
                <label className="special-label" style={{ color: '#61afef' }}>Game Rules</label>
                
                <div style={{ marginBottom: '1.5rem' }}>
                    <label className="toggle-label">
                        <input type="checkbox" checked={form.useActionEconomy} onChange={e => handleChange('useActionEconomy', e.target.checked)} />
                        Enable Action/Time Economy
                    </label>
                </div>
                {form.useActionEconomy && (
                <div className="form-row">
                    <div className="form-group" style={{ marginTop: '1rem', background: 'rgba(97, 175, 239, 0.1)', padding: '1rem', borderRadius: '4px' }}>
                        <label className="form-label" style={{ color: '#61afef' }}>Action Economy Resource</label>

                                <div className="form-group">
                                    <label className="form-label">Main Resource ID (= Action Counter ID)</label>
                                    <input 
                                        value={form.actionId} 
                                        onChange={e => handleChange('actionId', e.target.value)} 
                                        className="form-input" 
                                        placeholder="$actions"
                                    />
                                    <p className="special-desc">
                                        Will be refilled by a set amount every time the Action Regeneration Timer runs out.
                                    </p>
                                </div>
                                <div className="form-group" style={{flex:1}}>
                                    {/* SMART AREA: Max Actions */}
                                    <SmartArea 
                                        label="Action Counter Max" 
                                        value={String(form.maxActions)} 
                                        onChange={v => handleChange('maxActions', v)}
                                        storyId={storyId}
                                        minHeight="38px"
                                        placeholder="20 or $logic"
                                    />
                                    <p className="special-desc">
                                        The maximum number of actions which can be stored by the player. Beyond this, the action timer gives no new actions.
                                    </p>
                                </div>
                            </div>
                        <div className="form-group" style={{ marginTop: '1rem', background: 'rgba(97, 175, 239, 0.1)', padding: '1rem', borderRadius: '4px' }}>
                            <label className="form-label" style={{ color: '#61afef' }}>Action Regeneration Timer</label>

                                <div className="form-group" style={{flex:1}}>
                                    {/* SMART AREA: Regen Amount */}
                                    <SmartArea 
                                        label="Effect per Tick" 
                                        value={String(form.regenAmount)} 
                                        onChange={v => handleChange('regenAmount', v)}
                                        storyId={storyId}
                                        minHeight="38px"
                                        placeholder="1 or $logic"
                                    />
                                    <p className="special-desc">
                                        If <strong>Effect</strong> is a number (e.g. <code>1</code>), it adds this amount to the Main Resource up to the Max whenever the timer runs out.
                                        <br/>
                                        If it is logic (e.g. <code>$wounds -= 1</code>), it executes that logic instead every interval, in case you want to work with a different resource from actions.
                                    </p>
                                </div>
                                
                                <div className="form-group" style={{flex:1}}>
                                    <label className="form-label">Regen/Action Timer Interval (Minutes)</label>
                                    <input type="number" value={form.regenIntervalInMinutes} onChange={e => handleChange('regenIntervalInMinutes', parseInt(e.target.value))} className="form-input" />
                                    <p className="special-desc">
                                        Can also be tied to the deck timer.
                                    </p>
                                </div>
                            </div>
                    </div>
                )}

                {/* SMART AREA: Default Action Cost */}
                <div className="form-group" style={{ marginTop: '1rem', borderTop: '1px dashed #444', paddingTop: '1rem'  }}>
                    <SmartArea 
                        label="Default Storylet Action Cost" 
                        value={String(form.defaultActionCost || "")} 
                        onChange={v => handleChange('defaultActionCost', v)}
                        storyId={storyId}
                        minHeight="38px"
                        placeholder="1 or $stress++"
                    />
                    <p className="special-desc">
                                The resource cost for clicking any Storylet option. 
                                <br/>
                                • Number (<code>1</code>): Subtracts 1 from Main Resource.
                                <br/>
                                • Logic (<code>$stress++</code>): Executes this effect instead.
                            </p>
                </div>
                {/* SMART AREA: Default Draw Cost */}
                <div className="form-group" style={{ marginTop: '1rem'}}>
                     <SmartArea 
                        label="Default Deck Draw Cost" 
                        value={String(form.defaultDrawCost || "")} 
                        onChange={v => handleChange('defaultDrawCost', v)}
                        storyId={storyId}
                        minHeight="38px"
                        placeholder="1 or $actions >= 1"
                    />
                    <p className="special-desc">
                        The resource cost for drawing a Card from the Opportunities deck. 
                        <br/>Functions much like the default action cost.
                    </p>
                </div>
                
                
            </div>
            
            {/* 4. CHALLENGE PHYSICS */}
            <div className="special-field-group" style={{ borderColor: '#f1c40f' }}>
                <label className="special-label" style={{ color: '#f1c40f' }}>Challenge Physics</label>
                <p className="special-desc">Define default skill check difficulty curves.</p>
                <div className="form-row" style={{ marginTop: '1rem' }}>
                    <div className="form-group">
                        {/* SMART AREA: Default Margin */}
                        <SmartArea 
                            label="Default Margin" 
                            value={form.challengeConfig?.defaultMargin || ''} 
                            onChange={v => handleChallengeChange('defaultMargin', v)}
                            storyId={storyId}
                            minHeight="38px"
                            placeholder="$target"
                        />
                    </div>
                    <div className="form-group"><label className="form-label">Pivot %</label><input type="number" value={form.challengeConfig?.basePivot ?? 60} onChange={e => handleChallengeChange('basePivot', parseInt(e.target.value))} className="form-input" /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Min Chance %</label><input type="number" value={form.challengeConfig?.minCap ?? 0} onChange={e => handleChallengeChange('minCap', parseInt(e.target.value))} className="form-input" /></div>
                    <div className="form-group"><label className="form-label">Max Chance %</label><input type="number" value={form.challengeConfig?.maxCap ?? 100} onChange={e => handleChallengeChange('maxCap', parseInt(e.target.value))} className="form-input" /></div>
                </div>
            </div>

            {/* 5. ECONOMY (With Auto-Create) */}
            <div className="special-field-group" style={{ borderColor: '#2ecc71' }}>
                <label className="special-label" style={{ color: '#2ecc71' }}>Economy</label>
                <div className="form-group">
                    <label className="form-label">Currencies (Comma Separated IDs)</label>
                    <input 
                        defaultValue={form.currencyQualities?.join(', ')} 
                        onBlur={e => handleArrayChange('currencyQualities', e.target.value)} 
                        className="form-input" 
                        placeholder="gold, echoes" 
                    />
                    <p className="special-desc">These will be moved from the sidebar to the Wallet header. Entries not otherwise marked with $ as a '$quality' will still be counted as such.</p>
                </div>
                
                {/* AUTO CREATE BUTTONS */}
                {missingCurrencies.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {missingCurrencies.map(c => {
                             const id = cleanID(c);
                             return (
                                <button 
                                    key={id} 
                                    onClick={() => createQuality(id, QualityType.Counter)}
                                    style={{ background: '#2ecc71', color: 'black', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    + Create {id}
                                </button>
                             );
                        })}
                    </div>
                )}
            </div>

            {/* 6. VISUALS */}
            <div className="special-field-group" style={{ borderColor: '#c678dd' }}>
                <label className="special-label" style={{ color: '#c678dd' }}>Visuals</label>
                 <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Layout Style</label>
                        <select value={form.layoutStyle || 'nexus'} onChange={e => handleChange('layoutStyle', e.target.value)} className="form-select">
                            <option value="nexus">Classic (Icon Header)</option>
                            <option value="london">Cinematic (Full Banner)</option>
                            <option value="elysium">Immersive (Split View)</option>
                            <option value="tabletop">Tabletop (Three Column)</option>
                        </select>
                        <label className="form-label">Visual Theme</label>
                            <select 
                                value={form.visualTheme || 'default'} 
                                onChange={e => handleChange('visualTheme', e.target.value)}
                                className="form-select"
                                size={10} // Show list box for easier browsing
                            >
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
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <ThemePreview theme={form.visualTheme || 'default'} />
                        
                    </div>
                    
                </div>
                

                
                 <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem' }}>
                    <label className="toggle-label"><input type="checkbox" checked={form.enablePortrait !== false} onChange={e => handleChange('enablePortrait', e.target.checked)} /> Show Portrait</label>
                     
                     {form.enablePortrait !== false && (
                         <div className="form-group" style={{ marginTop: '1rem' }}>
                            <select value={form.portraitStyle || 'circle'} onChange={e => handleChange('portraitStyle', e.target.value)} className="form-select" style={{ fontSize: '0.8rem', padding: '2px 8px' }}>
                                <option value="circle">Circle</option>
                                <option value="square">Square</option>
                                <option value="rect">Portrait</option>
                            </select>
                         </div>
                     )}

                     <label className="toggle-label"><input type="checkbox" checked={form.enableTitle || false} onChange={e => handleChange('enableTitle', e.target.checked)} /> Show Title</label>
                     {(form.layoutStyle === 'elysium' || form.layoutStyle === 'tabletop') && (
                        <div style={{ marginTop: '1rem' }}>
                            <label className="toggle-label">
                                <input 
                                    type="checkbox" 
                                    checked={form.enableParallax !== false} // Default true if undefined
                                    onChange={e => handleChange('enableParallax', e.target.checked)}
                                />
                                Enable Parallax Effect
                            </label>
                            <p className="special-desc">Moves background image with mouse cursor.</p>
                        </div>
                    )}
                 </div>
                 {form.enableTitle && (
                            <div className="form-group">
                                <label className="form-label">Title Quality ID</label>
                                <input 
                                    value={form.titleQualityId || ''} 
                                    onChange={e => handleChange('titleQualityId', e.target.value)} 
                                    className="form-input" 
                                    placeholder="$current_title or $reputation" 
                                />
                                <p className="special-desc">
                                    If set, the name of this quality (or its value if it's a String) will appear under the player name.
                                </p>
                            </div>
                 )}
                 
                 <div style={{ marginTop: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label">Sidebar Categories</label>
                        <input defaultValue={form.characterSheetCategories.join(', ')} onBlur={e => handleArrayChange('characterSheetCategories', e.target.value)} className="form-input" placeholder="character, menace" />
                        <p className="special-desc">These quality categories will be displayed on the character sheet in the sidebar.</p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Equipment Slots</label>
                        <input defaultValue={form.equipCategories?.join(', ')} onBlur={e => handleArrayChange('equipCategories', e.target.value)} className="form-input" placeholder="head, body" />
                        <p className="special-desc">These qualities will count as their own equipment slot, and equipable qualities assigned to these categories are equippable in that slot.</p>
                    </div>
                 </div>
            </div>

            {/* 7. CHARACTER INITIALIZATION */}
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

// --- HELPER COMPONENTS ---

const PRESETS: Record<string, Record<string, string>> = {
    "Identity (Simple)": { "$player_name": "string", "$player_portrait": "avatar_1 | avatar_2" },
    "Identity (Complex)": { "$player_first_name": "string", "$player_last_name": "string", "$player_name": "$player_first_name + ' ' + $player_last_name", "$player_portrait": "avatar_1 | avatar_2" },
    "Basic Stats": { "$body": "10", "$mind": "10", "$spirit": "10" },
    "Start Location": { "$location": "village_square" }
};

interface CharCreateProps {
    rules: Record<string, string>;
    onChange: (r: Record<string, string>) => void;
    systemKeys: { actions: string; name: string; image: string };
    storyId: string; 
    existingQIDs: string[];
    onCreateQuality: (id: string, type: QualityType) => void;
}

function CharCreateEditor({ rules, onChange, systemKeys, storyId, existingQIDs, onCreateQuality }: CharCreateProps) {
    const [newKey, setNewKey] = useState("");
    const [newVal, setNewVal] = useState("");

    const hasKey = (key: string) => {
        if (!key) return true;
        const clean = key.replace('$', '');
        return Object.keys(rules).some(k => k.replace('$', '') === clean);
    };

    const missingSystem = [];
    if (!hasKey(systemKeys.actions)) missingSystem.push({ label: "Actions", key: systemKeys.actions, val: "20" });
    if (!hasKey(systemKeys.name)) missingSystem.push({ label: "Name", key: systemKeys.name, val: "string" });

    const missingDefinitions = Object.keys(rules).filter(key => {
        const qid = key.replace('$', '');
        if (existingQIDs.length === 0) return false; 
        return !existingQIDs.includes(qid);
    });

    const handleUpdate = (key: string, val: string) => onChange({ ...rules, [key]: val });
    const handleDelete = (key: string) => { const next = { ...rules }; delete next[key]; onChange(next); };
    const handleAdd = () => { onChange({ ...rules, [newKey.startsWith('$') ? newKey : `$${newKey}`]: newVal || "0" }); setNewKey(""); setNewVal(""); };
    const applyPreset = (p: string) => onChange({ ...rules, ...PRESETS[p] });

    const addMissingKey = (key: string, val: string) => onChange({ ...rules, [key]: val });

    return (
        <div className="special-field-group" style={{ borderColor: '#98c379' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><label className="special-label" style={{ color: '#98c379', margin: 0 }}>Character Initialization</label></div>
            <p className="special-desc" style={{ marginBottom: '1.5rem' }}>
                Define the starting state for every new player. You can set static numbers (<code>10</code>), 
                ask for user input (<code>string</code>), or offer choices (<code>A | B</code>).
                This includes items and specific story progress such as <em>$tutorial_progress</em> for example.
            </p>
            {/* ALERTS */}
            {missingSystem.length > 0 && (
                <div style={{ background: 'rgba(231, 76, 60, 0.1)', border: '1px solid #e74c3c', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                    <p style={{ margin: 0, color: '#e74c3c', fontWeight: 'bold', fontSize: '0.8rem' }}>Missing System Bindings</p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {missingSystem.map(m => <button key={m.key} onClick={() => addMissingKey(m.key, m.val)} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>+ Init {m.label}</button>)}
                    </div>
                </div>
            )}
            {missingDefinitions.length > 0 && (
                 <div style={{ background: 'rgba(241, 196, 15, 0.1)', border: '1px solid #f1c40f', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#f1c40f', fontSize: '0.8rem', fontWeight: 'bold' }}>Undefined Qualities</p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>{missingDefinitions.map(k => <button key={k} onClick={() => onCreateQuality(k.replace('$', ''), QualityType.Pyramidal)} style={{ background: '#f1c40f', color: 'black', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>🪄 Create {k}</button>)}</div>
                </div>
            )}

            {/* PRESETS */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {Object.keys(PRESETS).map(p => <button key={p} onClick={() => applyPreset(p)} style={{ background: '#2a3e5c', border: '1px solid #3e5a8a', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>{p}</button>)}
            </div>

            {/* LIST */}
            <div style={{ display: 'grid', gap: '0.5rem' }}>
                {Object.entries(rules).map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#1e2127', padding: '0.5rem', borderRadius: '4px', borderLeft: '3px solid #98c379' }}>
                         <div style={{ flex: 1, fontFamily: 'monospace', color: '#98c379' }}>{key}</div>
                         <input value={val} onChange={e => handleUpdate(key, e.target.value)} className="form-input" style={{flex:2}} />
                         <button onClick={() => handleDelete(key)} style={{color: '#e06c75', background: 'none', border: 'none'}}>✕</button>
                    </div>
                ))}
             </div>
             <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #333' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#aaa', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
                    Add Quality to Defaults
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                        <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="$quality_id" className="form-input" />
                        <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>The ID used in code.</p>
                    </div>
                    <div style={{ flex: 1 }}>
                        <input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="Initial Value" className="form-input" />
                        <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>'10', 'string', or 'A | B'</p>
                    </div>
                    <button onClick={handleAdd} className="save-btn" style={{ width: 'auto', padding: '0.5rem 1.5rem', height: 'fit-content' }}>Add</button>
                </div>
            </div>
        </div>
    );
}


