'use client';

import { useState, useEffect } from 'react';
import { MarketDefinition, ShopStall, ShopListing, QualityDefinition } from '@/engine/models';
import SparkleIcon from '@/components/icons/SparkleIcon';
import { v4 as uuidv4 } from 'uuid';

interface Props {
    initialData: MarketDefinition;
    onSave: (data: MarketDefinition) => void;
    onDelete: (id: string) => void;
    allQualities: QualityDefinition[];
    storyId: string;
}

export default function MarketMainForm({ initialData, onSave, onDelete, allQualities, storyId }: Props) {
    const [form, setForm] = useState(initialData);
    const [activeStallIndex, setActiveStallIndex] = useState(0);
    
    useEffect(() => setForm(initialData), [initialData]);

    const handleChange = (field: keyof MarketDefinition, val: any) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    // --- STALL LOGIC ---
    const addStall = () => {
        const newStall: ShopStall = {
            id: uuidv4(),
            name: "New Stall",
            mode: 'buy',
            listings: []
        };
        const newStalls = [...form.stalls, newStall];
        handleChange('stalls', newStalls);
        setActiveStallIndex(newStalls.length - 1);
    };

    const updateStall = (index: number, field: keyof ShopStall, val: any) => {
        const newStalls = [...form.stalls];
        newStalls[index] = { ...newStalls[index], [field]: val };
        handleChange('stalls', newStalls);
    };

    const removeStall = (index: number) => {
        if (!confirm("Delete stall and all listings?")) return;
        const newStalls = form.stalls.filter((_, i) => i !== index);
        handleChange('stalls', newStalls);
        setActiveStallIndex(Math.max(0, index - 1));
    };

    // --- LISTING LOGIC ---
    const currentStall = form.stalls[activeStallIndex];

    const addListing = () => {
        if (!currentStall) return;
        const newListing: ShopListing = {
            id: uuidv4(),
            qualityId: "",
            price: "1"
        };
        updateStall(activeStallIndex, 'listings', [...currentStall.listings, newListing]);
    };

    const updateListing = (lIndex: number, field: keyof ShopListing, val: any) => {
        const newListings = [...currentStall.listings];
        newListings[lIndex] = { ...newListings[lIndex], [field]: val };
        updateStall(activeStallIndex, 'listings', newListings);
    };

    const removeListing = (lIndex: number) => {
        const newListings = currentStall.listings.filter((_, i) => i !== lIndex);
        updateStall(activeStallIndex, 'listings', newListings);
    };

    // --- BULK ADD LOGIC ---
    const bulkAdd = (category: string) => {
        if (!currentStall || !category) return;
        const itemsToAdd = allQualities.filter(q => 
            (q.type === 'I' || q.type === 'E') && 
            q.category?.includes(category)
        );

        const newListings = [...currentStall.listings];
        let addedCount = 0;
        
        itemsToAdd.forEach(item => {
            // Avoid duplicates
            if (!newListings.find(l => l.qualityId === item.id)) {
                newListings.push({
                    id: uuidv4(),
                    qualityId: item.id,
                    price: "10" // Default price
                });
                addedCount++;
            }
        });

        updateStall(activeStallIndex, 'listings', newListings);
        alert(`Added ${addedCount} items from category '${category}'.`);
    };

    // Get unique categories for the dropdown
    const categories = Array.from(new Set(allQualities.map(q => q.category?.split(',')[0].trim()).filter(Boolean)));

    return (
        <div className="h-full flex flex-col">
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #444' }}>
                <h2 style={{ margin: 0, color: '#fff' }}>{form.id}</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => onDelete(form.id)} className="unequip-btn" style={{ width: 'auto', padding: '0.5rem 1rem' }}>Delete</button>
                    <button onClick={() => onSave(form)} className="save-btn" style={{ padding: '0.5rem 1rem' }}>Save</button>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem', paddingBottom: '2rem' }}>
                
                {/* GLOBAL SETTINGS */}
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Display Name</label><input value={form.name} onChange={e => handleChange('name', e.target.value)} className="form-input" /></div>
                    <div className="form-group"><label className="form-label">Default Currency</label><input value={form.defaultCurrencyId} onChange={e => handleChange('defaultCurrencyId', e.target.value)} className="form-input" placeholder="gold" /></div>
                </div>
                <div className="form-group"><label className="form-label">Image/Banner</label><input value={form.image || ''} onChange={e => handleChange('image', e.target.value)} className="form-input" /></div>

                {/* STALL TABS */}
                <div style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>
                        {form.stalls.map((stall, idx) => (
                            <button 
                                key={stall.id}
                                onClick={() => setActiveStallIndex(idx)}
                                style={{ 
                                    padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', border: 'none',
                                    background: activeStallIndex === idx ? 'var(--accent-primary)' : '#181a1f',
                                    color: activeStallIndex === idx ? 'white' : '#888',
                                    fontWeight: 'bold'
                                }}
                            >
                                {stall.name}
                            </button>
                        ))}
                        <button onClick={addStall} style={{ background: 'transparent', border: '1px dashed #666', color: '#666', borderRadius: '4px', cursor: 'pointer', padding: '0.5rem 1rem' }}>+ New Stall</button>
                    </div>
                </div>

                {/* ACTIVE STALL EDITOR */}
                {currentStall && (
                    <div style={{ background: '#181a1f', padding: '1.5rem', borderRadius: '0 0 4px 4px', border: '1px solid #333', borderTop: 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <input value={currentStall.name} onChange={e => updateStall(activeStallIndex, 'name', e.target.value)} className="form-input" style={{ fontWeight: 'bold' }} />
                                <select value={currentStall.mode} onChange={e => updateStall(activeStallIndex, 'mode', e.target.value)} className="form-select">
                                    <option value="buy">Player Buys</option>
                                    <option value="sell">Player Sells</option>
                                </select>
                            </div>
                            <button onClick={() => removeStall(activeStallIndex)} style={{ color: '#e06c75', background: 'none', border: 'none', cursor: 'pointer' }}>Delete Stall</button>
                        </div>

                        {/* BULK ADDER */}
                        <div style={{ background: 'rgba(97, 175, 239, 0.1)', padding: '0.5rem', borderRadius: '4px', display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '0.8rem', color: '#61afef', fontWeight: 'bold' }}>⚡ Bulk Add:</span>
                            <select id="bulk-cat" className="form-select" style={{ width: 'auto', padding: '0.2rem' }}>
                                <option value="">Select Category...</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button 
                                onClick={() => {
                                    const sel = document.getElementById('bulk-cat') as HTMLSelectElement;
                                    if(sel.value) bulkAdd(sel.value);
                                }}
                                className="save-btn" 
                                style={{ padding: '0.2rem 0.8rem', fontSize: '0.8rem' }}
                            >
                                Add All
                            </button>
                        </div>

                        {/* LISTINGS GRID */}
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {currentStall.listings.map((listing, lIdx) => (
                                <div key={listing.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 30px', gap: '1rem', alignItems: 'center', background: '#21252b', padding: '0.5rem', borderRadius: '4px', border: '1px solid #333' }}>
                                    {/* Item Selector */}
                                    <select 
                                        value={listing.qualityId} 
                                        onChange={e => updateListing(lIdx, 'qualityId', e.target.value)} 
                                        className="form-select"
                                    >
                                        <option value="">Select Item...</option>
                                        {allQualities.map(q => (
                                            <option key={q.id} value={q.id}>{q.name} ({q.id})</option>
                                        ))}
                                    </select>

                                    {/* Price (Logic Enabled) */}
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            value={listing.price} 
                                            onChange={e => updateListing(lIdx, 'price', e.target.value)} 
                                            className="form-input" 
                                            placeholder="Price (10 or $val*2)" 
                                            style={{ paddingRight: '30px' }}
                                        />
                                        {/* Reuse simple Logic Button concept */}
                                        <button style={{ position: 'absolute', right: 5, top: 5, background: 'none', border: 'none', color: '#f1c40f' }}>$</button>
                                    </div>

                                    <button onClick={() => removeListing(lIdx)} style={{ color: '#e06c75', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                                </div>
                            ))}
                            
                            <button onClick={addListing} style={{ padding: '0.5rem', border: '1px dashed #444', background: 'transparent', color: '#888', cursor: 'pointer', borderRadius: '4px' }}>
                                + Add Item
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}