'use client';

import { useState, useEffect } from 'react';
import { Opportunity } from '@/engine/models';
import OptionList from '../../storylets/components/OptionList';
import SparkleIcon from '@/components/icons/SparkleIcon';
import ScribeAssistant from '../../components/ScribeAssistant';

interface Props {
    initialData: Opportunity;
    onSave: (data: Opportunity) => void;
    onDelete: (id: string) => void;
}

export default function OpportunityMainForm({ initialData, onSave, onDelete }: Props) {
    const [form, setForm] = useState(initialData);
    
    // Contextual Popup State
    const [activeField, setActiveField] = useState<'text' | 'draw' | null>(null);
    
    const storyId = typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : "";

    useEffect(() => setForm(initialData), [initialData]);

    const handleChange = (field: string, val: any) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    const handleInsert = (text: string) => {
        if (activeField === 'text') {
             handleChange('text', (form.text || "") + " " + text);
        } else if (activeField === 'draw') {
             handleChange('draw_condition', (form.draw_condition || "") + text);
        }
    };

    return (
        <div className="h-full flex flex-col relative">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #444' }}>
                <h2 style={{ margin: 0, color: '#fff' }}>{form.id}</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <select 
                        value={form.status || 'draft'} 
                        onChange={e => handleChange('status', e.target.value)}
                        style={{ background: form.status === 'published' ? '#2ecc71' : '#f1c40f', color: '#000', fontWeight: 'bold', border: 'none', padding: '0.3rem', borderRadius: '4px' }}
                    >
                        <option value="draft">DRAFT</option>
                        <option value="published">PUBLISHED</option>
                    </select>
                    <button onClick={() => onDelete(form.id)} className="unequip-btn" style={{ width: 'auto', padding: '0.5rem 1rem' }}>Delete</button>
                    <button onClick={() => onSave(form)} className="save-btn" style={{ padding: '0.5rem 1rem' }}>Save</button>
                </div>
            </div>
            
            <div className="form-group">
                <label className="form-label">Folder / Category</label>
                <input value={form.folder || ''} onChange={e => handleChange('folder', e.target.value)} className="form-input" placeholder="Chapter 1/Prologue" />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Title</label><input value={form.name} onChange={e => handleChange('name', e.target.value)} className="form-input" /></div>
                    <div className="form-group"><label className="form-label">Deck ID</label><input value={form.deck || ''} onChange={e => handleChange('deck', e.target.value)} className="form-input" /></div>
                </div>

                {/* MAIN TEXT */}
                <div className="form-group" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <label className="form-label" style={{ margin: 0 }}>Card Text</label>
                        <button 
                            onClick={() => setActiveField(activeField === 'text' ? null : 'text')} 
                            style={{ background: 'transparent', border: '1px solid #61afef', borderRadius: '4px', color: '#61afef', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 8px' }}
                        >
                            <SparkleIcon className="w-3 h-3" /> Logic
                        </button>
                    </div>
                    {activeField === 'text' && (
                        <ScribeAssistant storyId={storyId} mode="text" onInsert={handleInsert} onClose={() => setActiveField(null)} />
                    )}
                    <textarea value={form.text} onChange={e => handleChange('text', e.target.value)} className="form-textarea" rows={4} />
                </div>

                {/* DRAW CONDITION */}
                <div className="special-field-group" style={{ borderColor: '#61afef' }}>
                    <label className="special-label" style={{ color: '#61afef' }}>Draw Condition</label>
                    <div style={{ position: 'relative' }}>
                         <input 
                            placeholder="$gold > 10" 
                            value={form.draw_condition || ''} 
                            onChange={e => handleChange('draw_condition', e.target.value)}
                            className="form-input"
                            style={{ paddingRight: '90px' }}
                        />
                        <button 
                            onClick={() => setActiveField(activeField === 'draw' ? null : 'draw')} 
                            style={{ 
                                position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)',
                                background: 'rgba(97, 175, 239, 0.15)', border: '1px solid #61afef', color: '#61afef',
                                borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px'
                            }}
                        >
                            <SparkleIcon className="w-3 h-3" /> Logic
                        </button>
                        {activeField === 'draw' && (
                            <ScribeAssistant storyId={storyId} mode="condition" onInsert={handleInsert} onClose={() => setActiveField(null)} />
                        )}
                    </div>
                </div>

                {/* OPTIONS */}
                <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#98c379', marginBottom: '1rem' }}>Options</h3>
                    <OptionList options={form.options || []} onChange={(newOpts) => handleChange('options', newOpts)} storyId={storyId} />
                </div>
            </div>
        </div>
    );
}