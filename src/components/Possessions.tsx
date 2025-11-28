'use client';

import { ImageDefinition, PlayerQualities, QualityDefinition } from "@/engine/models";
import { useState, useMemo } from "react";
import { useGroupedList } from "@/hooks/useGroupedList";
import GameImage from "./GameImage";

interface PossessionsProps {
    qualities: PlayerQualities;
    equipment: Record<string, string | null>;
    qualityDefs: Record<string, QualityDefinition>;
    equipCategories: string[];
    onUpdateCharacter: (character: any) => void; 
    storyId: string;
    imageLibrary: Record<string, ImageDefinition>;
}

const formatBonus = (bonusStr: string, qualityDefs: Record<string, QualityDefinition>) => {
    return bonusStr.split(',').map(part => {
        const match = part.trim().match(/^\$([a-zA-Z0-9_]+)\s*([+\-])\s*(\d+)$/);
        if (match) {
            const [, qid, op, val] = match;
            const name = qualityDefs[qid]?.name || qid; 
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
    const [search, setSearch] = useState("");
    const [groupBy, setGroupBy] = useState("category");

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

    // 1. Prepare Data
    const inventoryItems = useMemo(() => {
        return Object.keys(qualities)
            .map(qid => {
                const def = qualityDefs[qid];
                const state = qualities[qid];
                if (!def || !state) return null;
                const level = ('level' in state) ? state.level : 0;
                if (level <= 0) return null;
                if (def.type !== 'I' && def.type !== 'E') return null;
                
                return { ...def, ...state, level };
            })
            .filter(Boolean as any);
    }, [qualities, qualityDefs]);

    // 2. Group & Filter
    const grouped = useGroupedList(inventoryItems, groupBy, search);
    const groups = Object.keys(grouped).sort();

    return (
        <div className="possessions-container">
            {/* EQUIPMENT SECTION */}
            <h2 style={{ marginBottom: '1rem' }}>Equipment</h2>
            <div className="equipment-slots">
                {equipCategories.map(slot => {
                    const equippedId = equipment[slot];
                    const equippedItem = equippedId ? qualityDefs[equippedId] : null;

                    return (
                        <div key={slot} className="equip-slot">
                            <span className="slot-label">{slot}</span>
                            
                            {equippedItem ? (
                                <div className="equipped-item">
                                    <div style={{ margin: '0.5rem auto', width: '60px' }}>
                                        <GameImage 
                                            code={equippedItem.image || equippedItem.id} 
                                            imageLibrary={imageLibrary}
                                            alt=""
                                            type="icon"
                                            className="option-image"
                                        />
                                    </div>
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
                                <span className="empty-slot" style={{ padding: '1rem', color: 'var(--border-light)', fontStyle: 'italic' }}>Empty</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* INVENTORY HEADER & FILTERS */}
            <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>Inventory</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search items..."
                        className="form-input"
                        style={{ width: '200px', padding: '0.4rem' }}
                    />
                    <select 
                        value={groupBy}
                        onChange={e => setGroupBy(e.target.value)}
                        className="form-select"
                        style={{ width: '120px', padding: '0.4rem' }}
                    >
                        <option value="category">Category</option>
                        <option value="type">Type</option>
                    </select>
                </div>
            </div>

            {/* INVENTORY GRID */}
            {groups.map(group => (
                <div key={group} style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-highlight)', marginBottom: '1rem', textTransform: 'uppercase', borderLeft: '3px solid var(--accent-highlight)', paddingLeft: '0.5rem' }}>{group}</h3>
                    
                    <div className="inventory-grid">
                        {grouped[group].map((item: any) => {
                            const isEquipable = item.type === 'E';
                            const category = item.category || '';
                            const isEquipped = Object.values(equipment).includes(item.id);

                            return (
                                <div key={item.id} className="inventory-item card">
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ width: '50px', flexShrink: 0 }}>
                                            <GameImage 
                                                code={item.image || item.id} // Use Image Property
                                                imageLibrary={imageLibrary} 
                                                alt="" 
                                                type="icon" 
                                                className="option-image" 
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
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
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '1rem' }}>
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
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
            
            {inventoryItems.length === 0 && <p style={{ color: '#777', fontStyle: 'italic' }}>Your pockets are empty.</p>}
        </div>
    );
}