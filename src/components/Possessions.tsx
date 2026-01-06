// ... (Imports and helper components like MessageModal, FormatBonus, ItemDisplay remain the same) ...
'use client';

import { ImageDefinition, PlayerQualities, QualityDefinition, WorldSettings } from "@/engine/models";
import { useState, useMemo } from "react";
import { useGroupedList } from "@/hooks/useGroupedList";
import GameImage from "./GameImage";
import { evaluateText } from "@/engine/textProcessor";
import { GameEngine } from '@/engine/gameEngine';
import FormattedText from "./FormattedText"; 

interface PossessionsProps {
    qualities: PlayerQualities;
    equipment: Record<string, string | null>;
    qualityDefs: Record<string, QualityDefinition>;
    equipCategories: string[];
    onUpdateCharacter: (character: any) => void; 
    onUseItem: (eventId: string) => void;
    onRequestTabChange: (tab: 'story') => void;
    storyId: string;
    imageLibrary: Record<string, ImageDefinition>;
    settings: WorldSettings;
    engine: GameEngine;
}

// ... (Keep FormatBonus, ItemDisplay, MessageModal as defined previously) ...
// (Omitting them here for brevity, assume they are included)
const FormatBonus = ({ bonusStr, qualityDefs, qualities }: { bonusStr: string, qualityDefs: Record<string, QualityDefinition>, qualities: PlayerQualities }) => {
    const evaluatedBonus = evaluateText(bonusStr, qualities, qualityDefs, null, 0);
    const parts = evaluatedBonus.split(',').map(p => p.trim()).filter(Boolean);

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
            {parts.map((part, idx) => {
                const match = part.match(/^\$?([a-zA-Z0-9_]+)\s*([+\-])\s*(\d+)$/);
                let content = part;
                let color = 'inherit';

                if (match) {
                    const [, qid, op, val] = match;
                    const name = qualityDefs[qid]?.name || qid;
                    content = `${name} ${op}${val}`;
                    color = op === '+' ? 'var(--success-color)' : 'var(--danger-color)';
                }

                return (
                    <span key={idx} style={{ 
                        color: color, 
                        fontWeight: 'bold', 
                        fontSize: '0.85rem',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                    }}>
                        {content}
                    </span>
                );
            })}
        </div>
    );
};

