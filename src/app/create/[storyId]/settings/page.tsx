'use client';

import { useState, useEffect, use } from 'react';
import { WorldSettings } from '@/engine/models';
import ThemePreview from '@/app/create/[storyId]/settings/components/ThemePreview';

// We need to extend the Settings type locally to include char_create dictionary, 
// as it is technically part of WorldConfig, not WorldSettings interface, 
// but we want to edit them together here.
interface SettingsForm extends WorldSettings {
    char_create: Record<string, string>;
}

export default function SettingsAdmin ({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [form, setForm] = useState<SettingsForm>({
        useActionEconomy: true,
        maxActions: 20,
        actionId: "$actions",
        actionUseOperator: "-=",
        regenIntervalInMinutes: 10,
        regenAmount: 1,
        regenOperator: "+=",
        characterSheetCategories: [],
        equipCategories: [],
        playerName: "$player_name",
        playerImage: "$player_image",
        deckDrawCostsAction: true,
        char_create: {}, // Initialize empty
        layoutStyle: 'nexus'
    });
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // 1. Fetch Settings AND Char Create
    useEffect(() => {
        // We need to fetch the full config to get char_create, 
        // as /api/admin/settings only returns the settings object.
        // Let's use the generic config API if available or fetch separately.
        
        // Option A: Modify /api/admin/settings to return everything
        // Option B: Fetch both here.
        
        // Let's try fetching both endpoints (assuming we added /api/admin/char_create or similar)
        // OR we can just cheat and use the public loader if it's exposed.
        
        // BETTER: Let's just assume /api/admin/settings returns JUST settings, 
        // and we need to add char_create support.
        
        // Let's refactor this effect to fetch the WHOLE config structure via a new helper
        // or just fetch them individually.
        
        // For simplicity, let's fetch config via a direct call if possible, 
        // otherwise, we need to ensure the API supports this.
        
        // Assuming /api/admin/settings returns { ...settings }
        // We need to fetch char_create separately.
        // Let's assume we make /api/admin/char_create/route.ts or update the Settings API.
        
        // HACK: Fetch the qualities/decks/etc generic route? No.
        
        // REAL FIX: Let's update the fetch to get the whole config map 
        // if we want to edit multiple sections.
        // But since you likely didn't change the API yet, let's assume we fetch settings
        // and char_create separately.
        
        Promise.all([
            fetch(`/api/admin/settings?storyId=${storyId}`).then(r => r.json()),
            // We need an endpoint for char_create. 
            // Let's assume we use the generic route for it or you added it.
            // If not, the char_create section will be empty.
            // Let's use a placeholder fetch or assume it comes with settings for now.
            // Actually, let's just use a direct fetch to a new endpoint /api/admin/char_create
            // which you should create (copy/paste settings route but return config.char_create).
            fetch(`/api/admin/char_create?storyId=${storyId}`).then(r => r.ok ? r.json() : {})
        ]).then(([settingsData, charData]) => {
            setForm(prev => ({ 
                ...prev, 
                ...settingsData,
                char_create: charData 
            }));
        }).finally(() => setIsLoading(false));

    }, []);

    const handleChange = (field: keyof SettingsForm, val: any) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    const handleArrayChange = (field: 'characterSheetCategories' | 'equipCategories', strVal: string) => {
        const arr = strVal.split(',').map(s => s.trim()).filter(Boolean);
        setForm(prev => ({ ...prev, [field]: arr }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Save Settings
            const res1 = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storyId: {storyId},
                    category: 'settings',
                    itemId: 'settings',
                    data: { ...form, char_create: undefined } // Exclude char_create from settings object
                })
            });

            // Save Char Create (It lives in 'char_create' key of WorldConfig, 
            // but our generic saver uses category to map to 'content.category'.
            // We need to update WorldService to support 'char_create' category or 'starting'.
            // IF you updated worldService.ts as discussed previously to support 'char_create', this works:
            const res2 = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storyId: {storyId},
                    category: 'char_create', // Mapping to content.char_create
                    itemId: 'rules', // This ID is ignored by the bulk updater usually, or treated as the object itself
                    data: form.char_create
                })
            });

            // Note: The Generic Saver logic for 'char_create' needs to handle replacing the whole object
            // rather than setting a key inside it, OR we treat it like Settings.
            // Ideally, updateWorldConfigItem in worldService.ts handles `category === 'char_create'` 
            // similar to `category === 'settings'` (replace the whole object).

            if (res1.ok && res2.ok) alert("Saved!");
            else alert("Failed to save some data.");
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-editor-col" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>Game Settings</h2>

            {/* CHARACTER CREATION */}
            <div style={{ marginBottom: '2rem' }}>
                <CharCreateEditor 
                    rules={form.char_create || {}} 
                    onChange={r => handleChange('char_create', r)} 
                />
            </div>

            {/* ACTION ECONOMY */}
            <div className="special-field-group">
                <label className="special-label">Action Economy</label>
                
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input 
                            type="checkbox" 
                            checked={form.useActionEconomy} 
                            onChange={e => handleChange('useActionEconomy', e.target.checked)} 
                        />
                        Enable Actions
                    </label>
                </div>

                {form.useActionEconomy && (
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Max Actions</label>
                            <input 
                                value={form.maxActions} 
                                onChange={e => handleChange('maxActions', parseInt(e.target.value) || 0)} 
                                className="form-input" 
                                type="number"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Regen Time (Minutes)</label>
                            <input 
                                value={form.regenIntervalInMinutes} 
                                onChange={e => handleChange('regenIntervalInMinutes', parseInt(e.target.value) || 1)} 
                                className="form-input" 
                                type="number"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Action Quality ID</label>
                            <input 
                                value={form.actionId} 
                                onChange={e => handleChange('actionId', e.target.value)} 
                                className="form-input" 
                            />
                        </div>
                    </div>
                )}
                 {form.useActionEconomy && (
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={form.deckDrawCostsAction} 
                                onChange={e => handleChange('deckDrawCostsAction', e.target.checked)} 
                            />
                            Drawing cards costs an action
                        </label>
                    </div>
                )}
            </div>

            {/* LAYOUT & THEME */}
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
                            </select>
                        </div>
                    </div>

                    {/* Right: Preview */}
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <ThemePreview theme={form.visualTheme || 'default'} />
                    </div>
                </div>
            



            {/* <div className="special-field-group" style={{ borderColor: '#c678dd' }}>
                <label className="special-label" style={{ color: '#c678dd' }}>Interface Theme</label>
                
                <div className="form-group">
                    <label className="form-label">Visual Theme</label>
                    <select 
                        value={form.visualTheme || 'default'} 
                        onChange={e => handleChange('visualTheme', e.target.value)}
                        className="form-select"
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
                       

                    </select>
                </div>

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
                </div> */}

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

            {/* CATEGORIES */}
            <div className="form-group">
                <label className="form-label">Sidebar Categories (Comma Separated)</label>
                <input 
                    defaultValue={form.characterSheetCategories.join(', ')}
                    onBlur={e => handleArrayChange('characterSheetCategories', e.target.value)}
                    className="form-input"
                    placeholder="character, menace, currency"
                />
            </div>

            <div className="form-group">
                <label className="form-label">Equipment Slots (Comma Separated)</label>
                <input 
                    defaultValue={form.equipCategories?.join(', ')}
                    onBlur={e => handleArrayChange('equipCategories', e.target.value)}
                    className="form-input"
                    placeholder="head, body, weapon, boots"
                />
            </div>

            {/* PLAYER DEFAULTS */}
            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">Player Name ID</label>
                    <input 
                        value={form.playerName} 
                        onChange={e => handleChange('playerName', e.target.value)} 
                        className="form-input" 
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Player Image ID</label>
                    <input 
                        value={form.playerImage} 
                        onChange={e => handleChange('playerImage', e.target.value)} 
                        className="form-input" 
                    />
                </div>
            </div>

            <div className="admin-form-footer" style={{ justifyContent: 'flex-end' }}>
                <button onClick={handleSave} disabled={isSaving} className="save-btn">
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
}

