'use client';

import { useState, useEffect } from 'react';
import { Opportunity } from '@/engine/models';
import OptionList from '@/app/admin/storylets/components/OptionList'; // Reuse this!

interface Props {
    initialData: Opportunity;
    onSave: (data: Opportunity) => void;
    onDelete: (id: string) => void;
}

export default function OpportunityMainForm({ initialData, onSave, onDelete }: Props) {
    const [form, setForm] = useState(initialData);
    
    useEffect(() => setForm(initialData), [initialData]);

    const handleChange = (field: string, val: any) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    return (
        <div className="h-full flex flex-col">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #444' }}>
                <h2 style={{ margin: 0, color: '#fff' }}>{form.id}</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => onDelete(form.id)} className="unequip-btn" style={{ width: 'auto', padding: '0.5rem 1rem' }}>Delete</button>
                    <button onClick={() => onSave(form)} className="save-btn" style={{ padding: '0.5rem 1rem' }}>Save</button>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
                
                {/* TITLE & DECK */}
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Title</label>
                        <input value={form.name} onChange={e => handleChange('name', e.target.value)} className="form-input" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Deck ID</label>
                        <input value={form.deck || ''} onChange={e => handleChange('deck', e.target.value)} className="form-input" placeholder="e.g. village_deck" />
                    </div>
                </div>

                {/* FREQUENCY & IMAGE */}
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Image Code</label>
                        <input value={form.image_code || ''} onChange={e => handleChange('image_code', e.target.value)} className="form-input" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Frequency</label>
                        <select 
                            value={form.frequency || 'Standard'} 
                            onChange={e => handleChange('frequency', e.target.value)}
                            className="form-select"
                        >
                            <option value="Always">Always (Infinite Weight)</option>
                            <option value="Frequent">Frequent (High)</option>
                            <option value="Standard">Standard</option>
                            <option value="Infrequent">Infrequent (Low)</option>
                            <option value="Rare">Rare (Very Low)</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Card Text</label>
                    <textarea value={form.text} onChange={e => handleChange('text', e.target.value)} className="form-textarea" rows={4} />
                </div>

                {/* LOGIC */}
                <div className="special-field-group" style={{ borderColor: '#61afef' }}>
                    <label className="special-label" style={{ color: '#61afef' }}>Draw Condition</label>
                    <input 
                        placeholder="Only appear in hand if ($gold > 10)" 
                        value={form.draw_condition || ''} 
                        onChange={e => handleChange('draw_condition', e.target.value)}
                        className="form-input"
                    />
                </div>

                {/* REUSE OPTION LIST */}
                <div style={{ marginTop: '2rem', borderTop: '1px solid #444', paddingTop: '1rem' }}>
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