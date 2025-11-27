'use client';

import { useState, useEffect } from 'react';
import { Storylet } from '@/engine/models';
import OptionList from './OptionList';

interface Props {
    initialData: Storylet;
    onSave: (data: Storylet) => void;
    onDelete: (id: string) => void;
}

export default function StoryletMainForm({ initialData, onSave, onDelete }: Props) {
    const [form, setForm] = useState(initialData);
    
    useEffect(() => setForm(initialData), [initialData]);

    const handleChange = (field: string, val: any) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    return (
        <div className="h-full flex flex-col">
            
            {/* 1. HEADER ACTIONS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <h2 style={{ margin: 0, color: '#fff' }}>{form.id}</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => onDelete(form.id)} className="unequip-btn" style={{ width: 'auto', padding: '0.5rem 1rem' }}>Delete</button>
                    <button onClick={() => onSave(form)} className="save-btn" style={{ padding: '0.5rem 1rem' }}>Save</button>
                </div>
            </div>

            {/* 2. SCROLLABLE CONTENT */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem', paddingBottom: '2rem' }}>

                
                {/* TITLE & LOCATION */}
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Title (Name)</label>
                        <input 
                            value={form.name} 
                            onChange={e => handleChange('name', e.target.value)}
                            className="form-input"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Location ID</label>
                        <input 
                            value={form.location || ''} 
                            onChange={e => handleChange('location', e.target.value)}
                            className="form-input"
                        />
                    </div>
                </div>

                {/* IMAGES & PROPERTIES */}
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Image Code</label>
                        <input 
                            value={form.image_code || ''} 
                            onChange={e => handleChange('image_code', e.target.value)}
                            className="form-input"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Properties (Tags)</label>
                        <input 
                            placeholder="e.g. instant_redirect"
                            value={form.properties || ''} 
                            onChange={e => handleChange('properties', e.target.value)}
                            className="form-input"
                        />
                    </div>
                </div>

                {/* MAIN TEXT CONTENT */}
                <div className="form-group">
                    <label className="form-label">Main Text</label>
                    <textarea 
                        value={form.text} 
                        onChange={e => handleChange('text', e.target.value)}
                        className="form-textarea"
                        rows={6}
                    />
                </div>

                {/* SHORT & META */}
                <div className="form-group">
                    <label className="form-label">Short Description (Teaser)</label>
                    <textarea 
                        value={form.short || ''} 
                        onChange={e => handleChange('short', e.target.value)}
                        className="form-textarea"
                        rows={2}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Meta Text (Instructions)</label>
                    <textarea 
                        value={form.metatext || ''} 
                        onChange={e => handleChange('metatext', e.target.value)}
                        className="form-textarea"
                        style={{ fontStyle: 'italic', color: '#aaa' }}
                        rows={2}
                    />
                </div>

                {/* LOGIC & REQUIREMENTS */}
                <div className="form-group">
                    <label className="form-label">Requirements</label>
                    <div className="form-row">
                        <input 
                            placeholder="Visible If ($q > 1)" 
                            value={form.visible_if || ''} 
                            onChange={e => handleChange('visible_if', e.target.value)}
                            className="form-input"
                        />
                        <input 
                            placeholder="Unlock If ($q > 5)" 
                            value={form.unlock_if || ''} 
                            onChange={e => handleChange('unlock_if', e.target.value)}
                            className="form-input"
                        />
                    </div>
                </div>

                {/* SPECIAL LOGIC */}
                <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Return Target</label>
                        <input 
                            placeholder="Storylet ID to return to" 
                            value={form.return || ''} 
                            onChange={e => handleChange('return', e.target.value)}
                            className="form-input"
                        />
                    </div>
                    <div className="special-field-group" style={{ flex: 1, marginBottom: '1rem' }}>
                        <label className="special-label">Autofire Condition</label>
                        <input 
                            placeholder="$wounds >= 8" 
                            value={form.autofire_if || ''} 
                            onChange={e => handleChange('autofire_if', e.target.value)}
                            className="form-input"
                        />
                    </div>
                </div>

                {/* OPTIONS (Placeholder for now) */}
                <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#98c379', marginBottom: '1rem' }}>
                        Options ({form.options?.length || 0})
                    </h3>
                    
                    <OptionList 
                        options={form.options || []} 
                        onChange={(newOpts) => handleChange('options', newOpts)}
                    />
                </div>

            </div>
        </div>
    );
}