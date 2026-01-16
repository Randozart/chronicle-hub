'use client';

import { useState } from 'react';
import { QualityType, QualityDefinition, SystemMessage, QualityState } from '@/engine/models';
import SmartArea from '@/components/admin/SmartArea';
import CommandCenter from '@/components/admin/CommandCenter';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';
import { useToast } from '@/providers/ToastProvider';

interface ConsoleData {
    id: string;
    version: number;
    worldState: Record<string, QualityState>;
    systemMessage: SystemMessage;
}

interface Props {
    initialData: ConsoleData;
    onSave: (data: ConsoleData) => void;
    storyId: string;
    qualityDefs: QualityDefinition[];
    guardRef: { current: FormGuard | null };
}

export default function GMConsoleMainForm({ initialData, onSave, storyId, qualityDefs, guardRef }: Props) {
    
    const { 
        data: form, 
        handleChange, 
        handleSave, 
        revertChanges, 
        isDirty, 
        isSaving, 
        lastSaved 
    } = useCreatorForm<ConsoleData>(
        initialData, 
        '/api/admin/console', 
        { storyId }, 
        guardRef,
        undefined, 
        onSave
    );

    const [showRevertModal, setShowRevertModal] = useState(false);
    const [newKey, setNewKey] = useState("");
    const [newValue, setNewValue] = useState("");
    const { showToast } = useToast();

    if (!form) return <div className="loading-container">Loading Console...</div>;

    const onSaveClick = async () => {
        const success = await handleSave();
        if (success && form) onSave(form);
    };
    const updateMessage = (field: keyof SystemMessage, val: any) => {
        const next = { ...form.systemMessage, [field]: val };
        handleChange('systemMessage', next);
    };
    const addVariable = () => {
        if (!newKey) return;
        const cleanKey = newKey.replace(/^#/, '').trim();
        
        if (form.worldState[cleanKey]) {
            showToast(`Variable #${cleanKey} exists. Edit it below.`, "error");
            return;
        }

        const isNum = !isNaN(Number(newValue));
        const newQ: QualityState = {
            qualityId: cleanKey,
            type: isNum ? QualityType.Counter : QualityType.String,
            ...(isNum ? { level: Number(newValue) } : { stringValue: newValue })
        } as any;

        const nextState = { ...form.worldState, [cleanKey]: newQ };
        handleChange('worldState', nextState);
        setNewKey("");
        setNewValue("");
    };

    const removeVariable = (key: string) => {
        const nextState = { ...form.worldState };
        delete nextState[key];
        handleChange('worldState', nextState);
    };

    const updateVariable = (key: string, val: string) => {
        const current = form.worldState[key];
        const isNum = (current.type as string) === 'C' || (current.type as string) === 'P' || current.type === QualityType.Counter || current.type === QualityType.Pyramidal;
        
        const nextQ = { ...current };
        if (isNum) {
            (nextQ as any).level = Number(val);
        } else {
            (nextQ as any).stringValue = val;
        }
        
        const nextState = { ...form.worldState, [key]: nextQ };
        handleChange('worldState', nextState);
    };

    return (
        <div className="h-full flex flex-col relative" style={{ color: 'var(--tool-text-main)', paddingBottom: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--tool-border)' }}>
                <h2 style={{ margin: 0, color: 'var(--tool-text-header' }}>Game Master Console</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--tool-text-dim)', fontFamily: 'monospace' }}>World v{form.version || 1}</div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
                <div className="special-field-group" style={{ borderColor: 'var(--tool-accent-mauve' }}>
                    <label className="special-label" style={{ color: 'var(--tool-accent-mauve' }}>Live Announcement</label>
                    
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                        <label className="toggle-label" style={{ background: form.systemMessage.enabled ? 'var(--tool-bg-sidebar)' : 'transparent' }}>
                            <input 
                                type="checkbox" 
                                checked={form.systemMessage.enabled} 
                                onChange={e => updateMessage('enabled', e.target.checked)} 
                            />
                            Active
                        </label>
                        <select 
                            value={form.systemMessage.severity} 
                            onChange={e => updateMessage('severity', e.target.value)}
                            className="form-select" style={{ width: 'auto', height: '38px' }}
                        >
                            <option value="info">Info (Blue)</option>
                            <option value="warning">Warning (Yellow)</option>
                            <option value="critical">Critical (Red)</option>
                        </select>
                        <div style={{ flex: 1 }}>
                            <input 
                                value={form.systemMessage.id || ''} 
                                onChange={e => updateMessage('id', e.target.value)} 
                                className="form-input" 
                                placeholder="Message ID (change to repost)" 
                                style={{ height: '38px' }}
                            />
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <input 
                            value={form.systemMessage.title || ''} 
                            onChange={e => updateMessage('title', e.target.value)} 
                            className="form-input" 
                            placeholder="Header Title" 
                            style={{ height: '38px' }}
                        />
                    </div>
                    
                    <SmartArea 
                        label="Message Body" 
                        value={form.systemMessage.content || ''} 
                        onChange={v => updateMessage('content', v)} 
                        storyId={storyId} 
                        minHeight="80px"
                        qualityDefs={qualityDefs}
                    />
                </div>
                <div style={{ marginTop: '2rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--tool-text-header)', fontSize: '0.9rem', textTransform: 'uppercase', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem' }}>
                        Global State
                    </h4>
                    
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {Object.keys(form.worldState).length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--tool-text-dim)', fontStyle: 'italic', border: '1px dashed var(--tool-border)', borderRadius: '4px' }}>
                                No global variables defined.
                            </div>
                        )}

                        {Object.entries(form.worldState).map(([key, data]) => {
                            const isNum = (data.type as string) === 'C' || (data.type as string) === 'P' || data.type === QualityType.Counter || data.type === QualityType.Pyramidal;
                            const val = isNum ? (data as any).level : (data as any).stringValue;

                            return (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--tool-bg-input)', padding: '0.75rem', borderRadius: '4px', borderLeft: '3px solid var(--tool-accent-mauve)' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: 'var(--tool-accent-mauve', fontWeight: 'bold', fontFamily: 'monospace' }}>#{key}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--tool-text-dim)' }}>Type: {data.type}</div>
                                    </div>
                                    
                                    <input 
                                        className="form-input" 
                                        style={{ width: '250px', height: '34px' }}
                                        value={val}
                                        onChange={(e) => updateVariable(key, e.target.value)}
                                        placeholder="Value"
                                    />
                                    
                                    <button onClick={() => removeVariable(key)} style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', fontSize: '1.2rem' }} title="Delete">
                                        ✕
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px dashed var(--tool-border)', display: 'flex', gap: '10px' }}>
                        <input value={newKey} onChange={e => setNewKey(e.target.value)} className="form-input" placeholder="#new_variable" style={{ flex: 1, height: '38px' }} />
                        <input value={newValue} onChange={e => setNewValue(e.target.value)} className="form-input" placeholder="Initial Value" style={{ flex: 1, height: '38px' }} />
                        <button onClick={addVariable} className="save-btn" style={{ width: 'auto', padding: '0 1.5rem' }}>+ Inject</button>
                    </div>
                </div>
            </div>
            <CommandCenter 
                isDirty={isDirty} 
                isSaving={isSaving} 
                lastSaved={lastSaved} 
                onSave={handleSave} 
                onRevert={() => setShowRevertModal(true)} 
                itemType="Console State"
            />
            <ConfirmationModal
                isOpen={showRevertModal}
                title="Discard Changes?"
                message="Revert to last saved state? Unsaved changes will be lost."
                variant="danger"
                confirmLabel="Discard"
                onConfirm={() => { revertChanges(); setShowRevertModal(false); }}
                onCancel={() => setShowRevertModal(false)}
            />
        </div>
    );
}