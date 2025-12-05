'use client';

import { useState, useEffect } from 'react';
import { Opportunity } from '@/engine/models';
import OptionList from '../../storylets/components/OptionList';
import SmartArea from '@/components/admin/SmartArea';
import BehaviorCard from '@/components/admin/BehaviorCard';

interface Props {
    initialData: Opportunity;
    onSave: (data: Opportunity) => void;
    onDelete: (id: string) => void;
}

export default function OpportunityMainForm({ initialData, onSave, onDelete }: Props) {
    const [form, setForm] = useState(initialData);
    
    const storyId = typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : "";

    useEffect(() => setForm(initialData), [initialData]);

    const handleChange = (field: string, val: any) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    // CTRL+S
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
                
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Title</label><input value={form.name} onChange={e => handleChange('name', e.target.value)} className="form-input" /></div>
                    <div className="form-group"><label className="form-label">Deck ID</label><input value={form.deck || ''} onChange={e => handleChange('deck', e.target.value)} className="form-input" /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Folder</label><input value={form.folder || ''} onChange={e => handleChange('folder', e.target.value)} className="form-input" /></div>
                    <div className="form-group"><label className="form-label">Image Code</label><input value={form.image_code || ''} onChange={e => handleChange('image_code', e.target.value)} className="form-input" /></div>
                </div>

                {/* TEASER */}
                <SmartArea 
                    label="Teaser Text" 
                    subLabel="Shown on the card face."
                    value={form.short || ''} 
                    onChange={v => handleChange('short', v)} 
                    storyId={storyId} 
                    minHeight="60px"
                />

                {/* LOGIC */}
                <div className="form-group" style={{ background: '#181a1f', padding: '1rem', borderRadius: '4px', border: '1px solid #333', marginTop: '1rem' }}>
                    <label className="special-label" style={{ color: '#61afef', marginBottom: '0.5rem' }}>Card Logic</label>
                    
                    <SmartArea 
                        label="Draw Condition" 
                        value={form.draw_condition || ''} 
                        onChange={v => handleChange('draw_condition', v)} 
                        storyId={storyId} 
                        mode="text" 
                        placeholder="$gold > 10"
                    />
                    
                    <div className="form-row" style={{ marginTop: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Frequency</label>
                            <select value={form.frequency || 'Standard'} onChange={e => handleChange('frequency', e.target.value)} className="form-select">
                                <option value="Always">Always</option>
                                <option value="Frequent">Frequent</option>
                                <option value="Standard">Standard</option>
                                <option value="Infrequent">Infrequent</option>
                                <option value="Rare">Rare</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* BODY */}
                <div style={{ marginTop: '1rem' }}>
                    <SmartArea 
                        label="Card Body Text" 
                        value={form.text} 
                        onChange={v => handleChange('text', v)} 
                        storyId={storyId} 
                        minHeight="150px" 
                    />
                </div>

                {/* BEHAVIOR */}
                <div className="special-field-group" style={{ borderColor: '#c678dd', marginTop: '1rem' }}>
                    <label className="special-label" style={{ color: '#c678dd' }}>Card Behavior</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <BehaviorCard 
                            checked={form.can_discard !== false} // Default true
                            onChange={() => handleChange('can_discard', !form.can_discard)} 
                            label="Discardable" 
                            desc="Player can remove this card." 
                        />
                        <BehaviorCard 
                            checked={!!form.keep_if_invalid} 
                            onChange={() => handleChange('keep_if_invalid', !form.keep_if_invalid)} 
                            label="Sticky" 
                            desc="Keep in hand even if invalid." 
                        />
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