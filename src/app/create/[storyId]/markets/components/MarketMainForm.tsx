'use client';

import { useState } from 'react';
import { MarketDefinition, ShopStall, ShopListing, QualityDefinition, QualityType } from '@/engine/models';
import { v4 as uuidv4 } from 'uuid';
import SmartArea from '@/components/admin/SmartArea';
import BehaviorCard from '@/components/admin/BehaviorCard';
import CommandCenter from '@/components/admin/CommandCenter';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';
import { useToast } from '@/providers/ToastProvider';

interface Props {
    initialData: MarketDefinition;
    onSave: (data: MarketDefinition) => void;
    onDelete: (id: string) => void;
    onDuplicate: (data: MarketDefinition) => void;
    allQualities: QualityDefinition[];
    storyId: string;
    guardRef: { current: FormGuard | null };
}

export default function MarketMainForm({ initialData, onSave, onDelete, onDuplicate, allQualities, storyId, guardRef }: Props) {
    const { 
        data: form, 
        handleChange, 
        handleSave, 
        revertChanges, 
        isDirty, 
        isSaving, 
        lastSaved 
    } = useCreatorForm<MarketDefinition>(
        initialData, 
        '/api/admin/config', 
        { storyId, category: 'markets', itemId: initialData.id }, 
        guardRef
    );

    const [activeStallIndex, setActiveStallIndex] = useState(0);
    const [expandedListingId, setExpandedListingId] = useState<string | null>(null);
    const [showRevertModal, setShowRevertModal] = useState(false);
    const { showToast } = useToast();

    if (!form) return <div className="loading-container">Loading...</div>;

    const onSaveClick = async () => {
        const success = await handleSave();
        if (success && form) onSave(form);
    };

    const tradeableQualities = form.allowAllTypes 
        ? allQualities 
        : allQualities.filter(q => q.type === QualityType.Item || q.type === QualityType.Equipable);

    const currencyOptions = form.allowAllTypes
        ? allQualities
        : allQualities.filter(q => q.type === QualityType.Counter || q.type === QualityType.Tracker || q.type === QualityType.Item);

    const currentStall = form.stalls[activeStallIndex];

    const addStall = () => {
        const newStall: ShopStall = { id: uuidv4(), name: "New Stall", mode: 'buy', listings: [] };
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

    const addListing = () => {
        if (!currentStall) return;
        const newListing: ShopListing = { id: uuidv4(), qualityId: "", price: "10" };
        updateStall(activeStallIndex, 'listings', [...currentStall.listings, newListing]);
        setExpandedListingId(newListing.id);
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

    const bulkAdd = (category: string) => {
        if (!currentStall || !category) return;
        const itemsToAdd = tradeableQualities.filter(q => q.category?.includes(category));
        const newListings = [...currentStall.listings];
        let addedCount = 0;
        itemsToAdd.forEach(item => {
            if (!newListings.find(l => l.qualityId === item.id)) {
                newListings.push({ id: uuidv4(), qualityId: item.id, price: "10" });
                addedCount++;
            }
        });
        updateStall(activeStallIndex, 'listings', newListings);
        showToast(`Added ${addedCount} items.`, "success");
    };

    const categories = Array.from(new Set(tradeableQualities.map(q => q.category?.split(',')[0].trim()).filter(Boolean)));

    return (
        <div className="h-full flex flex-col relative" style={{ color: 'var(--tool-text-main)', paddingBottom: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--tool-border)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--tool-text-header)' }}>{form.id}</h2>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--tool-text-dim)', fontFamily: 'monospace' }}>v{form.version || 1}</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
                <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                        <SmartArea 
                            label="Display Name" 
                            value={form.name} 
                            onChange={v => handleChange('name', v)} 
                            storyId={storyId} 
                            minHeight="38px" 
                            qualityDefs={allQualities}
                        />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Default Currency</label>
                        <select 
                            value={form.defaultCurrencyId} 
                            onChange={e => handleChange('defaultCurrencyId', e.target.value)} 
                            className="form-select"
                            style={{ height: '40px' }}
                        >
                             <option value="">-- Select Currency --</option>
                             {currencyOptions.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <SmartArea 
                        label="Image/Banner Code" 
                        value={form.image || ''} 
                        onChange={v => handleChange('image', v)} 
                        storyId={storyId} 
                        minHeight="38px" 
                        qualityDefs={allQualities}
                        placeholder="asset_id"
                    />
                </div>

                <div style={{ marginBottom: '2rem', background: 'var(--tool-bg-input)', padding: '0.5rem', borderRadius: '4px', border: '1px dashed var(--tool-border)' }}>
                    <BehaviorCard 
                        checked={form.allowAllTypes || false} 
                        onChange={() => handleChange('allowAllTypes', !form.allowAllTypes)}
                        label="Allow Esoteric Trades"
                        desc="Trade Stats (Pyramidal) and Text Strings, not just Items."
                    />
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem' }}>
                        {form.stalls.map((stall, idx) => (
                            <button 
                                key={stall.id} 
                                onClick={() => setActiveStallIndex(idx)} 
                                style={{ 
                                    padding: '0.5rem 1rem', borderRadius: '4px 4px 0 0', cursor: 'pointer', border: 'none', 
                                    background: activeStallIndex === idx ? 'var(--tool-accent)' : 'var(--tool-bg-dark)', 
                                    color: activeStallIndex === idx ? 'var(--tool-key-black)' : 'var(--tool-text-dim)', 
                                    fontWeight: 'bold' 
                                }}
                            >
                                {stall.name}
                            </button>
                        ))}
                        <button onClick={addStall} style={{ background: 'transparent', border: '1px dashed var(--tool-border)', color: 'var(--tool-text-dim)', borderRadius: '4px', cursor: 'pointer', padding: '0.5rem 1rem' }}>+ New Stall</button>
                    </div>
                </div>
                {currentStall && (
                    <div style={{ background: 'var(--tool-bg-input)', padding: '1.5rem', borderRadius: '0 0 4px 4px', border: '1px solid var(--tool-border)', borderTop: 'none' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                                <div style={{flex: 2}}>
                                    <label className="form-label">Stall Name</label>
                                    <input value={currentStall.name} onChange={e => updateStall(activeStallIndex, 'name', e.target.value)} className="form-input" style={{ fontWeight: 'bold' }} />
                                </div>
                                <div style={{flex: 1}}>
                                    <label className="form-label">Mode</label>
                                    <select value={currentStall.mode} onChange={e => updateStall(activeStallIndex, 'mode', e.target.value)} className="form-select">
                                        <option value="buy">Player Buys</option>
                                        <option value="sell">Player Sells</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ alignSelf: 'end', marginLeft: '1rem' }}>
                                <button onClick={() => removeStall(activeStallIndex)} className="unequip-btn" style={{ width: 'auto', padding: '0.6rem 1rem' }}>Delete Stall</button>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                             <SmartArea 
                                label="Item Source Tag" 
                                value={currentStall.source || ''} 
                                onChange={v => updateStall(activeStallIndex, 'source', v)} 
                                storyId={storyId} 
                                minHeight="38px"
                                placeholder={`bought at ${currentStall.name}`}
                                qualityDefs={allQualities} 
                            />
                        </div>

                        <div style={{ background: 'var(--tool-accent-fade)', padding: '0.5rem', borderRadius: '4px', display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--tool-accent)', fontWeight: 'bold' }}>Bulk Add from Category:</span>
                            <select id="bulk-cat" className="form-select" style={{ width: 'auto', padding: '0.2rem', height: '28px', fontSize: '0.8rem' }}>
                                <option value="">Select Category...</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button 
                                onClick={() => { const sel = document.getElementById('bulk-cat') as HTMLSelectElement; if(sel.value) bulkAdd(sel.value); }} 
                                className="save-btn" 
                                style={{ padding: '0.2rem 0.8rem', fontSize: '0.8rem', height: '28px' }}
                            >
                                Add All
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '30px 3fr 2fr 2fr 30px', gap: '1rem', padding: '0 0.5rem', fontSize: '0.75rem', color: 'var(--tool-text-dim)', textTransform: 'uppercase' }}>
                                <span></span><span>Item</span><span>Price (Logic)</span><span>Currency</span><span></span>
                            </div>
                            
                            {currentStall.listings.map((listing, lIdx) => (
                                <div key={listing.id} style={{ background: 'var(--tool-bg-header)', border: '1px solid var(--tool-border)', borderRadius: '4px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '30px 3fr 2fr 2fr 30px', gap: '1rem', alignItems: 'center', padding: '0.5rem' }}>
                                        
                                        <button onClick={() => setExpandedListingId(expandedListingId === listing.id ? null : listing.id)} style={{ background: 'none', border: 'none', color: 'var(--tool-text-dim)', cursor: 'pointer' }}>
                                            {expandedListingId === listing.id ? '▼' : '▶'}
                                        </button>
                                        
                                        <select value={listing.qualityId} onChange={e => updateListing(lIdx, 'qualityId', e.target.value)} className="form-select">
                                            <option value="">Select Item...</option>
                                            {tradeableQualities.map(q => <option key={q.id} value={q.id}>{q.name} ({q.id})</option>)}
                                        </select>
                                        <SmartArea 
                                            value={listing.price} 
                                            onChange={v => updateListing(lIdx, 'price', v)} 
                                            storyId={storyId} 
                                            minHeight="34px" 
                                            placeholder="10" 
                                            qualityDefs={allQualities}
                                        />
                                        
                                        <select value={listing.currencyId || ""} onChange={e => updateListing(lIdx, 'currencyId', e.target.value || undefined)} className="form-select" style={{ fontSize: '0.85rem', color: listing.currencyId ? 'var(--tool-accent)' : 'var(--tool-text-dim)' }}>
                                            <option value="">Default ({form.defaultCurrencyId})</option>
                                            {currencyOptions.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
                                        </select>
                                        
                                        <button onClick={() => removeListing(lIdx)} style={{ color: 'var(--danger-color)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                                    </div>
                                    
                                    {expandedListingId === listing.id && (
                                        <div style={{ padding: '1rem', borderTop: '1px dashed var(--tool-border)', background: 'rgba(0,0,0,0.2)' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <SmartArea 
                                                    label="Visible If" 
                                                    value={listing.visible_if || ''} 
                                                    onChange={v => updateListing(lIdx, 'visible_if', v)} 
                                                    storyId={storyId} 
                                                    mode="condition" 
                                                    qualityDefs={allQualities}
                                                />
                                                <SmartArea 
                                                    label="Unlock If" 
                                                    value={listing.unlock_if || ''} 
                                                    onChange={v => updateListing(lIdx, 'unlock_if', v)} 
                                                    storyId={storyId} 
                                                    mode="condition" 
                                                    qualityDefs={allQualities}
                                                />
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                     <SmartArea 
                                                        label="Description Override" 
                                                        value={listing.description || ''} 
                                                        onChange={v => updateListing(lIdx, 'description', v)} 
                                                        storyId={storyId} 
                                                        minHeight="60px"
                                                        qualityDefs={allQualities}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <button onClick={addListing} style={{ padding: '0.5rem', border: '1px dashed var(--tool-border)', background: 'transparent', color: 'var(--tool-text-dim)', cursor: 'pointer', borderRadius: '4px' }}>+ Add Item</button>
                        </div>
                    </div>
                )}
            </div>
            <CommandCenter 
                isDirty={isDirty} 
                isSaving={isSaving} 
                lastSaved={lastSaved} 
                onSave={onSaveClick} 
                onRevert={() => setShowRevertModal(true)} 
                onDelete={() => onDelete(form.id)}
                onDuplicate={() => onDuplicate(form)}
                itemType="Market"
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