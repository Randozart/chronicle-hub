'use client';

import { useState, useEffect, use } from 'react';
import { WorldSettings } from '@/engine/models';
import ThemePreview from '@/app/create/[storyId]/settings/components/ThemePreview';
import CollaboratorManager from './components/CollaboratorManager';
import { QualityType } from '@/engine/models'; // Import QualityType

interface SettingsForm extends WorldSettings {
    char_create: Record<string, string>;
    isPublished?: boolean; 
    coverImage?: string;
    tags?: string[];    
}

export default function SettingsAdmin ({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [form, setForm] = useState<SettingsForm>({
        useActionEconomy: true,
        maxActions: 20, // Can be number or string
        actionId: "$actions",
        regenIntervalInMinutes: 10,
        regenAmount: 1,
        characterSheetCategories: [],
        equipCategories: [],
        playerName: "$player_name",
        playerImage: "$player_portrait",
        deckDrawCostsAction: true,
        char_create: {},
        layoutStyle: 'nexus',
        currencyQualities: [], // e.g. ["gold", "jade", "favours"]
        defaultActionCost: 1,  // <--- Initialize
        startLocation: "village",
    });
    
    const [existingQIDs, setExistingQIDs] = useState<string[]>([]); // Track existing DB qualities
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            // Fetch everything in parallel
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
                // Safety defaults for arrays
                characterSheetCategories: sData.characterSheetCategories || [],
                equipCategories: sData.equipCategories || [],
                currencyQualities: sData.currencyQualities || [],
                char_create: cData || {}
            }));
            setIsLoading(false);
        };
        load();
    }, [storyId]);

    const handleChange = (field: keyof SettingsForm, val: any) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    const handleArrayChange = (field: 'characterSheetCategories' | 'equipCategories' | 'currencyQualities' | 'tags', strVal: string) => {
        const arr = strVal.split(',').map(s => s.trim()).filter(Boolean);
        setForm(prev => ({ ...prev, [field]: arr }));
    };
    
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
            setExistingQIDs(prev => [...prev, cleanId]); // Optimistic update
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
            // Save Root
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'root', itemId: 'published', data: form.isPublished })
            });
            // Save Meta
            await fetch('/api/admin/config', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ storyId, category: 'root', itemId: 'coverImage', data: form.coverImage })
             });
             await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'root', itemId: 'tags', data: form.tags })
            });

            alert("Saved!");
        } catch (e) {
            console.error(e);
            alert("Error saving.");
        } finally {
            setIsSaving(false);
        }
    };

    

    if (isLoading) return <div className="loading-container">Loading...</div>;
    
    const cleanID = (id: string) => id.replace('$', '').trim();

    const missingCurrencies = (form.currencyQualities || [])
        .filter(c => Boolean(c)) // remove empty strings
        .filter(c => !existingQIDs.includes(cleanID(c)));

    return (
        <div className="admin-editor-col" style={{ maxWidth: '900px', margin: '0 auto' }}>            
            
            {/* --- 1. HEADER & META DATA (Moved to Top) --- */}
            <div style={{ borderBottom: '1px solid #444', paddingBottom: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>Game Settings</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: form.isPublished ? '#2ecc71' : '#e74c3c', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                            {form.isPublished ? 'LIVE' : 'PRIVATE'}
                        </span>
                        <label className="toggle-label">
                            <input type="checkbox" checked={form.isPublished || false} onChange={e => handleChange('isPublished', e.target.checked)} />
                            Publish World
                        </label>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Cover Image URL</label>
                        <input value={form.coverImage || ''} onChange={e => handleChange('coverImage', e.target.value)} className="form-input" placeholder="https://..." />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Tags (Comma Separated)</label>
                        <input defaultValue={form.tags?.join(', ')} onBlur={e => handleArrayChange('tags', e.target.value)} className="form-input" placeholder="Fantasy, Mystery, Noir" />
                    </div>
                </div>
            </div>

            {/* --- 2. SYSTEM BINDINGS (The New "Keys" Section) --- */}
            <div className="special-field-group" style={{ borderColor: '#e5c07b' }}>
                <label className="special-label" style={{ color: '#e5c07b' }}>System Bindings</label>
                <p className="special-desc">
                    Tell the engine which of your Qualities represent core system features. 
                    This allows you to use variables like <code>$actions</code> or <code>$player_name</code> in your narrative.
                </p>

                <div className="form-row" style={{ marginTop: '1.5rem' }}>
                    <div className="form-group">
                        <label className="form-label">Action Counter ID</label>
                        <input 
                            value={form.actionId} 
                            onChange={e => handleChange('actionId', e.target.value)} 
                            className="form-input" 
                            placeholder="$actions"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Player Name ID</label>
                        <input 
                            value={form.playerName} 
                            onChange={e => handleChange('playerName', e.target.value)} 
                            className="form-input" 
                            placeholder="$player_name"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Player Portrait ID</label>
                        <input 
                            value={form.playerImage} 
                            onChange={e => handleChange('playerImage', e.target.value)} 
                            className="form-input" 
                            placeholder="$player_portrait"
                        />
                    </div>
                     <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label className="form-label">Starting Location ID</label>
                        <input 
                            value={form.startLocation || ''} 
                            onChange={e => handleChange('startLocation', e.target.value)} 
                            className="form-input" 
                            placeholder="village_square"
                        />
                        <p className="special-desc">Where new characters spawn if not specified in creation rules.</p>
                    </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic', marginTop: '0.5rem' }}>
                    * Ensure these IDs exist in your Qualities list and are initialized in "Character Creation" below.
                </p>
            </div>

            {/* --- PLAYER IDENTITY SETTINGS --- */}
            <div className="special-field-group" style={{ borderColor: '#f39c12' }}>
                <label className="special-label" style={{ color: '#f39c12' }}>Identity & Profile</label>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    
                    {/* LEFT: PORTRAIT CONFIG */}
                    <div>
                        <label className="toggle-label" style={{ marginBottom: '1rem' }}>
                            <input 
                                type="checkbox" 
                                checked={form.enablePortrait !== false} // Default true
                                onChange={e => handleChange('enablePortrait', e.target.checked)} 
                            />
                            Show Portrait
                        </label>

                        {form.enablePortrait !== false && (
                            <div className="form-group">
                                <label className="form-label">Portrait Style</label>
                                <select 
                                    value={form.portraitStyle || 'circle'} 
                                    onChange={e => handleChange('portraitStyle', e.target.value)}
                                    className="form-select"
                                >
                                    <option value="circle">Circle (Avatar)</option>
                                    <option value="square">Square (Retro)</option>
                                    <option value="rect">Portrait (3:4 Card)</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: TITLE CONFIG */}
                    <div>
                        <label className="toggle-label" style={{ marginBottom: '1rem' }}>
                            <input 
                                type="checkbox" 
                                checked={form.enableTitle || false} 
                                onChange={e => handleChange('enableTitle', e.target.checked)} 
                            />
                            Show Title
                        </label>

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
                    </div>
                </div>
            </div>

            {/* --- GAME RULES SECTION --- */}
            <div className="special-field-group" style={{ borderColor: '#61afef' }}>
                <label className="special-label" style={{ color: '#61afef' }}>Game Rules & Physics</label>
                
                <div style={{ marginBottom: '1.5rem' }}>
                    <label className="toggle-label">
                        <input type="checkbox" checked={form.useActionEconomy} onChange={e => handleChange('useActionEconomy', e.target.checked)} />
                        Enable Action/Time Economy
                    </label>
                </div>

                {form.useActionEconomy && (
                    <div className="form-group" style={{ borderTop: '1px dashed #444', paddingTop: '1rem' }}>
                        
                        {/* 1. THE METER (What are we tracking?) */}
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Main Resource ID</label>
                                <input 
                                    value={form.actionId} 
                                    onChange={e => handleChange('actionId', e.target.value)} 
                                    className="form-input" 
                                    placeholder="$actions"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Max Value (Cap)</label>
                                <input 
                                    value={form.maxActions} 
                                    onChange={e => handleChange('maxActions', e.target.value)} 
                                    className="form-input" 
                                    placeholder="20 or $vitality * 2"
                                />
                            </div>
                        </div>

                        {/* 2. REGENERATION (Time passing) */}
                        <div className="form-group" style={{ marginTop: '1rem', background: 'rgba(97, 175, 239, 0.1)', padding: '1rem', borderRadius: '4px' }}>
                            <label className="form-label" style={{ color: '#61afef' }}>Time Passing (Regeneration)</label>
                            <div className="form-row">
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Interval (Minutes)</label>
                                    <input 
                                        type="number" 
                                        value={form.regenIntervalInMinutes} 
                                        onChange={e => handleChange('regenIntervalInMinutes', parseInt(e.target.value))} 
                                        className="form-input" 
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Effect per Tick</label>
                                    <input 
                                        value={form.regenAmount} 
                                        onChange={e => handleChange('regenAmount', e.target.value)} 
                                        className="form-input" 
                                        placeholder="1 or $wounds -= 1"
                                    />
                                </div>
                            </div>
                            <p className="special-desc">
                                If <strong>Effect</strong> is a number (e.g. <code>1</code>), it adds to the Main Resource.
                                <br/>
                                If it is logic (e.g. <code>$wounds -= 1</code>), it executes that logic every interval.
                            </p>
                        </div>

                        {/* 3. COSTS (Clicking buttons) */}
                        <div className="form-group" style={{ marginTop: '1rem' }}>
                            <label className="form-label">Default Action Cost</label>
                            <input 
                                value={form.defaultActionCost || ''} 
                                onChange={e => handleChange('defaultActionCost', e.target.value)} 
                                className="form-input" 
                                placeholder="1 or $stress++"
                            />
                            <p className="special-desc">
                                The "Tax" for clicking any Storylet option. 
                                <br/>
                                • Number (<code>1</code>): Subtracts 1 from Main Resource.
                                <br/>
                                • Logic (<code>$stress++</code>): Executes this effect instead.
                            </p>
                        </div>
                    </div>
                )}

                {/* NEW: Default Draw Cost */}
                <div className="form-group" style={{ marginTop: '1rem', borderTop: '1px dashed #444', paddingTop: '1rem' }}>
                    <label className="form-label">Default Deck Draw Cost</label>
                    <input 
                        value={form.defaultDrawCost || ''} 
                        onChange={e => handleChange('defaultDrawCost', e.target.value)} 
                        className="form-input" 
                        placeholder="Numeric (1, 2, 0) or a quality modification ($gold -= 5 or $wounds++)"
                    />
                    <p className="special-desc">Applied if a deck doesn't specify its own cost.</p>
                </div>
            </div>

            {/* ECONOMY (With Auto-Create) */}
            <div className="special-field-group" style={{ borderColor: '#f1c40f' }}>
                <label className="special-label" style={{ color: '#f1c40f' }}>Special Categories (Comma Separated IDs)</label>
                <div className="form-group">
                    <label className="form-label">Currencies</label>
                    <input 
                        defaultValue={form.currencyQualities?.join(', ')} 
                        onBlur={e => handleArrayChange('currencyQualities', e.target.value)} 
                        className="form-input" 
                        placeholder="gold, echoes, favour" 
                    />
                    <p className="special-desc">These will be moved from the sidebar to the Wallet header. Entries not otherwise marked with $ as a '$quality' will still be counted as such.</p>
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label className="form-label">Sidebar Categories</label>
                        <input defaultValue={form.characterSheetCategories.join(', ')} onBlur={e => handleArrayChange('characterSheetCategories', e.target.value)} className="form-input" placeholder="character, menace, currency" />
                    </div>
                    <p className="special-desc">These quality categories will be displayed on the character sheet in the sidebar.</p>
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label className="form-label">Equipment Slots</label>
                        <input defaultValue={form.equipCategories?.join(', ')} onBlur={e => handleArrayChange('equipCategories', e.target.value)} className="form-input" placeholder="head, body, weapon" />
                    </div>
                    <p className="special-desc">These qualities will count as their own equipment slot, and equipable qualities assigned to these categories are equippable in that slot.</p>
                </div>
                
                {/* AUTO CREATE BUTTONS FOR CURRENCY */}
                {missingCurrencies.length > 0 && (
                    <div style={{ background: 'rgba(241, 196, 15, 0.1)', border: '1px solid #f1c40f', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                        <p style={{ margin: '0 0 0.5rem 0', color: '#f1c40f', fontSize: '0.8rem', fontWeight: 'bold' }}>Missing Definitions:</p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {missingCurrencies.map(c => {
                                const id = cleanID(c);
                                return (
                                    <button 
                                        key={id} 
                                        onClick={() => createQuality(id, QualityType.Counter)}
                                        style={{ background: '#f1c40f', color: 'black', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        + Create Quality: {id}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* --- 4. VISUALS --- */}
            <div className="special-field-group" style={{ borderColor: '#c678dd' }}>
                <label className="special-label" style={{ color: '#c678dd' }}>Interface Theme</label>
                
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    {/* Left: Controls */}
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <div className="form-group">
                            <label className="form-label">Layout Style</label>
                            <select 
                                value={form.layoutStyle || 'nexus'} 
                                onChange={e => handleChange('layoutStyle', e.target.value)}
                                className="form-select"
                            >
                                <option value="nexus">Classic (Icon Header)</option>
                                <option value="london">Cinematic (Full Banner)</option>
                                <option value="elysium">Immersive (Split View)</option>
                                <option value="tabletop">Tabletop (Three Column)</option>
                            </select>
                        </div>

                        <div className="form-group">
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
                    </div>

                    {/* Right: Preview */}
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <ThemePreview theme={form.visualTheme || 'default'} />
                    </div>
                </div>

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
  
            {/* --- 5. CHARACTER INITIALIZATION --- */}
            <div style={{ marginBottom: '3rem' }}>
                <CharCreateEditor 
                    rules={form.char_create || {}} 
                    onChange={r => handleChange('char_create', r)} 
                    systemKeys={{
                        actions: form.actionId,
                        name: form.playerName,
                        image: form.playerImage
                    }}
                    storyId={storyId} /* <--- ADD THIS LINE */
                />
            </div>
            
            <CollaboratorManager storyId={storyId} />

            <div className="admin-form-footer" style={{ justifyContent: 'flex-end' }}>
                <button onClick={handleSave} disabled={isSaving} className="save-btn">
                    {isSaving ? 'Saving...' : 'Save All Settings'}
                </button>
            </div>
        </div>
    );
}

// --- HELPER COMPONENTS ---

const PRESETS: Record<string, Record<string, string>> = {
    "Identity (Simple)": {
        "$player_name": "string",
        "$player_portrait": "avatar_1 | avatar_2 | avatar_3"
    },
    "Identity (Complex)": {
        "$player_first_name": "string",
        "$player_last_name": "string",
        "$player_name": "$player_first_name + ' ' + $player_last_name", // Logic!
        "$player_portrait": "avatar_1 | avatar_2"
    },
    "RPG Stats (D&D)": {
        "$strength": "10",
        "$dexterity": "10",
        "$constitution": "10",
        "$intelligence": "10",
        "$wisdom": "10",
        "$charisma": "10"
    },
    "RPG Stats (Fallen London)": {
        "$watchful": "10",
        "$shadowy": "10",
        "$dangerous": "10",
        "$persuasive": "10"
    },
    "Survival Basics": {
        "$health": "10",
        "$hunger": "0",
        "$thirst": "0"
    },
    "Economy": {
        "$gold": "50",
        "$rations": "5"
    },
    "Start Location": {
        "$location": "village_square"
    }
};

interface CharCreateProps {
    rules: Record<string, string>;
    onChange: (r: Record<string, string>) => void;
    systemKeys: { actions: string, name: string, image: string };
    storyId: string; // <--- Added this
}

function CharCreateEditor({ rules, onChange, systemKeys, storyId }: CharCreateProps) {
    const [newKey, setNewKey] = useState("");
    const [newVal, setNewVal] = useState("");

    // Helper to strip $ for comparison, ensuring we find the key regardless of format
    const hasKey = (key: string) => {
        const clean = key.replace('$', '');
        return Object.keys(rules).some(k => k.replace('$', '') === clean);
    };

    // Robust Missing Key Check
    const missingKeys = [];
    if (!hasKey(systemKeys.actions)) missingKeys.push({ label: "Actions", key: systemKeys.actions, val: "20" });
    if (!hasKey(systemKeys.name)) missingKeys.push({ label: "Name", key: systemKeys.name, val: "string" });
    if (!hasKey(systemKeys.image)) missingKeys.push({ label: "Portrait", key: systemKeys.image, val: "avatar_1 | avatar_2" });

    const handleUpdate = (key: string, val: string) => {
        onChange({ ...rules, [key]: val });
    };

    const handleDelete = (key: string) => {
        const next = { ...rules };
        delete next[key];
        onChange(next);
    };

    const handleAdd = () => {
        if (!newKey) return;
        // Auto-prepend $ if missing, for consistency in the UI list
        const key = newKey.startsWith('$') ? newKey : `$${newKey}`;
        onChange({ ...rules, [key]: newVal || "0" });
        setNewKey("");
        setNewVal("");
    };

    const applyPreset = (presetName: string) => {
        if (!confirm(`Add ${presetName} fields? This will merge with existing rules.`)) return;
        const preset = PRESETS[presetName];
        onChange({ ...rules, ...preset });
    };

    const addMissingKey = (key: string, val: string) => {
        // Ensure we use the format provided in the System Bindings setting
        onChange({ ...rules, [key]: val });
    };

    const [existingQIDs, setExistingQIDs] = useState<string[]>([]);
    
    useEffect(() => {
        // Quick fetch of just IDs to validate
        fetch(`/api/admin/qualities?storyId=${storyId}`).then(r => r.json()).then(data => {
            setExistingQIDs(Object.keys(data));
        });
    }, [storyId]);

    const missingDefinitions = Object.keys(rules).filter(key => {
        const qid = key.replace('$', '');
        return !existingQIDs.includes(qid);
    });

    // 2. AUTO-FIX HANDLER
    const handleAutoCreate = async (qidWithPrefix: string) => {
        const qid = qidWithPrefix.replace('$', '');
        const val = rules[qidWithPrefix];
        
        // Guess Type
        let type = QualityType.Pyramidal;
        if (val === 'string' || val.includes('+')) type = QualityType.String;
        
        const newQuality = {
            id: qid,
            name: qid.charAt(0).toUpperCase() + qid.slice(1).replace(/_/g, ' '),
            type: type,
            category: 'character', // Default category
            description: 'Auto-generated quality.'
        };

        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'qualities', itemId: qid, data: newQuality })
            });
            setExistingQIDs(prev => [...prev, qid]); // Update local list to remove alert
            alert(`Created quality: ${qid}`);
        } catch(e) { console.error(e); }
    };


    return (
        <div className="special-field-group" style={{ borderColor: '#98c379' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="special-label" style={{ color: '#98c379', margin: 0 }}>Character Initialization</label>
            </div>
            <p className="special-desc" style={{ marginBottom: '1.5rem' }}>
                Define the starting state for every new player. You can set static numbers (<code>10</code>), 
                ask for user input (<code>string</code>), or offer choices (<code>A | B</code>).
            </p>
            
             {/* RED ALERT: MISSING DEFINITIONS */}
             {missingDefinitions.length > 0 && (
                <div style={{ background: 'rgba(241, 196, 15, 0.1)', border: '1px solid #f1c40f', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#f1c40f', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        ⚠️ Undefined Qualities Detected
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#ffecb3', marginBottom: '0.75rem' }}>
                        The following rules reference qualities that don't exist in the database yet. 
                        The game engine might ignore them.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {missingDefinitions.map(key => (
                            <button 
                                key={key} 
                                onClick={() => handleAutoCreate(key)}
                                style={{ background: '#f1c40f', color: 'black', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                            >
                                🪄 Create {key}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* PRESETS TOOLBAR */}
            <div style={{ background: '#1e2127', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', border: '1px solid #333' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#aaa', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
                    Quick Presets
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {Object.keys(PRESETS).map(p => (
                        <button 
                            key={p} 
                            onClick={() => applyPreset(p)}
                            style={{ 
                                background: '#2a3e5c', border: '1px solid #3e5a8a', borderRadius: '4px', 
                                color: '#fff', fontSize: '0.75rem', padding: '0.4rem 0.8rem', cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                            className="hover:bg-[#3e5a8a]"
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* RULES LIST */}
            <div style={{ display: 'grid', gap: '0.5rem' }}>
                {Object.entries(rules).map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#1e2127', padding: '0.5rem 1rem', borderRadius: '4px', borderLeft: '3px solid #98c379' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'monospace', color: '#98c379', fontWeight: 'bold' }}>{key}</div>
                        </div>
                        <div style={{ color: '#777' }}>=</div>
                        <input 
                            value={val} 
                            onChange={e => handleUpdate(key, e.target.value)}
                            className="form-input"
                            style={{ flex: 2, border: 'none', background: 'transparent', borderBottom: '1px solid #444' }}
                            placeholder="e.g. 10 or string"
                        />
                        <button onClick={() => handleDelete(key)} style={{ color: '#e06c75', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', padding: '0 0.5rem' }}>✕</button>
                    </div>
                ))}
                
                {Object.keys(rules).length === 0 && (
                    <div style={{ textAlign: 'center', color: '#555', fontStyle: 'italic', padding: '2rem' }}>
                        No initialization rules yet. Use a preset or add one manually below.
                    </div>
                )}
            </div>

             {/* MANUAL ADD ROW */}
             <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #333' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#aaa', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
                    Add Custom Quality
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

