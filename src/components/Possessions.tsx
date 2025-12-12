'use client';

import { ImageDefinition, PlayerQualities, QualityDefinition, WorldSettings } from "@/engine/models";
import { useState, useMemo } from "react";
import { useGroupedList } from "@/hooks/useGroupedList";
import GameImage from "./GameImage";
import { evaluateText } from "@/engine/textProcessor";

interface PossessionsProps {
    qualities: PlayerQualities;
    equipment: Record<string, string | null>;
    qualityDefs: Record<string, QualityDefinition>;
    equipCategories: string[];
    onUpdateCharacter: (character: any) => void; 
    storyId: string;
    imageLibrary: Record<string, ImageDefinition>;
    settings: WorldSettings;
}

const formatBonus = (bonusStr: string, qualityDefs: Record<string, QualityDefinition>, qualities: PlayerQualities) => {
    // We also need to evaluate the bonus string in case it has logic
    const evaluatedBonus = evaluateText(bonusStr, qualities, qualityDefs, null, 0);

    return evaluatedBonus.split(',').map(part => {
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
    imageLibrary,
    settings
}: PossessionsProps) {
    
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [groupBy, setGroupBy] = useState("category");
    const currencyIds = (settings.currencyQualities || []).map(c => c.replace('$', '').trim());

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
        // --- FIX START ---
        // First, create a set of all currently equipped item IDs for quick lookup.
        const equippedIds = new Set(Object.values(equipment).filter(Boolean));

        return Object.keys(qualities)
            .map(qid => {
                // Exclude currencies and system qualities as before
                if (currencyIds.includes(qid)) return null;

                // --- NEW LOGIC: Exclude equipped items from the inventory list ---
                if (equippedIds.has(qid)) return null;

                const def = qualityDefs[qid];
                const state = qualities[qid];
                if (!def || !state) return null;

                const level = ('level' in state) ? state.level : 0;
                if (level <= 0) return null;

                // Only show Items and Equipables in this list
                if (def.type !== 'I' && def.type !== 'E') return null;
                
                return { ...def, ...state, level };
            })
            .filter(Boolean as any);
    // Add `equipment` to the dependency array so the list re-renders when you equip/unequip
    }, [qualities, qualityDefs, equipment, currencyIds]);
    // --- FIX END ---

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
                    // Look up the definition to check properties
                    const equippedDef = equippedId ? qualityDefs[equippedId] : null;

                    // Check for 'cursed' property (assuming properties is a comma-separated string)
                    const isCursed = equippedDef?.tags?.includes('cursed');

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
                                    {equippedId && (
                                        <button 
                                            className="unequip-btn"
                                            onClick={() => handleEquipToggle(slot, null)}
                                            disabled={isLoading || isCursed} // Disable if cursed
                                            style={isCursed ? { opacity: 0.5, cursor: 'not-allowed', background: '#555' } : {}}
                                        >
                                            {isCursed ? "Cursed" : "Unequip"}
                                        </button>
                                    )}
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
                            
                            const displayName = evaluateText(item.name, qualities, qualityDefs, { qid: item.id, state: item }, 0);
                            const displayDesc = evaluateText(item.description, qualities, qualityDefs, { qid: item.id, state: item }, 0);

                            return (
                                <div key={item.id} className="inventory-item card">
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ width: '50px', flexShrink: 0 }}>
                                            <GameImage 
                                                code={item.image || item.id} 
                                                imageLibrary={imageLibrary} 
                                                alt="" 
                                                type="icon" 
                                                className="option-image" 
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div className="item-header">
                                                {/* --- FIX 3: Use the evaluated variables --- */}
                                                <strong>{displayName}</strong>
                                                <span className="item-count">x{item.level}</span>
                                            </div>
                                            <p className="item-desc">{displayDesc}</p>
                                            
                                            {item.bonus && (
                                                <p className="item-bonus">
                                                    {formatBonus(item.bonus, qualityDefs, qualities)}
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