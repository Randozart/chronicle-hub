'use client';

import { useState, useEffect, use, useRef } from 'react';
import { WorldSettings, QualityDefinition, ImageDefinition, CharCreateRule, QualityType } from '@/engine/models';
import { useToast } from '@/providers/ToastProvider';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';
import CommandCenter from '@/components/admin/CommandCenter';
import CharSetupEditor from './components/CharSetupEditor';

interface CharSetupForm {
    id: string;
    rules: Record<string, CharCreateRule>;
    skipCharacterCreation: boolean;
}

export default function CharSetupAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    const guardRef = useRef<FormGuard | null>(null);

    const [qualityDefs, setQualityDefs] = useState<Record<string, QualityDefinition>>({});
    const [imageLibrary, setImageLibrary] = useState<Record<string, ImageDefinition>>({});
    const [existingQIDs, setExistingQIDs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fullSettings, setFullSettings] = useState<WorldSettings | null>(null);

    const onSaveAll = async () => {
        if (!form) return;
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'char_create', itemId: 'rules', data: form.rules }),
            });
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'settings', itemId: 'settings', data: { ...fullSettings, skipCharacterCreation: form.skipCharacterCreation } }),
            });
            resetState();
            showToast('Character setup saved!', 'success');
        } catch (e) {
            showToast('Error saving', 'error');
        }
    };

    const {
        data: form,
        handleChange,
        revertChanges,
        resetState,
        isDirty,
        isSaving,
        lastSaved,
        setData,
    } = useCreatorForm<CharSetupForm>(null, '/api/admin/config', { storyId }, guardRef, onSaveAll);

    useEffect(() => {
        const load = async () => {
            try {
                const [sRes, cRes, qRes, iRes] = await Promise.all([
                    fetch(`/api/admin/settings?storyId=${storyId}`),
                    fetch(`/api/admin/char_create?storyId=${storyId}`),
                    fetch(`/api/admin/qualities?storyId=${storyId}`),
                    fetch(`/api/admin/images?storyId=${storyId}`),
                ]);

                const sData = sRes.ok ? await sRes.json() : {};
                setFullSettings(sData);

                const qData = qRes.ok ? await qRes.json() : {};
                const qDefs: Record<string, QualityDefinition> = {};
                (Array.isArray(qData) ? qData : Object.values(qData)).forEach((q: any) => { qDefs[q.id] = q; });
                setQualityDefs(qDefs);
                setExistingQIDs(Object.keys(qDefs));

                setImageLibrary(iRes.ok ? await iRes.json() : {});

                const charCreateData = cRes.ok ? await cRes.json() : {};
                setData({
                    id: storyId,
                    rules: charCreateData || {},
                    skipCharacterCreation: sData.skipCharacterCreation || false,
                });
            } catch (e) {
                console.error(e);
                showToast('Failed to load character setup', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [storyId]);

    const createQuality = async (qid: string, type: QualityType, extra: any = {}) => {
        const cleanId = qid.replace('$', '').trim();
        if (existingQIDs.includes(cleanId)) return;
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                body: JSON.stringify({ storyId, category: 'qualities', itemId: cleanId, data: { id: cleanId, name: cleanId, type, category: 'system', ...extra } }),
            });
            setExistingQIDs(prev => [...prev, cleanId]);
            showToast(`Created ${cleanId}`, 'success');
        } catch (e) {
            showToast('Failed to create quality', 'error');
        }
    };

    const handleAddCategory = (cat: string, type: 'equip' | 'sheet') => {
        showToast(`Add "${cat}" to ${type === 'equip' ? 'Equipment Slots' : 'Sidebar Categories'} in Settings.`, 'info');
    };

    if (isLoading || !form) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-editor-col" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'var(--tool-text-header)', fontSize: '1.4rem', margin: 0 }}>Character Setup</h2>
                <p style={{ color: 'var(--tool-text-dim)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    Configure the character creation screen players see when starting a new game.
                </p>
            </div>

            <CharSetupEditor
                rules={form.rules}
                onChange={r => handleChange('rules', r)}
                storyId={storyId}
                existingQIDs={existingQIDs}
                qualityDefs={qualityDefs}
                imageLibrary={imageLibrary}
                onCreateQuality={createQuality}
                onAddCategory={handleAddCategory}
                skipCreation={form.skipCharacterCreation}
                onToggleSkip={val => handleChange('skipCharacterCreation', val)}
            />

            <CommandCenter
                isDirty={isDirty}
                isSaving={isSaving}
                lastSaved={lastSaved}
                onSave={onSaveAll}
                onRevert={revertChanges}
                itemType="Character Setup"
            />
        </div>
    );
}
