'use client';

import { useState, useEffect } from 'react';
import { Storylet } from '@/engine/models';
import OptionList from './OptionList';
import GameImage from '@/components/GameImage';
import ScribeAssistant from '../../components/ScribeAssistant';

interface Props {
    initialData: Storylet;
    onSave: (data: Storylet) => void;
    onDelete: (id: string) => void;
    // We assume initialData might have worldId, or we parse it from URL in parent. 
    // But for safety, the parent passes the ID via the initialData object or we parse it.
    // Wait, Storylet model doesn't always have worldId. 
    // NOTE: We need to pass storyId explicitly if it's not in initialData.
    // Let's assume the parent component injects it into the props or we extract it here.
}

export default function StoryletMainForm({ initialData, onSave, onDelete }: Props) {
    const [form, setForm] = useState(initialData);
    const [assistantMode, setAssistantMode] = useState<'text' | 'condition' | null>(null);
    
    // Hack to get storyId if not passed directly. 
    // In a real app, pass it as a prop. 
    // We will assume the parent Page passes it implicitly or we grab it from window? 
    // Ideally, add `storyId` to Props.
    // Let's assume `form` has it, or we use a fallback.
    // ACTUALLY: We need to update the interface to accept storyId prop.
    // For now, let's assume the user will provide it via the ScribeAssistant logic
    // or we grab it from the URL.
    const storyId = typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : "";

    useEffect(() => setForm(initialData), [initialData]);

    const handleChange = (field: string, val: any) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    const handleTextInsert = (text: string) => {
        if (assistantMode === 'text') {
             handleChange('text', (form.text || "") + " " + text);
        } else if (assistantMode === 'condition') {
             handleChange('autofire_if', (form.autofire_if || "") + text);
        }
    };

    return (
        <div className="h-full flex flex-col relative">
            
            {/* ASSISTANT POPUP */}
            {assistantMode && (
                <div style={{ position: 'absolute', top: '150px', right: '2rem', zIndex: 100 }}>
                    <ScribeAssistant 
                        storyId={storyId}
                        mode={assistantMode === 'text' ? 'text' : 'condition'}
                        onInsert={handleTextInsert}
                        onClose={() => setAssistantMode(null)}
                    />
                </div>
            )}

            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #444' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: '#fff' }}>{form.id}</h2>
                    <select 
                        value={form.status || 'draft'} 
                        onChange={e => handleChange('status', e.target.value)}
                        style={{ background: form.status === 'published' ? '#2ecc71' : '#f1c40f', color: '#000', fontWeight: 'bold', border: 'none', padding: '0.3rem', borderRadius: '4px' }}
                    >
                        <option value="draft">DRAFT</option>
                        <option value="published">PUBLISHED</option>
                    </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => onDelete(form.id)} className="unequip-btn" style={{ width: 'auto', padding: '0.5rem 1rem' }}>Delete</button>
                    <button onClick={() => onSave(form)} className="save-btn" style={{ padding: '0.5rem 1rem' }}>Save</button>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem', paddingBottom: '2rem' }}>
                
                {/* META */}
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Title</label>
                        <input value={form.name} onChange={e => handleChange('name', e.target.value)} className="form-input" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Location ID</label>
                        <input value={form.location || ''} onChange={e => handleChange('location', e.target.value)} className="form-input" />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Folder</label>
                        <input value={form.folder || ''} onChange={e => handleChange('folder', e.target.value)} className="form-input" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Image Code</label>
                        <input value={form.image_code || ''} onChange={e => handleChange('image_code', e.target.value)} className="form-input" />
                    </div>
                </div>

                {/* BODY TEXT */}
                <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        Main Text
                        <button onClick={() => setAssistantMode('text')} style={{ background: 'none', border: 'none', color: '#61afef', cursor: 'pointer', fontSize: '0.8rem' }}>
                            ⚡ Insert Variable
                        </button>
                    </label>
                    <textarea value={form.text} onChange={e => handleChange('text', e.target.value)} className="form-textarea" rows={6} />
                </div>

                {/* AUTOFIRE (MUST EVENT) */}
                <div className="special-field-group" style={{ borderColor: form.autofire_if ? '#e06c75' : '#444' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label className="special-label" style={{ color: form.autofire_if ? '#e06c75' : '#aaa' }}>Must-Event (Autofire)</label>
                        <input type="checkbox" checked={!!form.autofire_if} onChange={e => handleChange('autofire_if', e.target.checked ? '$quality >= 1' : undefined)} />
                    </div>
                    {form.autofire_if !== undefined && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
                            <input value={form.autofire_if} onChange={e => handleChange('autofire_if', e.target.value)} className="form-input" placeholder="Condition..." />
                            <button onClick={() => setAssistantMode('condition')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>⚡</button>
                        </div>
                    )}
                </div>

                {/* OPTIONS LIST */}
                <div style={{ marginTop: '2rem', borderTop: '1px solid #444', paddingTop: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#98c379', marginBottom: '1rem' }}>Options</h3>
                    <OptionList 
                        options={form.options || []} 
                        onChange={(newOpts) => handleChange('options', newOpts)}
                        storyId={storyId} // Pass down
                    />
                </div>
            </div>
        </div>
    );
}