'use client';

import { useState } from 'react';
import { ImageDefinition, QualityDefinition, ImageCategory } from '@/engine/models';
import SmartArea from '@/components/admin/SmartArea'; 
import GameImage from '@/components/GameImage';
import CommandCenter from '@/components/admin/CommandCenter';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import ImageUploader from './ImageUploader';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';
import { useToast } from '@/providers/ToastProvider';

interface Props {
    initialData: ImageDefinition;
    onSave: (data: ImageDefinition) => void;
    onDelete: (id: string) => void;
    onDuplicate: (data: ImageDefinition) => void;
    storyId: string;
    qualityDefs: QualityDefinition[];
    guardRef: { current: FormGuard | null };
    onStorageUpdate?: (usage: number) => void;
}
const Accessor = ({ code }: { code: string }) => (
    <span style={{ 
        fontFamily: 'monospace', fontSize: '0.75em', color: 'var(--tool-accent)', 
        background: 'var(--tool-bg-sidebar)', padding: '1px 4px', borderRadius: '3px', 
        border: '1px solid var(--tool-border)', marginLeft: '8px', fontWeight: 'normal'
    }}>
        {code}
    </span>
);

export default function ImageMainForm({ initialData, onSave, onDelete, onDuplicate, storyId, qualityDefs, guardRef, onStorageUpdate }: Props) {
    
    const { 
        data: form, 
        handleChange, 
        handleSave, 
        revertChanges, 
        isDirty, 
        isSaving, 
        lastSaved 
    } = useCreatorForm<ImageDefinition>(
        initialData, 
        '/api/admin/config', 
        { storyId, category: 'images', itemId: initialData.id }, 
        guardRef,
        undefined,
        onSave
    );

    const [showRevertModal, setShowRevertModal] = useState(false);
    const [showUploader, setShowUploader] = useState(false);
    const { showToast } = useToast();
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    if (!form) return <div className="loading-container">Loading...</div>;

    const onSaveClick = async () => {
        const success = await handleSave();
        if (success && form) onSave(form);
    };
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
    };
    const moveX = (mousePos.x - 0.5) * 20; 
    const moveY = (mousePos.y - 0.5) * 20;

    const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
        const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100);
        
        handleChange('focus', { x: xPct, y: yPct });
        showToast(`Focus set to ${xPct}%, ${yPct}%`, "info");
    };

    const handleUploadComplete = (data: { image: ImageDefinition, usage: number }) => {
        handleChange('url', data.image.url);
        handleChange('size', data.image.size);
        if (data.image.category) handleChange('category', data.image.category);
        
        setShowUploader(false);
        if (onStorageUpdate) onStorageUpdate(data.usage);
    };

    return (
        <div className="h-full flex flex-col relative" style={{ color: 'var(--tool-text-main)', paddingBottom: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--tool-border)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--tool-text-header)' }}>{form.id}</h2>
                    {form.size && (
                        <span style={{ fontSize: '0.75rem', background: 'var(--tool-bg-dark)', padding: '2px 6px', borderRadius: '4px', color: 'var(--success-color)', border: '1px solid var(--tool-border)' }}>
                            {(form.size / 1024).toFixed(1)} KB
                        </span>
                    )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--tool-text-dim)', fontFamily: 'monospace' }}>v{form.version || 1}</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
                <div className="form-row">
                    <div className="form-group" style={{ flex: 3 }}>
                        <label className="form-label">Image URL <Accessor code="$.url" /></label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                value={form.url || ''} 
                                onChange={e => handleChange('url', e.target.value)}
                                className="form-input"
                                placeholder="https://..."
                                style={{ flex: 1 }}
                            />
                            <button 
                                onClick={() => setShowUploader(!showUploader)}
                                className="option-button"
                                style={{ width: 'auto', padding: '0 1rem', fontSize: '0.8rem' }}
                            >
                                {showUploader ? 'Cancel Upload' : 'Upload / Replace'}
                            </button>
                        </div>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Category <Accessor code="$.category" /></label>
                        <select 
                            value={form.category || 'uncategorized'} 
                            onChange={e => handleChange('category', e.target.value as ImageCategory)}
                            className="form-select"
                            style={{ height: '40px' }}
                        >
                            <option value="uncategorized">Uncategorized</option>
                            <option value="storylet">Storylet (3:4)</option>
                            <option value="icon">Icon (Square)</option>
                            <option value="banner">Banner (Wide)</option>
                            <option value="cover">Cover (16:9)</option>
                            <option value="background">Background (Parallax)</option>
                            <option value="portrait">Portrait</option>
                            <option value="map">Map (Full)</option>
                        </select>
                    </div>
                </div>
                {showUploader && (
                    <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px dashed var(--tool-accent)', borderRadius: '4px', background: 'var(--tool-bg-dark)' }}>
                        <h4 style={{ marginTop: 0, color: 'var(--tool-accent)' }}>Upload Replacement</h4>
                        <ImageUploader 
                            storyId={storyId} 
                            onUploadComplete={handleUploadComplete}
                            onStorageUpdate={onStorageUpdate} 
                        />
                    </div>
                )}

                <div className="form-group">
                    <SmartArea 
                        label={<span>Alt Text <Accessor code="$.alt" /></span>}
                        value={form.alt || ''} 
                        onChange={v => handleChange('alt', v)} 
                        storyId={storyId} 
                        minHeight="38px" 
                        qualityDefs={qualityDefs} 
                        placeholder="Accessibility description"
                    />
                </div>
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--tool-bg-input)', borderRadius: '8px', border: '1px solid var(--tool-border)' }}>
                    <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <label className="form-label" style={{ color: 'var(--tool-accent)' }}>
                                    Context Preview: {form.category?.toUpperCase() || 'RAW'}
                                </label>
                                <span style={{ fontSize: '0.8rem', color: 'var(--tool-text-dim)' }}>
                                    Click image to set Focus Point <Accessor code="$.focus" />
                                </span>
                            </div>
                        </div>
                        <div style={{ width: '150px' }}>
                                <label className="form-label" style={{ color: 'var(--tool-accent)' }}>Icon Context</label>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                        
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                            <div 
                                style={{ 
                                    position: 'relative', 
                                    border: '2px solid var(--tool-border)', 
                                    cursor: 'crosshair', 
                                    display: 'inline-block', 
                                    maxWidth: '100%', 
                                    overflow: 'hidden' 
                                }}
                                onClick={handleImageClick}
                            >
                                {form.category === 'background' ? (
                                        <div onMouseMove={handleMouseMove} style={{ width: '500px', height: '300px', position: 'relative', overflow: 'hidden' }}>
                                        <img 
                                            src={form.url} 
                                            alt="Preview"
                                            style={{ 
                                                width: '110%', height: '110%', objectFit: 'cover',
                                                transform: `translate(calc(-5% + ${-moveX}px), calc(-5% + ${-moveY}px))`
                                            }} 
                                        />
                                        <div style={{ position: 'absolute', bottom: 10, right: 10, color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px' }}>
                                            Move mouse to test parallax
                                        </div>
                                        </div>
                                ) : (
                                        <img 
                                        src={form.url} 
                                        alt="Preview"
                                        style={{ 
                                            maxWidth: '100%', maxHeight: '500px', display: 'block',
                                            objectFit: 'contain' 
                                        }} 
                                    />
                                )}
                                
                                {form.focus && (
                                    <div style={{ 
                                        position: 'absolute', 
                                        left: `${form.focus.x}%`, 
                                        top: `${form.focus.y}%`, 
                                        width: '20px', height: '20px', 
                                        border: '2px solid rgba(255,255,255,0.9)',
                                        boxShadow: '0 0 4px rgba(0,0,0,0.8)',
                                        borderRadius: '50%', 
                                        transform: 'translate(-50%, -50%)', 
                                        pointerEvents: 'none'
                                    }} >
                                        <div style={{width:'2px', height:'2px', background:'red', position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)'}}/>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ width: '150px', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                            
                            <div style={{ width: '100px', height: '100px', border: '2px solid var(--tool-accent)', borderRadius: '50%', overflow: 'hidden', background: '#000', position: 'relative' }}>
                                <img 
                                    src={form.url}
                                    style={{
                                        width: '100%', height: '100%', objectFit: 'cover',
                                        objectPosition: form.focus ? `${form.focus.x}% ${form.focus.y}%` : 'center',
                                        transform: `scale(${form.thumbZoom || 1})`,
                                        transformOrigin: form.focus ? `${form.focus.x}% ${form.focus.y}%` : 'center'
                                    }}
                                />
                            </div>

                            <div style={{ width: '100%' }}>
                                <label className="form-label" style={{ textAlign: 'center', marginBottom: '5px' }}>
                                    Zoom: {(form.thumbZoom || 1).toFixed(1)}x
                                </label>
                                <input 
                                    type="range" 
                                    min="1" max="5" step="0.1"
                                    value={form.thumbZoom || 1} 
                                    onChange={e => handleChange('thumbZoom', parseFloat(e.target.value))}
                                    style={{ width: '100%', accentColor: 'var(--tool-accent)' }}
                                />
                                <p style={{ fontSize: '0.7rem', color: 'var(--tool-text-dim)', textAlign: 'center', marginTop: '5px', lineHeight: '1.2' }}>
                                    Zoom applied only when used as an icon/thumbnail.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--tool-text-main)' }}>
                    Focus Point: {form.focus ? `X: ${form.focus.x}%, Y: ${form.focus.y}%` : 'Center (50%, 50%)'}
                </div>
            </div>
            <CommandCenter 
                isDirty={isDirty} 
                isSaving={isSaving} 
                lastSaved={lastSaved} 
                onSave={handleSave} 
                onRevert={() => setShowRevertModal(true)} 
                onDelete={() => onDelete(form.id)}
                onDuplicate={() => onDuplicate(form)}
                itemType="Asset"
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