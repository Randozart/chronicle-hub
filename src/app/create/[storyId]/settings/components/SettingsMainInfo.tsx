'use client';
import { WorldSettings } from '@/engine/models';
import GameImage from '@/components/GameImage';
import { useToast } from '@/providers/ToastProvider';
import { useState } from 'react';
import ConfirmationModal from '@/components/admin/ConfirmationModal';

interface Props {
    settings: WorldSettings;
    onChange: (field: string, val: any) => void;
    storyId: string;
    // New prop for the parent to handle the actual ID change
    onChangeWorldId: (newId: string) => Promise<boolean>; 
}

export default function SettingsMainInfo({ settings, onChange, storyId, onChangeWorldId }: Props) {
    const [isEditingId, setIsEditingId] = useState(false);
    const [tempId, setTempId] = useState(storyId);
    const [showConfirmId, setShowConfirmId] = useState(false);
    const { showToast } = useToast();

    const handleIdChangeRequest = () => {
        if (tempId === storyId) { setIsEditingId(false); return; }
        setShowConfirmId(true);
    };

    const confirmIdChange = async () => {
        setShowConfirmId(false);
        const success = await onChangeWorldId(tempId);
        if (success) {
            setIsEditingId(false);
            // Redirect happens in parent usually, or we just update state
        }
    };

    return (
        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--tool-bg-header)', borderRadius: 'var(--border-radius)', border: '1px solid var(--tool-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>World Settings</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ 
                        color: settings.isPublished ? 'var(--success-color)' : 'var(--warning-color)', 
                        fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase' 
                    }}>
                        {settings.isPublished ? 'LIVE' : 'PRIVATE'}
                    </span>
                    <label className="toggle-label">
                        <input type="checkbox" checked={settings.isPublished || false} onChange={e => onChange('isPublished', e.target.checked)} />
                        Publish
                    </label>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">World ID (URL Slug)</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                        value={isEditingId ? tempId : storyId} 
                        disabled={!isEditingId}
                        onChange={e => setTempId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                        className="form-input"
                        style={{ fontWeight: 'bold', color: isEditingId ? 'var(--tool-text-main)' : 'var(--tool-text-dim)' }} 
                    />
                    {isEditingId ? (
                        <>
                            <button onClick={handleIdChangeRequest} className="save-btn" style={{ padding: '0 1rem' }}>Save ID</button>
                            <button onClick={() => { setIsEditingId(false); setTempId(storyId); }} className="unequip-btn" style={{ padding: '0 1rem' }}>Cancel</button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditingId(true)} className="option-button" style={{ padding: '0 1rem' }}>Change ID</button>
                    )}
                </div>
                <p className="special-desc" style={{ color: 'var(--warning-color)'}}>
                    Changing this will update all storylets and cards. Links to your world will change.
                </p>
            </div>

            {/* Confirmation for ID Change */}
            <ConfirmationModal 
                isOpen={showConfirmId}
                title="Change World ID?"
                message={`Are you sure you want to rename "${storyId}" to "${tempId}"? This is a major operation.`}
                variant="danger"
                confirmLabel="Yes, Rename"
                onConfirm={confirmIdChange}
                onCancel={() => setShowConfirmId(false)}
            />

            <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Cover Image URL</label>
                    <input value={settings.coverImage || ''} onChange={e => onChange('coverImage', e.target.value)} className="form-input" />
                    {settings.coverImage && (
                        <div style={{ marginTop: '10px', height: '150px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--tool-border)' }}>
                            <img src={settings.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Cover" />
                        </div>
                    )}
                </div>
                <div className="form-group" style={{ flex: 1}}>
                    <label className="form-label">Summary</label>
                    <textarea 
                        value={settings.summary || ''} 
                        onChange={e => onChange('summary', e.target.value)} 
                        className="form-textarea" 
                        rows={6}
                        placeholder="Shown on main menu..."
                    />
                </div>
            </div>
        </div>
    );
}