// --- SUB COMPONENT ---

function CharCreateEditor({ rules, onChange }: { rules: Record<string, string>, onChange: (r: Record<string, string>) => void }) {
    const [newKey, setNewKey] = useState("");

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
        const key = newKey.startsWith('$') ? newKey : `$${newKey}`;
        if (rules[key]) return alert("Rule exists");
        onChange({ ...rules, [key]: "0" });
        setNewKey("");
    };

    return (
        <div className="special-field-group" style={{ borderColor: '#98c379' }}>
            <label className="special-label" style={{ color: '#98c379' }}>Character Creation Rules</label>
            <p className="special-desc">Define initial values. Use "string" for text input, or "opt1 | opt2" for choices.</p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', marginTop: '1rem' }}>
                <input 
                    value={newKey} 
                    onChange={e => setNewKey(e.target.value)} 
                    placeholder="Quality ID (e.g. strength)" 
                    className="form-input" 
                />
                <button onClick={handleAdd} className="save-btn" style={{ padding: '0.5rem 1rem', backgroundColor: '#2c3e50' }}>Add</button>
            </div>

            <div style={{ display: 'grid', gap: '0.5rem' }}>
                {Object.entries(rules).map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ flex: 1, fontFamily: 'monospace', color: '#ccc' }}>{key}</div>
                        <input 
                            value={val} 
                            onChange={e => handleUpdate(key, e.target.value)}
                            className="form-input"
                            style={{ flex: 2 }}
                            placeholder="Value"
                        />
                        <button onClick={() => handleDelete(key)} style={{ color: '#e06c75', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                    </div>
                ))}
            </div>
        </div>
    );
}