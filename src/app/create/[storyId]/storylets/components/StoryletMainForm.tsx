'use client';

import { useState, useEffect } from 'react';
import { Storylet } from '@/engine/models';
import OptionList from './OptionList';
import SparkleIcon from '@/components/icons/SparkleIcon';
import ScribeAssistant from '../../components/ScribeAssistant';

interface Props {
    initialData: Storylet;
    onSave: (data: Storylet) => void;
    onDelete: (id: string) => void;
}

export default function StoryletMainForm({ initialData, onSave, onDelete }: Props) {
    const [form, setForm] = useState(initialData);
    
    const [activeField, setActiveField] = useState<'text' | 'autofire' | null>(null);
    
    const storyId = typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : "";

    useEffect(() => setForm(initialData), [initialData]);

    const handleChange = (field: string, val: any) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    const handleTextInsert = (text: string) => {
        if (activeField === 'text') {
             handleChange('text', (form.text || "") + " " + text);
        } else if (activeField === 'autofire') {
             handleChange('autofire_if', (form.autofire_if || "") + text);
        }
    };

    return (
        <div className="h-full flex flex-col relative">
            
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
                {/* INPUTS */}
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Title</label><input value={form.name} onChange={e => handleChange('name', e.target.value)} className="form-input" /></div>
                    <div className="form-group"><label className="form-label">Location ID</label><input value={form.location || ''} onChange={e => handleChange('location', e.target.value)} className="form-input" /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Folder</label><input value={form.folder || ''} onChange={e => handleChange('folder', e.target.value)} className="form-input" /></div>
                    <div className="form-group"><label className="form-label">Image Code</label><input value={form.image_code || ''} onChange={e => handleChange('image_code', e.target.value)} className="form-input" /></div>
                </div>

                {/* MAIN TEXT */}
                <div className="form-group" style={{ position: 'relative', zIndex: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <label className="form-label" style={{ margin: 0 }}>Main Text</label>
                        <button 
                            onClick={() => setActiveField(activeField === 'text' ? null : 'text')} 
                            style={{ 
                                background: 'rgba(97, 175, 239, 0.1)', border: '1px solid rgba(97, 175, 239, 0.3)', borderRadius: '4px',
                                color: '#61afef', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 8px'
                            }}
                        >
                            <SparkleIcon className="w-3 h-3" /> Logic
                        </button>
                    </div>
                    
                    {/* TEXTAREA: Lower Z-Index */}
                    <textarea 
                        value={form.text} 
                        onChange={e => handleChange('text', e.target.value)} 
                        className="form-textarea" 
                        rows={6} 
                        style={{ position: 'relative', zIndex: 1 }}
                    />

                    {/* POPUP: Rendered AFTER textarea, Higher Z-Index */}
                    {activeField === 'text' && (
                        <div style={{ position: 'absolute', top: '30px', right: 0, zIndex: 100 }}>
                            <ScribeAssistant storyId={storyId} mode="text" onInsert={handleTextInsert} onClose={() => setActiveField(null)} />
                        </div>
                    )}
                </div>

                {/* AUTOFIRE */}
                <div className="special-field-group" style={{ borderColor: form.autofire_if ? '#e06c75' : '#444', position: 'relative', zIndex: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="special-label" style={{ color: form.autofire_if ? '#e06c75' : '#aaa', margin: 0 }}>Must-Event (Autofire)</label>
                        <input type="checkbox" checked={!!form.autofire_if} onChange={e => handleChange('autofire_if', e.target.checked ? '$quality >= 1' : undefined)} />
                    </div>
                    {form.autofire_if !== undefined && (
                        <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                            <input 
                                value={form.autofire_if} 
                                onChange={e => handleChange('autofire_if', e.target.value)} 
                                className="form-input" 
                                style={{ paddingRight: '90px' }} 
                                placeholder="Condition..." 
                            />
                            <button 
                                onClick={() => setActiveField(activeField === 'autofire' ? null : 'autofire')} 
                                style={{ 
                                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                                    background: 'rgba(231, 76, 60, 0.15)', border: '1px solid #e06c75', color: '#e06c75',
                                    borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold',
                                    display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px'
                                }}
                            >
                                <SparkleIcon className="w-3 h-3" /> Logic
                            </button>
                            
                            {/* POPUP: Rendered AFTER input */}
                            {activeField === 'autofire' && (
                                <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 100, marginTop: '5px' }}>
                                    <ScribeAssistant storyId={storyId} mode="condition" onInsert={handleTextInsert} onClose={() => setActiveField(null)} />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '2rem', borderTop: '1px solid #444', paddingTop: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#98c379', marginBottom: '1rem' }}>Options</h3>
                    <OptionList options={form.options || []} onChange={(newOpts) => handleChange('options', newOpts)} storyId={storyId} />
                </div>
            </div>
        </div>
    );
}