const ItemDisplay = ({ 
    item, 
    isEquipped, 
    slotName, 
    onEquipToggle, 
    onUse, 
    isLoading,
    qualityDefs,
    qualities,
    imageLibrary
}: {
    item: any,
    isEquipped: boolean,
    slotName?: string, 
    onEquipToggle: () => void,
    onUse: (id: string) => void,
    isLoading: boolean,
    qualityDefs: Record<string, QualityDefinition>,
    qualities: PlayerQualities,
    imageLibrary: Record<string, ImageDefinition>
}) => {
    const [expanded, setExpanded] = useState(false);
    
    const isCursed = item.tags?.includes('bound');
    const hasStorylet = !!item.storylet;
    const isEquipable = item.type === 'E';
    
    const fullDesc = item.description || "";
    const showToggle = fullDesc.length > 100;
    const displayDesc = expanded || !showToggle ? fullDesc : fullDesc.substring(0, 100) + "...";

    return (
        <div className="inventory-item card" style={{ 
            border: isEquipped ? '1px solid var(--accent-highlight)' : '1px solid var(--border-color)',
            background: isEquipped ? 'rgba(var(--accent-rgb), 0.05)' : 'var(--bg-card)',
            display: 'flex', flexDirection: 'column', height: '100%'
        }}>
            {slotName && (
                <div style={{ 
                    fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', 
                    color: 'var(--text-muted)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '4px'
                }}>
                    <FormattedText text={slotName} />
                </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                <div style={{ width: '64px', flexShrink: 0 }}>
                    <GameImage 
                        code={item.image || item.id} 
                        imageLibrary={imageLibrary} 
                        alt={item.name} 
                        type="icon" 
                        className="option-image" 
                    />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="item-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div className="item-name" style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)' }}>
                            <FormattedText text={item.name} />
                        </div>
                        {!slotName && <span className="item-count" style={{ fontSize: '0.85rem', opacity: 0.7 }}>x{item.level}</span>}
                    </div>

                    {item.bonus && (
                        <div className="item-bonus" style={{ marginBottom: '8px' }}>
                            <FormatBonus bonusStr={item.bonus} qualityDefs={qualityDefs} qualities={qualities} />
                        </div>
                    )}

                    {fullDesc && (
                        <div className="item-desc" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                            <FormattedText text={displayDesc} />
                            {showToggle && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                                    style={{ 
                                        background: 'none', border: 'none', color: 'var(--accent-highlight)', 
                                        cursor: 'pointer', fontSize: '0.8rem', marginLeft: '5px', padding: 0, textDecoration: 'underline'
                                    }}
                                >
                                    {expanded ? "Less" : "More"}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-light)' }}>
                {isEquipable && (
                    <button 
                        className={isEquipped ? "unequip-btn" : "equip-btn"}
                        onClick={onEquipToggle}
                        disabled={isLoading}
                        style={{ 
                            flex: 1, 
                            cursor: (isEquipped && isCursed) ? 'not-allowed' : 'pointer',
                            opacity: (isEquipped && isCursed) ? 0.8 : 1
                        }}
                    >
                        {isEquipped ? (
                            <>
                                {isCursed && <span style={{ marginRight: '5px' }}>🔒</span>}
                                Unequip
                            </>
                        ) : "Equip"}
                    </button>
                )}
                
                {hasStorylet && (
                    <button 
                        className="option-button"
                        onClick={() => onUse(item.storylet)}
                        disabled={isLoading}
                        style={{ flex: 1, width: 'auto', padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                    >
                        Use
                    </button>
                )}
            </div>
        </div>
    );
};

function MessageModal({ isOpen, message, onClose }: { isOpen: boolean, message: string, onClose: () => void }) {
    if (!isOpen) return null;
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-paper)', 
                padding: '2rem', 
                maxWidth: '450px', 
                width: '90%', 
                border: '2px solid var(--accent-highlight)',
                borderRadius: '8px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                textAlign: 'center'
            }}>
                <h3 style={{ marginTop: 0, color: 'var(--accent-highlight)', fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '2px' }}>Locked</h3>
                <div style={{ margin: '2rem 0', lineHeight: 1.6, fontSize: '1.1rem' }}><FormattedText text={message} /></div>
                <button className="option-button" onClick={onClose} style={{ width: 'auto', padding: '0.8rem 3rem' }}>Dismiss</button>
            </div>
        </div>
    );
}

export default function Possessions({ 
    qualities, 
    equipment, 
    qualityDefs, 
    equipCategories,
    onUpdateCharacter,
    onUseItem,
    onRequestTabChange,
    storyId,
    imageLibrary,
    settings,
    engine
}: PossessionsProps) {
    
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [groupBy, setGroupBy] = useState("category");
    const [modalState, setModalState] = useState({ isOpen: false, message: "" });

    const currencyIds = (settings.currencyQualities || []).map(c => c.replace('$', '').trim());

    // --- EXPAND SLOTS LOGIC ---
    const expandedSlots = useMemo(() => {
        const slots: { id: string, label: string, category: string }[] = [];
        
        equipCategories.forEach(catRaw => {
            let cat = catRaw.trim();
            let count = 1;
            let isInfinite = false;

            if (cat.endsWith('*')) {
                // Infinite Slots (e.g. "Buff*")
                cat = cat.slice(0, -1);
                isInfinite = true;
            } else if (cat.match(/\*\d+$/)) {
                // Fixed Multiplicity (e.g. "Ring*2")
                const parts = cat.split('*');
                count = parseInt(parts.pop() || "1", 10);
                cat = parts.join('*');
            }

            if (isInfinite) {
                // Find all currently occupied slots of this type in equipment
                // e.g. Buff_1, Buff_5
                const usedIndices: number[] = [];
                Object.keys(equipment).forEach(key => {
                    if (key.startsWith(`${cat}_`)) {
                        const parts = key.split('_');
                        const idx = parseInt(parts[parts.length - 1], 10);
                        if (!isNaN(idx)) usedIndices.push(idx);
                    }
                });
                
                // Sort and determine display
                usedIndices.sort((a,b) => a - b);
                
                // Add all used slots
                usedIndices.forEach(i => {
                    slots.push({ id: `${cat}_${i}`, label: `${cat} ${i}`, category: cat });
                });
                
                // Add one empty slot at the end
                const nextIdx = (usedIndices.length > 0 ? Math.max(...usedIndices) : 0) + 1;
                slots.push({ id: `${cat}_${nextIdx}`, label: `${cat} ${nextIdx}`, category: cat });

            } else if (count > 1) {
                // Fixed Count
                for(let i=1; i<=count; i++) {
                    slots.push({ id: `${cat}_${i}`, label: `${cat} ${i}`, category: cat });
                }
            } else {
                // Single Slot
                slots.push({ id: cat, label: cat, category: cat });
            }
        });
        return slots;
    }, [equipCategories, equipment]);

    const handleEquipToggle = async (slot: string, itemId: string | null) => {
        if (isLoading) return;
        setIsLoading(true);
        
        // Handle equipping into "Infinite" or "Multiple" categories (e.g. clicking 'Equip' on a Ring)
        // If 'slot' is a base category (like "Ring") but the actual slots are "Ring_1", "Ring_2"...
        // We need to find the first empty one.
        let targetSlot = slot;
        
        // If we are EQUIPPING (itemId is present) and the slot isn't a specific key in expandedSlots
        // We try to auto-assign
        if (itemId) {
            const exactSlotExists = expandedSlots.some(s => s.id === slot);
            
            if (!exactSlotExists) {
                // Try to find empty slot matching this category
                const emptySlot = expandedSlots.find(s => s.category === slot && !equipment[s.id]);
                if (emptySlot) {
                    targetSlot = emptySlot.id;
                } else {
                    // All full? Overwrite the first one? Or show error?
                    // Default behavior: Overwrite first one unless infinite.
                    // For infinite, expandedSlots always has an empty one at the end, so we should have found it.
                    // For fixed *2, if both full, overwrite #1.
                    const firstSlot = expandedSlots.find(s => s.category === slot);
                    if (firstSlot) targetSlot = firstSlot.id;
                }
            }
        }

        try {
            const res = await fetch('/api/character/equip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, slot: targetSlot, itemId })
            });
            
            const data = await res.json();
            
            if (data.success) {
                onUpdateCharacter(data.character);
            } else if (data.isLocked) {
                setModalState({ isOpen: true, message: data.error });
            } else {
                alert(data.error);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUse = (eventId: string) => {
        if (!eventId) return;
        onUseItem(eventId);
        onRequestTabChange('story');
    };

    const inventoryItems = useMemo(() => {
        const equippedIds = new Set(Object.values(equipment).filter(Boolean));

        return Object.keys(qualities)
            .map(qid => {
                if (currencyIds.includes(qid)) return null;
                if (equippedIds.has(qid)) return null;

                const def = qualityDefs[qid];
                const state = qualities[qid];
                if (!def || !state) return null;

                const level = ('level' in state) ? state.level : 0;
                if (level <= 0) return null;

                if (def.type !== 'I' && def.type !== 'E') return null;
                
                const merged = { ...def, ...state, level };
                return engine.render(merged);
            })
            .filter(Boolean as any);
    }, [qualities, qualityDefs, equipment, currencyIds, engine]);

    const grouped = useGroupedList(inventoryItems, groupBy, search);
    const groups = Object.keys(grouped).sort();

    return (
        <div className="possessions-container">
            <MessageModal 
                isOpen={modalState.isOpen} 
                message={modalState.message} 
                onClose={() => setModalState({ isOpen: false, message: "" })} 
            />

            {/* EQUIPMENT SECTION (Hide if empty) */}
            {expandedSlots.length > 0 && (
                <>
                    <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Equipment</h2>
                    <div className="equipment-grid" style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                        gap: '1rem',
                        marginBottom: '3rem' 
                    }}>
                        {expandedSlots.map(slotObj => {
                            const slotId = slotObj.id;
                            const equippedId = equipment[slotId];
                            let equippedItem = null;
                            
                            if (equippedId && qualityDefs[equippedId]) {
                                equippedItem = engine.render({ ...qualityDefs[equippedId], ...qualities[equippedId] });
                            }

                            if (equippedItem) {
                                return (
                                    <ItemDisplay 
                                        key={slotId}
                                        item={equippedItem}
                                        isEquipped={true}
                                        slotName={slotObj.label}
                                        onEquipToggle={() => handleEquipToggle(slotId, null)}
                                        onUse={handleUse}
                                        isLoading={isLoading}
                                        qualityDefs={qualityDefs}
                                        qualities={qualities}
                                        imageLibrary={imageLibrary}
                                    />
                                );
                            } else {
                                return (
                                    <div key={slotId} className="inventory-item card empty" style={{ 
                                        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                                        border: '1px dashed var(--border-light)', background: 'rgba(0,0,0,0.1)', minHeight: '120px'
                                    }}>
                                        <span style={{ textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                            <FormattedText text={slotObj.label} />
                                        </span>
                                        <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Empty</span>
                                    </div>
                                );
                            }
                        })}
                    </div>
                </>
            )}

            {/* INVENTORY */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
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

            {groups.map(group => (
                <div key={group} style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-highlight)', marginBottom: '1rem', textTransform: 'uppercase', borderLeft: '3px solid var(--accent-highlight)', paddingLeft: '0.5rem' }}>
                        <FormattedText text={group} />
                    </h3>
                    
                    <div className="inventory-grid" style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                        gap: '1rem' 
                    }}>
                        {grouped[group].map((item: any) => (
                            <ItemDisplay 
                                key={item.id}
                                item={item}
                                isEquipped={false}
                                onEquipToggle={() => handleEquipToggle(item.category || '', item.id)}
                                onUse={handleUse}
                                isLoading={isLoading}
                                qualityDefs={qualityDefs}
                                qualities={qualities}
                                imageLibrary={imageLibrary}
                            />
                        ))}
                    </div>
                </div>
            ))}
            
            {inventoryItems.length === 0 && <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>Your pockets are empty.</p>}
        </div>
    );
}