'use client';

import { useState, useMemo } from 'react';
import { MarketDefinition, PlayerQualities, QualityDefinition, ShopListing, ImageDefinition, WorldSettings } from '@/engine/models';
import { evaluateText, evaluateCondition } from '@/engine/textProcessor';
import GameImage from './GameImage';
import { GameEngine } from '@/engine/gameEngine'; // Need logic to calc price client-side preview

interface Props {
    market: MarketDefinition;
    qualities: PlayerQualities;
    qualityDefs: Record<string, QualityDefinition>;
    imageLibrary: Record<string, ImageDefinition>;
    settings: WorldSettings;
    onClose: () => void;
    onUpdate: (newQualities: PlayerQualities) => void;
    storyId: string;
    characterId: string;
    worldState: PlayerQualities; 
}

export default function MarketInterface({ market, qualities, qualityDefs, imageLibrary, settings, onClose, onUpdate, storyId, characterId, worldState }: Props) {
    const [activeStallIndex, setActiveStallIndex] = useState(0);
    const [selectedListing, setSelectedListing] = useState<ShopListing | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);

    const currentStall = market.stalls[activeStallIndex];

    // --- HELPER: Calculate Prices Client-Side for Preview ---
    // We construct a temp engine just for evaluating math strings
    const engine = useMemo(() => new GameEngine(qualities, { settings, qualities: qualityDefs } as any, {}, worldState), [qualities, qualityDefs, settings, worldState]);

    const getPrice = (priceExpr: string) => {
        const val = engine.evaluateBlock(`{${priceExpr}}`);
        return parseInt(val, 10) || 0;
    };

    // --- HANDLE BUY/SELL ---
    const handleTransaction = async () => {
        if (!selectedListing || isProcessing) return;
        setIsProcessing(true);

        try {
            const res = await fetch('/api/market/transact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storyId,
                    characterId,
                    marketId: market.id,
                    stallId: currentStall.id,
                    listingId: selectedListing.id,
                    quantity
                })
            });
            
            const data = await res.json();
            if (res.ok) {
                onUpdate(data.newQualities);
                setSelectedListing(null); // Close modal
                setQuantity(1);
            } else {
                alert(data.error);
            }
        } catch (e) {
            console.error(e);
            alert("Transaction failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="storylet-container" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column', width: '100%' }}>
            
            {/* HEADER */}
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {market.image && (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden' }}>
                            <GameImage code={market.image} imageLibrary={imageLibrary} type="location" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <h2 style={{ margin: 0 }}>{market.name}</h2>
                </div>
                    <button onClick={onClose} className="unequip-btn" style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>
                        Leave Shop
                </button>
            </div>


            {/* STALL TABS */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
                {market.stalls.map((stall, idx) => (
                    <button 
                        key={stall.id}
                        onClick={() => setActiveStallIndex(idx)}
                        style={{ 
                            padding: '0.75rem 1.5rem', 
                            background: activeStallIndex === idx ? 'var(--accent-primary)' : 'var(--bg-item)',
                            color: activeStallIndex === idx ? 'white' : 'var(--text-muted)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            fontSize: '0.8rem'
                        }}
                    >
                        {stall.name}
                    </button>
                ))}
            </div>

            {/* LISTINGS GRID */}
            {currentStall && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {currentStall.listings.map(listing => {
                        // Check requirements
                        if (listing.visible_if && !evaluateCondition(listing.visible_if, qualities)) return null;
                        const isLocked = listing.unlock_if && !evaluateCondition(listing.unlock_if, qualities);

                        const itemDef = qualityDefs[listing.qualityId];
                        const currencyId = listing.currencyId || market.defaultCurrencyId;
                        const currencyDef = qualityDefs[currencyId];
                        const price = getPrice(listing.price);

                        // Inventory check for UI disabling
                        let canAfford = true;
                        if (currentStall.mode === 'buy') {
                            const funds = (qualities[currencyId] as any)?.level || 0;
                            if (funds < price) canAfford = false;
                        } else {
                            const owned = (qualities[listing.qualityId] as any)?.level || 0;
                            if (owned < 1) canAfford = false;
                        }

                        if (!itemDef) return null;

                        return (
                            <div 
                                key={listing.id} 
                                className={`card ${isLocked ? 'locked' : ''}`}
                                onClick={() => !isLocked && setSelectedListing(listing)}
                                style={{ padding: '1rem', opacity: isLocked ? 0.6 : 1, cursor: isLocked ? 'not-allowed' : 'pointer' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <GameImage code={itemDef.image || itemDef.id} imageLibrary={imageLibrary} type="icon" className="option-image" style={{ width: 40, height: 40 }} />
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 'bold', color: canAfford && !isLocked ? 'var(--success-color)' : 'var(--danger-color)' }}>
                                            {price}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#aaa', textTransform: 'uppercase' }}>
                                            {currencyDef?.name || currencyId}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.25rem' }}>{itemDef.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {listing.description || itemDef.description}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* TRANSACTION MODAL */}
            {selectedListing && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '2rem', borderRadius: '8px', width: '400px' }}>
                        <h3 style={{ marginTop: 0, textAlign: 'center' }}>
                            {currentStall.mode === 'buy' ? 'Buy' : 'Sell'} {qualityDefs[selectedListing.qualityId]?.name}
                        </h3>
                        
                        <div style={{ margin: '2rem 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span>Quantity</span>
                                <span>{quantity}</span>
                            </div>
                            <input 
                                type="range" 
                                min="1" 
                                max="100" // In a real app, calculate max affordable/max owned here
                                value={quantity} 
                                onChange={e => setQuantity(parseInt(e.target.value))} 
                                style={{ width: '100%' }} 
                            />
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.2rem' }}>
                            Total: <span style={{ color: 'var(--accent-highlight)', fontWeight: 'bold' }}>
                                {getPrice(selectedListing.price) * quantity}
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setSelectedListing(null)} className="unequip-btn" style={{ flex: 1 }}>Cancel</button>
                            <button onClick={handleTransaction} disabled={isProcessing} className="save-btn" style={{ flex: 1 }}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}