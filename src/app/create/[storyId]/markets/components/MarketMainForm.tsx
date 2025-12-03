'use client';

import { useState, useEffect } from 'react';
import { MarketDefinition, ShopStall, ShopListing, QualityDefinition, QualityType } from '@/engine/models';
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

    // --- FILTERING LOGIC ---
    // 1. Tradeable Items: Default to Items/Equip only, unless "Allow All" is checked
    const tradeableQualities = form.allowAllTypes 
        ? allQualities 
        : allQualities.filter(q => q.type === QualityType.Item || q.type === QualityType.Equipable);

    // 2. Currencies: Usually Counters/Trackers/Items
    const currencyOptions = allQualities.filter(q => 
        q.type === QualityType.Counter || q.type === QualityType.Tracker || q.type === QualityType.Item
    );

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
        if (!confirm("Delete stall?")) return;
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
        // Use the filtered list so we don't accidentally add Stats if "Allow All" is off
        const itemsToAdd = tradeableQualities.filter(q => q.category?.includes(category));

        const newListings = [...currentStall.listings];
        let addedCount = 0;
        
        itemsToAdd.forEach(item => {
            if (!newListings.find(l => l.qualityId === item.id)) {
                newListings.push({
                    id: uuidv4(),
                    qualityId: item.id,
                    price: "10"
                });
                addedCount++;
            }
        });

        updateStall(activeStallIndex, 'listings', newListings);
        alert(`Added ${addedCount} items.`);
    };

    const categories = Array.from(new Set(tradeableQualities.map(q => q.category?.split(',')[0].trim()).filter(Boolean)));

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
                    
                    <div className="form-group">
                        <label className="form-label">Default Currency</label>
                        <select 
                            value={form.defaultCurrencyId} 
                            onChange={e => handleChange('defaultCurrencyId', e.target.value)} 
                            className="form-select"
                        >
                             <option value="">-- Select Currency --</option>
                             {currencyOptions.map(c => (
                                 <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                             ))}
                        </select>
                    </div>
                </div>
                
                <div className="form-group">
                    <label className="form-label">Image/Banner</label>
                    <input value={form.image || ''} onChange={e => handleChange('image', e.target.value)} className="form-input" />
                </div>

                {/* TOGGLE: ESOTERIC TYPES */}
                <div style={{ marginBottom: '2rem', background: '#181a1f', padding: '0.5rem', borderRadius: '4px', border: '1px dashed #444' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#aaa', fontSize: '0.85rem' }}>
                        <input 
                            type="checkbox" 
                            checked={form.allowAllTypes || false} 
                            onChange={e => handleChange('allowAllTypes', e.target.checked)} 
                        />
                        Allow Esoteric Trades (Pyramidal Qualities, Strings, etc.)
                    </label>
                </div>

                {/* STALL TABS */}
                <div style={{ marginTop: '1rem' }}>
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
                        
                        {/* Row 1: Name & Mode */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                                <div style={{ flex: 2 }}>
                                    <label className="form-label">Stall Name</label>
                                    <input 
                                        value={currentStall.name} 
                                        onChange={e => updateStall(activeStallIndex, 'name', e.target.value)} 
                                        className="form-input" 
                                        style={{ fontWeight: 'bold' }} 
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">Mode</label>
                                    <select value={currentStall.mode} onChange={e => updateStall(activeStallIndex, 'mode', e.target.value)} className="form-select">
                                        <option value="buy">Player Buys</option>
                                        <option value="sell">Player Sells</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ alignSelf: 'end', marginLeft: '1rem' }}>
                                <button onClick={() => removeStall(activeStallIndex)} className="unequip-btn" style={{ width: 'auto', padding: '0.6rem 1rem' }}>
                                    Delete Stall
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Source Configuration (NEW) */}
                        <div className="form-group" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px dashed #444' }}>
                            <label className="form-label" style={{ color: '#98c379' }}>Item Source Tag (Optional)</label>
                            <input 
                                value={currentStall.source || ''} 
                                onChange={e => updateStall(activeStallIndex, 'source', e.target.value)} 
                                className="form-input" 
                                placeholder={`bought at ${currentStall.name}`}
                            />
                            <p className="special-desc">
                                Items gained here will be tagged: <code>[source:{currentStall.source || `bought at ${currentStall.name}`}]</code>.
                                <br/>Useful for "Deduction" mechanics or tracking where contraband came from.
                            </p>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            
                            {/* Header Row for Clarity */}
                            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 2fr 30px', gap: '1rem', padding: '0 0.5rem', fontSize: '0.75rem', color: '#aaa', textTransform: 'uppercase' }}>
                                <span>Item</span>
                                <span>Price (Logic Allowed)</span>
                                <span>Currency Override</span>
                                <span></span>
                            </div>

                            {currentStall.listings.map((listing, lIdx) => (
                                <div key={listing.id} style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 2fr 30px', gap: '1rem', alignItems: 'center', background: '#21252b', padding: '0.5rem', borderRadius: '4px', border: '1px solid #333' }}>
                                    
                                    {/* ITEM SELECTOR */}
                                    <select 
                                        value={listing.qualityId} 
                                        onChange={e => updateListing(lIdx, 'qualityId', e.target.value)} 
                                        className="form-select"
                                    >
                                        <option value="">Select Item...</option>
                                        {tradeableQualities.map(q => (
                                            <option key={q.id} value={q.id}>{q.name} ({q.id})</option>
                                        ))}
                                    </select>

                                    {/* PRICE INPUT */}
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            value={listing.price} 
                                            onChange={e => updateListing(lIdx, 'price', e.target.value)} 
                                            className="form-input" 
                                            placeholder="10" 
                                            title="Logic allowed (e.g. $rep * 5)"
                                        />
                                    </div>

                                    {/* CURRENCY OVERRIDE */}
                                    <select 
                                        value={listing.currencyId || ""} 
                                        onChange={e => updateListing(lIdx, 'currencyId', e.target.value || undefined)} 
                                        className="form-select"
                                        style={{ fontSize: '0.85rem', color: listing.currencyId ? 'var(--accent-highlight)' : '#777' }}
                                    >
                                        <option value="">Default ({form.defaultCurrencyId})</option>
                                        {currencyOptions.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                                        ))}
                                    </select>

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