'use client';

import { useState, useEffect, use, useRef } from 'react';
import { WorldSettings, QualityDefinition, ImageDefinition, CharCreateRule, QualityType } from '@/engine/models';
import { useToast } from '@/providers/ToastProvider';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';
import CommandCenter from '@/components/admin/CommandCenter';
import { useRouter } from 'next/navigation';

// Sub-Components
import SettingsMainInfo from './components/SettingsMainInfo';
import SettingsSection from './components/SettingsSection';
import SettingsVisuals from './components/SettingsVisuals';
import SettingsGameSystem from './components/SettingsGameSystem'; // NEW
import CharCreateEditor from './components/CharCreateEditor';
import DataManagement from './components/DataManagement';
import CollaboratorManager from './components/CollaboratorManager';
import SmartArea from '@/components/admin/SmartArea';

interface FullSettingsForm extends WorldSettings {
    id: string; 
    char_create: Record<string, CharCreateRule>;
}

export default function SettingsAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    const router = useRouter();
    const guardRef = useRef<FormGuard | null>(null);

    const [expandAll, setExpandAll] = useState<'open' | 'closed' | null>(null);

    const [qualityDefs, setQualityDefs] = useState<Record<string, QualityDefinition>>({});
    const [imageLibrary, setImageLibrary] = useState<Record<string, ImageDefinition>>({});
    const [existingLocIDs, setExistingLocIDs] = useState<string[]>([]);
    const [existingQIDs, setExistingQIDs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const onSaveAll = async () => {
        if (!form) return;
        try {
            await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId, category: 'settings', itemId: 'settings', data: { ...form, char_create: undefined, id: undefined } }) });
            await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId, category: 'char_create', itemId: 'rules', data: form.char_create }) });
            
            const rootFields = ['isPublished', 'coverImage', 'summary', 'tags'];
            for (const field of rootFields) {
                await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId, category: 'root', itemId: field, data: (form as any)[field] }) });
            }
            resetState();
            showToast("Settings saved!", "success");
        } catch (e) { showToast("Error saving", "error"); }
    };
    
    const { 
        data: form, 
        handleChange, 
        revertChanges, 
        resetState,
        isDirty, 
        isSaving, 
        lastSaved,
        setData
    } = useCreatorForm<FullSettingsForm>(
        null, 
        '/api/admin/config', 
        { storyId },
        guardRef,
        onSaveAll
    );    

    useEffect(() => {
        const load = async () => {
            try {
                const endpoints = ['settings', 'char_create', 'qualities', 'locations', 'images'];
                const responses = await Promise.all(endpoints.map(ep => fetch(`/api/admin/${ep}?storyId=${storyId}`)));
                
                const [sRes, cRes, qRes, lRes, iRes] = responses;
                const sData = await sRes.json();
                
                const qData = qRes.ok ? await qRes.json() : {};
                const qDefs: Record<string, QualityDefinition> = {};
                (Array.isArray(qData) ? qData : Object.values(qData)).forEach((q: any) => qDefs[q.id] = q);
                setQualityDefs(qDefs);
                setExistingQIDs(Object.keys(qDefs));

                const lData = lRes.ok ? await lRes.json() : {};
                setExistingLocIDs(Array.isArray(lData) ? lData.map((l: any) => l.id) : Object.keys(lData));
                
                setImageLibrary(iRes.ok ? await iRes.json() : {});

                const defaults: FullSettingsForm = {
                    id: storyId,
                    useActionEconomy: true, maxActions: 20, actionId: "$actions", regenIntervalInMinutes: 10, regenAmount: 1,
                    defaultActionCost: 1, defaultDrawCost: "1",
                    characterSheetCategories: [], equipCategories: [], currencyQualities: [], 
                    playerName: "$player_name", playerImage: "$player_portrait",
                    layoutStyle: 'nexus', visualTheme: 'default', char_create: {},
                    isPublished: false, deckDrawCostsAction: true
                } as any;

                setData({
                    ...defaults,
                    ...sData,
                    id: storyId,
                    char_create: (cRes.ok ? await cRes.json() : {}) || {},
                    characterSheetCategories: sData.characterSheetCategories || [],
                    equipCategories: sData.equipCategories || [],
                    currencyQualities: sData.currencyQualities || [],
                    tags: sData.tags || []
                });

            } catch (e) {
                console.error(e);
                showToast("Failed to load settings", "error");
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [storyId]);

    

    const handleGenericChange = (field: string, val: any) => handleChange(field as keyof FullSettingsForm, val);
    const handleArrayChange = (field: keyof FullSettingsForm, strVal: string) => handleChange(field, strVal.split(',').map(s => s.trim()).filter(Boolean));
    
    // Create System Quality Logic
    const createQuality = async (qid: string, type: QualityType, extra: any = {}) => {
        const cleanId = qid.replace('$', '').trim();
        if (existingQIDs.includes(cleanId)) return;
        try {
            await fetch('/api/admin/config', { method: 'POST', body: JSON.stringify({ storyId, category: 'qualities', itemId: cleanId, data: { id: cleanId, name: cleanId, type, category: 'system', ...extra } }) });
            setExistingQIDs(prev => [...prev, cleanId]);
            showToast(`Created ${cleanId}`, "success");
        } catch(e) { showToast("Failed to create", "error"); }
    };

    if (isLoading || !form) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-editor-col" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px' }}>
            
            

            {/* 1. Main Info */}
            <SettingsMainInfo 
                settings={form} 
                onChange={handleGenericChange} 
                storyId={storyId} 
                onChangeWorldId={async (newId) => { /* ID Change Logic from before */ return true; }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '10px' }}>
                <button onClick={() => setExpandAll('open')} style={{ fontSize: '0.8rem', background: 'none', border: '1px solid var(--tool-border)', color: 'var(--tool-text-dim)', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px' }}>Expand All</button>
                <button onClick={() => setExpandAll('closed')} style={{ fontSize: '0.8rem', background: 'none', border: '1px solid var(--tool-border)', color: 'var(--tool-text-dim)', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px' }}>Collapse All</button>
            </div>
            {/* 2. Game System (Rules, Physics, Bindings) */}
            <SettingsSection title="Game System" color="var(--tool-accent)" defaultOpen={true} forceState={expandAll}>
                <SettingsGameSystem 
                    settings={form} 
                    onChange={handleGenericChange}
                    storyId={storyId}
                    qualityDefs={Object.values(qualityDefs)}
                    onCreateQuality={createQuality}
                    existingQIDs={existingQIDs}
                />
            </SettingsSection>

            {/* 3. Interface & Categories */}
            <SettingsSection title="Interface & Categories" color="var(--success-color)" forceState={expandAll}>
                <div className="form-group">
                    <label className="form-label">Sidebar Categories</label>
                    <input defaultValue={form.characterSheetCategories.join(', ')} onBlur={e => handleArrayChange('characterSheetCategories', e.target.value)} className="form-input" placeholder="character, menace" />
                    <p className="special-desc">Qualities with these categories appear in the main sidebar.</p>
                </div>
                <div className="form-group">
                    <label className="form-label">Equipment Slots</label>
                    <input defaultValue={form.equipCategories.join(', ')} onBlur={e => handleArrayChange('equipCategories', e.target.value)} className="form-input" placeholder="head, body" />
                    <p className="special-desc">Creates wearable slots for items matching these categories.</p>
                </div>
                <div className="form-group">
                    <label className="form-label">Currency Qualities</label>
                    <input defaultValue={form.currencyQualities?.join(', ')} onBlur={e => handleArrayChange('currencyQualities', e.target.value)} className="form-input" placeholder="gold, echoes" />
                    <p className="special-desc">Comma-separated IDs. These appear in the top wallet bar.</p>
                </div>
                <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label className="form-label">Starting Location ID</label>
                    <input value={form.startLocation || ''} onChange={e => handleChange('startLocation', e.target.value)} className="form-input" placeholder="village" />
                    {!existingLocIDs.includes(form.startLocation || '') && form.startLocation && <p style={{ color: 'var(--danger-color)', fontSize: '0.8rem' }}>Warning: ID not found.</p>}
                </div>
            </SettingsSection>

            {/* 4. Visuals */}
            <SettingsSection title="Visuals & Theme" color="var(--tool-accent-mauve)" forceState={expandAll}>
                <SettingsVisuals settings={form} onChange={handleGenericChange} /> 
            </SettingsSection>

            {/* 5. Character Init */}
            <SettingsSection title="Character Initialization" color="var(--warning-color)" forceState={expandAll}>
                <CharCreateEditor 
                    rules={form.char_create} 
                    onChange={r => handleChange('char_create', r)} 
                    storyId={storyId}
                    existingQIDs={existingQIDs}
                    qualityDefs={qualityDefs}
                    imageLibrary={imageLibrary}
                    onCreateQuality={createQuality} 
                    onAddCategory={(cat, type) => {
                         const field = type === 'equip' ? 'equipCategories' : 'characterSheetCategories';
                         const current = form[field] || [];
                         if (!current.includes(cat)) handleChange(field, [...current, cat]);
                    }}
                />
            </SettingsSection>

            {/* 6. Legal & Meta */}
            <SettingsSection title="Disclaimers & Attributions" color="var(--tool-text-dim)" forceState={expandAll}>
                <div className="form-group">
                    <label className="form-label">Attributions</label>
                    <textarea value={form.attributions || ''} onChange={e => handleChange('attributions', e.target.value)} className="form-textarea" rows={4} />
                </div>
                <div className="form-group">
                    <label className="form-label">AI Disclaimer</label>
                    <textarea value={form.aiDisclaimer || ''} onChange={e => handleChange('aiDisclaimer', e.target.value)} className="form-textarea" rows={3} />
                </div>
            </SettingsSection>

            {/* 7. Tools */}
            <SettingsSection title="Data & Team" color="#555" forceState={expandAll}>
                <DataManagement storyId={storyId} />
                <CollaboratorManager storyId={storyId} />
            </SettingsSection>

            <CommandCenter 
                isDirty={isDirty}
                isSaving={isSaving}
                lastSaved={lastSaved}
                onSave={onSaveAll}
                onRevert={revertChanges}
                itemType="Settings"
            />
        </div>
    );
}