'use client';
import { WorldSettings } from '@/engine/models';
import { useToast } from '@/providers/ToastProvider';
import { useState, useEffect } from 'react';
import ConfirmationModal from '@/components/admin/ConfirmationModal';

interface Props {
    settings: WorldSettings;
    onChange: (field: string, val: any) => void;
    storyId: string;
    onChangeWorldId: (newId: string) => Promise<boolean>; 
}

export default function SettingsMainInfo({ settings, onChange, storyId, onChangeWorldId }: Props) {
    const [isEditingId, setIsEditingId] = useState(false);
    const [tempId, setTempId] = useState(storyId);
    const [showConfirmId, setShowConfirmId] = useState(false);
    
    const [localTags, setLocalTags] = useState(settings.tags?.join(', ') || '');
    const [localTitle, setLocalTitle] = useState(settings.title || storyId); 

    useEffect(() => {
        setLocalTags(settings.tags?.join(', ') || '');
    }, [settings.tags]);

    useEffect(() => {
        setLocalTitle(settings.title || storyId);
    }, [settings.title, storyId]);

    const handleIdChangeRequest = () => {
        if (tempId === storyId) { setIsEditingId(false); return; }
        setShowConfirmId(true);
    };

    const confirmIdChange = async () => {
        setShowConfirmId(false);
        const success = await onChangeWorldId(tempId);
        if (success) {
            setIsEditingId(false);
        }
    };

    const handleTagsBlur = () => {
        const arr = localTags.split(',').map(s => s.trim()).filter(Boolean);
        const unique = Array.from(new Set(arr));
        onChange('tags', unique);
    };

    const handleTitleBlur = () => {
        if (localTitle.trim() !== settings.title) {
            onChange('title', localTitle.trim()); 
        }
    };

    const handleContentToggle = (type: 'mature' | 'erotica' | 'triggers', value: boolean) => {
        const currentConfig = settings.contentConfig || {};
        const newConfig = { ...currentConfig, [type]: value };
        
        const currentTags = new Set(settings.tags || []);
        
        if (type === 'mature') {
            if (value) currentTags.add('Mature');
            else currentTags.delete('Mature');
        }
        if (type === 'erotica') {
            if (value) currentTags.add('NSFW');
            else currentTags.delete('NSFW');
        }
        if (type === 'triggers') {
            if (value) currentTags.add('CW');
            else currentTags.delete('CW');
        }

        onChange('contentConfig', newConfig);
        onChange('tags', Array.from(currentTags));
    };

    const updateContentDetail = (field: string, val: string) => {
        const currentConfig = settings.contentConfig || {};
        onChange('contentConfig', { ...currentConfig, [field]: val });
    };

    const currentStatus = settings.publicationStatus || (settings.isPublished ? 'published' : 'private');
    const content = settings.contentConfig || {};
    const playLink = typeof window !== 'undefined' ? `${window.location.origin}/play/${storyId}` : `/play/${storyId}`;

    return (
        <div style={{ marginBottom: '2rem' }}>
            
            <div style={{ padding: '1.5rem', background: 'var(--tool-bg-header)', borderRadius: 'var(--border-radius)', border: '1px solid var(--tool-border)', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>World Settings</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ 
                            color: currentStatus === 'published' ? 'var(--success-color)' : 
                                   currentStatus === 'in_progress' ? 'var(--tool-accent)' : 
                                   'var(--text-muted)', 
                            fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase' 
                        }}>
                            {currentStatus === 'published' ? 'LIVE' : 
                             currentStatus === 'in_progress' ? 'WIP' : 
                             'PRIVATE'}
                        </span>
                        
                        <select 
                            value={currentStatus}
                            onChange={(e) => onChange('publicationStatus', e.target.value)}
                            className="form-select"
                            style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem' }}
                        >
                            <option value="private">Draft (Private)</option>
                            <option value="in_progress">In Progress (Public Beta)</option>
                            <option value="published">Published (Live)</option>
                        </select>
                    </div>
                </div>

                {settings.deletionScheduledAt && (
                    <div style={{ 
                        background: 'var(--danger-color)', color: 'white', padding: '1rem', 
                        borderRadius: '4px', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 'bold' 
                    }}>
                        ⚠️ THIS WORLD IS SCHEDULED FOR DELETION ON {new Date(settings.deletionScheduledAt).toLocaleDateString()}
                    </div>
                )}


                <div className="form-group">
                    <label className="form-label">World Title</label>
                    <input 
                        value={localTitle}
                        onChange={e => setLocalTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        className="form-input"
                        placeholder="My Awesome Game"
                        style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
                    />
                    <p className="special-desc">The public name of your game.</p>
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
                
                <ConfirmationModal 
                    isOpen={showConfirmId}
                    title="Change World ID?"
                    message={`Are you sure you want to rename "${storyId}" to "${tempId}"? This is a major operation.`}
                    variant="danger"
                    confirmLabel="Yes, Rename"
                    onConfirm={confirmIdChange}
                    onCancel={() => setShowConfirmId(false)}
                />

                <div className="form-row" style={{ alignItems: 'flex-start' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Cover Image URL</label>
                        <input value={settings.coverImage || ''} onChange={e => onChange('coverImage', e.target.value)} className="form-input" />
                        {settings.coverImage && (
                            <div style={{ marginTop: '10px', height: '150px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--tool-border)' }}>
                                <img src={settings.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Cover" />
                            </div>
                        )}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">World Tags</label>
                            <input 
                                value={localTags} 
                                onChange={e => setLocalTags(e.target.value)} 
                                onBlur={handleTagsBlur}
                                onKeyDown={e => { if(e.key === 'Enter') handleTagsBlur(); }}
                                className="form-input" 
                                placeholder="fantasy, horror, rpg, victorian" 
                            />
                            <p className="special-desc">Comma-separated. Auto-updated by Content Ratings below.</p>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
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
            </div>

            <div style={{ padding: '1.5rem', background: 'var(--tool-bg-sidebar)', borderRadius: 'var(--border-radius)', border: '1px dashed var(--warning-color)' }}>
                <h3 style={{ marginTop: 0, color: 'var(--warning-color)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Content Ratings & Safety</h3>
                <p className="special-desc" style={{ marginBottom: '1.5rem' }}>
                    Accurately flagging your content ensures it reaches the right audience and protects your account. 
                    Failing to tag your content accurately is a breach of the Terms of Service, and may result in your world being made unavailable or further actions being taken.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    <div>
                        <label className="toggle-label" style={{ fontWeight: 'bold', color: 'var(--tool-text-main)' }}>
                            <input type="checkbox" checked={content.mature || false} onChange={e => handleContentToggle('mature', e.target.checked)} />
                            Mature Content (non-explicit 18+)
                        </label>
                        <p className="special-desc" style={{ marginLeft: '1.5rem' }}>
                            Examples: Heavy violence, substance abuse, dark themes, non-explicit suggestive themes.
                        </p>
                        {content.mature && (
                            <div style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                                <input 
                                    className="form-input" 
                                    placeholder="Specify (e.g. Graphic Violence, Drug Use)" 
                                    value={content.matureDetails || ''} 
                                    onChange={e => updateContentDetail('matureDetails', e.target.value)}
                                />
                                <p className="special-desc" style={{ color: 'var(--success-color)' }}>
                                    ✓ Shown in Community Arcade. Players must confirm age/consent.
                                </p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="toggle-label" style={{ fontWeight: 'bold', color: 'var(--tool-text-main)' }}>
                            <input type="checkbox" checked={content.triggers || false} onChange={e => handleContentToggle('triggers', e.target.checked)} />
                            Trigger/Content Warnings
                        </label>
                        <p className="special-desc" style={{ marginLeft: '1.5rem' }}>
                            Content that may cause distress (e.g. self-harm, sexual assault references, phobias).
                        </p>
                        {content.triggers && (
                            <div style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                                <input 
                                    className="form-input" 
                                    placeholder="List Triggers (e.g. Spiders, Claustrophobia)" 
                                    value={content.triggerDetails || ''} 
                                    onChange={e => updateContentDetail('triggerDetails', e.target.value)}
                                />
                                <p className="special-desc" style={{ color: 'var(--success-color)' }}>
                                    ✓ Shown in Community Arcade. Warnings displayed before playing.
                                </p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="toggle-label" style={{ fontWeight: 'bold', color: 'var(--accent-highlight)' }}>
                            <input type="checkbox" checked={content.erotica || false} onChange={e => handleContentToggle('erotica', e.target.checked)} />
                            NSFW / Explicit (18+)
                        </label>
                        <p className="special-desc" style={{ marginLeft: '1.5rem' }}>
                            Contains explicit sexual descriptions or interactive sexual content.
                        </p>
                        {content.erotica && (
                            <div style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                                <input 
                                    className="form-input" 
                                    placeholder="Specify details if necessary" 
                                    value={content.eroticaDetails || ''} 
                                    onChange={e => updateContentDetail('eroticaDetails', e.target.value)}
                                />
                                <div style={{ background: 'rgba(200, 50, 50, 0.1)', borderLeft: '3px solid var(--danger-color)', padding: '0.5rem', marginTop: '0.5rem' }}>
                                    <p className="special-desc" style={{ color: 'var(--danger-color)', marginTop: 0 }}>
                                        <strong>Restricted:</strong> This game will NOT appear in the public Community Arcade.
                                    </p>
                                    <p className="special-desc" style={{ marginTop: '5px' }}>
                                        ChronicleHub will host it, unless it violates the Terms of Service. You may share this direct link anywhere to allow access to your game:
                                    </p>
                                    <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                        <input 
                                            className="form-input" 
                                            value={playLink} 
                                            readOnly 
                                            style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem', background: '#000', color: 'var(--accent-highlight)' }}
                                        />
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(playLink)}
                                            style={{ padding: '4px 8px', cursor: 'pointer', background: 'var(--bg-item)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }}
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}