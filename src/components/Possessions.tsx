'use client';

import { ImageDefinition, PlayerQualities, QualityDefinition } from "@/engine/models";
import { useState } from "react";

interface PossessionsProps {
    qualities: PlayerQualities;
    equipment: Record<string, string | null>;
    qualityDefs: Record<string, QualityDefinition>;
    equipCategories: string[];
    onUpdateCharacter: (character: any) => void; // Callback to update parent state
    storyId: string;
    imageLibrary: Record<string, ImageDefinition>;
}

const formatBonus = (bonusStr: string, qualityDefs: Record<string, QualityDefinition>) => {
    return bonusStr.split(',').map(part => {
        // Match "$qid + 5"
        const match = part.trim().match(/^\$([a-zA-Z0-9_]+)\s*([+\-])\s*(\d+)$/);
        if (match) {
            const [, qid, op, val] = match;
            const name = qualityDefs[qid]?.name || qid; // Look up friendly name
            return `${name} ${op}${val}`;
        }
        return part;
    }).join(', ');
};


export default function Possessions({ 
    qualities, 
    equipment, 
    qualityDefs, 
    equipCategories,
    onUpdateCharacter,
    storyId,
    imageLibrary
}: PossessionsProps) {
    
    const [isLoading, setIsLoading] = useState(false);

    const handleEquipToggle = async (slot: string, itemId: string | null) => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/character/equip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, slot, itemId })
            });
            
            const data = await res.json();
            if (res.ok) {
                onUpdateCharacter(data.character);
            } else {
                alert(data.error);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter qualities to find items (I) and equipables (E)
    const inventoryItems = Object.keys(qualities)
        .map(qid => {
            const def = qualityDefs[qid];
            const state = qualities[qid];
            if (!def || !state) return null;
            // Only show items/equipables that you actually have (>0)
            const level = ('level' in state) ? state.level : 0;
            if (level <= 0) return null;
            if (def.type !== 'I' && def.type !== 'E') return null;
            
            return { ...def, ...state, level };
        })
        .filter(Boolean as any);

    return (
        <div className="possessions-container">
            <h2>Equipment</h2>
            <div className="equipment-slots">
                {equipCategories.map(slot => {
                    const equippedId = equipment[slot];
                    const equippedItem = equippedId ? qualityDefs[equippedId] : null;

                    return (
                        <div key={slot} className="equip-slot">
                            <span className="slot-label">{slot.toUpperCase()}</span>
                            {equippedItem ? (
                                <div className="equipped-item">
                                    <strong>{equippedItem.name}</strong>
                                    <button 
                                        className="unequip-btn"
                                        onClick={() => handleEquipToggle(slot, null)}
                                        disabled={isLoading}
                                    >
                                        Unequip
                                    </button>
                                </div>
                            ) : (
                                <span className="empty-slot">Empty</span>
                            )}
                        </div>
                    );
                })}
            </div>

            <h2 style={{ marginTop: '2rem' }}>Inventory</h2>
            <div className="inventory-grid">
                {inventoryItems.map((item: any) => {
                    const isEquipable = item.type === 'E';
                    const category = item.category || '';
                    
                    // Check if this item is currently equipped anywhere
                    const isEquipped = Object.values(equipment).includes(item.id);

                    return (
                        <div key={item.id} className="inventory-item card">
                            <div className="item-header">
                                <strong>{item.name}</strong>
                                <span className="item-count">x{item.level}</span>
                            </div>
                            <p className="item-desc">{item.description}</p>
                            
                            {item.bonus && (
                                <p className="item-bonus">
                                    {formatBonus(item.bonus, qualityDefs)}
                                </p>
                            )}

                            {isEquipable && !isEquipped && (
                                <button 
                                    className="equip-btn"
                                    onClick={() => handleEquipToggle(category, item.id)}
                                    disabled={isLoading}
                                >
                                    Equip
                                </button>
                            )}
                            {isEquipped && <span className="equipped-badge">Equipped</span>}
                        </div>
                    );
                })}
                {inventoryItems.length === 0 && <p>You have no possessions.</p>}
            </div>
        </div>
    );
}