'use client';

import { useState, useEffect } from 'react';
import { Storylet } from '@/engine/models';
import OptionList from './OptionList';
import SmartArea from '@/components/admin/SmartArea'; // <--- THE NEW COMPONENT
import { toggleProperty, hasProperty } from '@/utils/propertyHelpers';
import BehaviorCard from '../../../../../components/admin/BehaviorCard';

interface Props {
    initialData: Storylet;
    onSave: (data: Storylet) => void;
    onDelete: (id: string) => void;
}

export default function StoryletMainForm({ initialData, onSave, onDelete }: Props) {
    const [form, setForm] = useState(initialData);
    
    // Note: We REMOVED activeField state! Clean!
    
    const storyId = typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : "";

    useEffect(() => setForm(initialData), [initialData]);

    const handleChange = (field: string, val: any) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    const handleTagToggle = (tag: string) => {
        const newTags = toggleProperty(form.tags, tag);
        handleChange('tags', newTags);
    };

    // CTRL+S Handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                onSave(form);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [form, onSave]);

    return (
        <div className="h-full flex flex-col relative">
            {/* ... Header (Same as before) ... */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #444' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: '#fff' }}>{form.id}</h2>
                     <select value={form.status || 'draft'} onChange={e => handleChange('status', e.target.value)} style={{ background: form.status === 'published' ? '#2ecc71' : '#f1c40f', color: '#000', fontWeight: 'bold', border: 'none', padding: '0.3rem', borderRadius: '4px' }}>
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
                
                {/* BASIC INFO */}
                <div className="form-row">
                    <SmartArea label="Title" value={form.name} onChange={v => handleChange('name', v)} storyId={storyId} minHeight="38px" />
                    <div className="form-group" style={{ flex:1 }}><label className="form-label">Location ID</label><input value={form.location || ''} onChange={e => handleChange('location', e.target.value)} className="form-input" /></div>
                </div>

                {/* TEASER */}
                <SmartArea 
                    label="Teaser Text" 
                    subLabel="Shown on the button before entering."
                    value={form.short || ''} 
                    onChange={v => handleChange('short', v)} 
                    storyId={storyId} 
                    minHeight="60px"
                />

                {/* REQUIREMENTS */}
                <div className="form-group" style={{ background: '#181a1f', padding: '1rem', borderRadius: '4px', border: '1px solid #333' }}>
                    <label className="special-label" style={{ color: '#61afef', marginBottom: '0.5rem' }}>Requirements</label>
                    <div className="form-row">
                        <div style={{ flex: 1 }}>
                            <SmartArea label="Visible If" value={form.visible_if || ''} onChange={v => handleChange('visible_if', v)} storyId={storyId} mode="condition" placeholder="$gold > 0" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <SmartArea label="Unlock If" value={form.unlock_if || ''} onChange={v => handleChange('unlock_if', v)} storyId={storyId} mode="condition" placeholder="$gold >= 10" />
                        </div>
                    </div>
                </div>

                {/* MAIN TEXT */}
                <div style={{ marginTop: '1rem' }}>
                    <SmartArea 
                        label="Main Text" 
                        value={form.text} 
                        onChange={v => handleChange('text', v)} 
                        storyId={storyId} 
                        minHeight="200px" 
                        placeholder="Write your story..." 
                    />
                </div>

                {/* META */}
                <SmartArea 
                    label="Instruction Text (Meta)"
                    subLabel="Italic text below the body."
                    value={form.metatext || ''} 
                    onChange={v => handleChange('metatext', v)} 
                    storyId={storyId} 
                    minHeight="38px"
                />

                {/* AUTOFIRE */}
                <div className="special-field-group" style={{ borderColor: form.autofire_if ? '#e06c75' : '#444', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label className="special-label" style={{ color: form.autofire_if ? '#e06c75' : '#aaa', margin: 0 }}>Must-Event (Autofire)</label>
                        <input type="checkbox" checked={!!form.autofire_if} onChange={e => handleChange('autofire_if', e.target.checked ? '$quality >= 1' : undefined)} />
                    </div>
                    {form.autofire_if !== undefined && (
                        <SmartArea 
                            label="Condition" 
                            value={form.autofire_if} 
                            onChange={v => handleChange('autofire_if', v)} 
                            storyId={storyId} 
                            mode="condition" 
                        />
                    )}
                </div>

                {/* BEHAVIOR */}
                <div className="special-field-group" style={{ borderColor: '#c678dd', marginTop: '1rem' }}>
                    <label className="special-label" style={{ color: '#c678dd' }}>Behavior</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <BehaviorCard checked={hasProperty(form.tags, 'no_return')} onChange={() => handleTagToggle('no_return')} label="Disable Return" desc="Removes the 'Go Back' button." />
                        <BehaviorCard checked={hasProperty(form.tags, 'instant_redirect')} onChange={() => handleTagToggle('instant_redirect')} label="Instant Redirect" desc="Skip to first option." />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Return Target</label>
                        <input value={form.return || ''} onChange={e => handleChange('return', e.target.value)} className="form-input" placeholder="Default: Location Hub" />
                    </div>
                </div>

                <div style={{ marginTop: '2rem', borderTop: '1px solid #444', paddingTop: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#98c379', marginBottom: '1rem' }}>Options</h3>
                    <OptionList options={form.options || []} onChange={(newOpts) => handleChange('options', newOpts)} storyId={storyId} />
                </div>
            </div>
        </div>
    );
}