'use client';

import { useState, useEffect } from 'react';
import { WorldSettings } from '@/engine/models';

export default function SettingsAdmin() {
    // Default state matching your model
    const [form, setForm] = useState<WorldSettings>({
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
        deckDrawCostsAction: true
    });
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // 1. Fetch Settings
    useEffect(() => {
        // We can use the Generic Config API? No, that was for Lists.
        // We need a GET for settings. 
        // Actually, we can assume a new route /api/admin/settings exists, 
        // OR reuse the pattern if we adjust the generic route to handle 'settings' retrieval.
        
        // Let's assume we make a specific GET route for simplicity, 
        // OR just use the public game loader logic for now.
        
        // Let's implement the GET logic inline here via a new route or existing one.
        // Ideally: /api/admin/settings?storyId=...
        fetch('/api/admin/settings?storyId=trader_johns_world')
            .then(res => res.json())
            .then(data => {
                // Merge defaults to ensure no crash on missing fields
                setForm(prev => ({ ...prev, ...data }));
            })
            .finally(() => setIsLoading(false));
    }, []);

    const handleChange = (field: keyof WorldSettings, val: any) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    // Helper for Comma-Separated Arrays (Categories)
    const handleArrayChange = (field: 'characterSheetCategories' | 'equipCategories', strVal: string) => {
        const arr = strVal.split(',').map(s => s.trim()).filter(Boolean);
        setForm(prev => ({ ...prev, [field]: arr }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Uses the Generic Config Saver we built earlier!
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storyId: 'trader_johns_world',
                    category: 'settings',
                    itemId: 'settings', // Dummy ID for the generic saver logic
                    data: form
                })
            });

            if (res.ok) alert("Settings Saved!");
            else alert("Failed to save.");
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-editor-col" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>Game Settings</h2>

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

            {/* CATEGORIES */}
            <div className="form-group">
                <label className="form-label">Sidebar Categories (Comma Separated)</label>
                <input 
                    defaultValue={form.characterSheetCategories.join(', ')}
                    onBlur={e => handleArrayChange('characterSheetCategories', e.target.value)}
                    className="form-input"
                    placeholder="character, menace, currency"
                />
                <small style={{ color: '#777' }}>Qualities with these categories will appear in the sidebar.</small>
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

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleSave} disabled={isSaving} className="save-btn">
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
}