'use client';

import { CharacterDocument, ImageDefinition, PlayerQualities, QualityDefinition, WorldSettings } from "@/engine/models";
import { useState, useMemo, useEffect, useRef } from "react";
import { useGroupedList } from "@/hooks/useGroupedList";
import GameImage from "./GameImage";
import { evaluateText } from "@/engine/textProcessor";
import { GameEngine } from '@/engine/gameEngine';
import FormattedText from "./FormattedText"; 
import GameModal from "./GameModal";

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
    showHidden?: boolean;
    onAutofire?: (storyletId: string) => void;
    isGuestMode?: boolean;
    character?: CharacterDocument;
}

const FormatBonus = ({ bonusStr, engine }: { bonusStr: string, engine: GameEngine }) => {
    if (!bonusStr) return null;
    
    const evaluatedBonus = engine.evaluateText(bonusStr);
    const parts = evaluatedBonus.split(',').map(p => p.trim()).filter(Boolean);
    
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
            {parts.map((part, idx) => {
                // Regex matches "$quality + 1", "quality + 1", "$quality -2", "quality- 2", etc.
                // Makes the sign and number optional for flexibility.
                const match = part.match(/^\$?(.+?)\s*([+\-])\s*(\d+)$/);
                let content = part;
                let color = 'inherit';
                
                if (match) {
                    const [, nameRaw, op, val] = match;
                    let displayName = nameRaw;

                    const def = engine.worldContent.qualities[nameRaw];
                    
                    if (def && def.name) {
                        displayName = engine.evaluateText(def.name);
                    } 
                    
                    content = `${displayName} ${op}${val}`;
                    color = op === '+' ? 'var(--success-color)' : 'var(--danger-color)';
                }
                
                return (
                    <span key={idx} style={{ 
                        color, 
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
    item, isEquipped, slotName, onEquipToggle, onUse, isLoading, qualityDefs, qualities, imageLibrary, 
    styleMode, shapeConfig, portraitMode, engine 
}: any) => {
    const [expanded, setExpanded] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        if(showMenu) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showMenu]);

    const isCursed = item.tags?.includes('bound');
    const hasStorylet = !!item.storylet;
    const isEquipable = item.type === 'E';
    
    const fullDesc = item.description || "";
    const showToggle = fullDesc.length > 100;
    const displayDesc = expanded || !showToggle ? fullDesc : fullDesc.substring(0, 100) + "...";
    const activeStyle = styleMode || 'standard';
    const isIconGrid = activeStyle === 'icon-grid';
    const isPortrait = activeStyle === 'portrait';
    const isList = activeStyle === 'list';
    let capabilityClass = "";
    if (isEquipable && hasStorylet) capabilityClass = "can-both";
    else if (isEquipable) capabilityClass = "can-equip";
    else if (hasStorylet) capabilityClass = "can-use";
    const portraitVariantClass = isPortrait ? (portraitMode === 'cover' ? 'variant-cover' : 'variant-icon') : '';
    const canEquip = isEquipable;
    const canUse = hasStorylet;

    const handleGridClick = () => {
        if (canEquip && canUse) setShowMenu(true);
        else if (canEquip) onEquipToggle();
        else if (canUse) onUse(item.storylet);
    };

    return (
        <div className={`inventory-item style-${activeStyle} ${capabilityClass} ${portraitVariantClass}`} style={{ 
            borderColor: isEquipped ? 'var(--accent-highlight)' : undefined,
        }}>
            
            {isIconGrid && (
                <>
                    <div className="item-image-container">
                         <GameImage 
                            code={item.image || item.id} 
                            imageLibrary={imageLibrary} 
                            alt={item.name} 
                            type="icon" 
                            className="option-image" 
                            shapeOverride={shapeConfig} 
                        />
                    </div>
                    {slotName && <div className="slot-header-overlay"><FormattedText text={slotName} /></div>}
                    <div className="item-overlay-title">
                        <FormattedText text={item.name} />
                        {item.level > 1 && <span style={{marginLeft:'4px', opacity:0.8}}>x{item.level}</span>}
                    </div>
                    {showMenu && (
                         <div className="interaction-menu" ref={menuRef} onClick={(e) => e.stopPropagation()}>
                            {canEquip && <button className="menu-btn" onClick={() => { onEquipToggle(); setShowMenu(false); }}>{isEquipped ? "Unequip" : "Equip"}</button>}
                            {canUse && <button className="menu-btn" onClick={() => { onUse(item.storylet); setShowMenu(false); }}>Use</button>}
                            <button className="menu-btn" style={{border:'none', background:'none', color:'#aaa'}} onClick={() => setShowMenu(false)}>Cancel</button>
                         </div>
                    )}
                    {!showMenu && <button onClick={handleGridClick} style={{ position:'absolute', inset:0, background:'transparent', border:'none', cursor:'pointer', zIndex: 10 }} title="Interact" />}
                </>
            )}
            {!isIconGrid && (
                <>
                    {slotName && (
                        <div className="slot-header">
                            <FormattedText text={slotName} />
                        </div>
                    )}
                    {isPortrait ? (
                        <>
                            <div className="item-image-container">
                                <GameImage 
                                    code={item.image || item.id} 
                                    imageLibrary={imageLibrary} 
                                    alt={item.name} 
                                    type={portraitMode === 'cover' ? 'cover' : 'storylet'} 
                                    className="option-image" 
                                    shapeOverride={shapeConfig} 
                                />
                            </div>
                            <div className="item-text">
                                <div className="item-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <div className="item-name" style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)' }}><FormattedText text={item.name} /></div>
                                    {!slotName && item.level > 1 && <span className="item-count" style={{ fontSize: '0.85rem', opacity: 0.7 }}>x{item.level}</span>}
                                </div>
                                {item.bonus && <div className="item-bonus"><FormatBonus bonusStr={item.bonus} engine={engine} /></div>}
                                {fullDesc && (
                                    <div className="item-desc" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                        <FormattedText text={displayDesc} />
                                        {showToggle && <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} style={{ background: 'none', border: 'none', color: 'var(--accent-highlight)', cursor: 'pointer', fontSize: '0.8rem', marginLeft: '5px', padding: 0, textDecoration: 'underline' }}>{expanded ? "Less" : "More"}</button>}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="item-main-body">
                            <div className="item-image-container">
                                <GameImage 
                                    code={item.image || item.id} 
                                    imageLibrary={imageLibrary} 
                                    alt={item.name} 
                                    type="icon" 
                                    className="option-image" 
                                    shapeOverride={shapeConfig} 
                                    style={{ width:'100%', height:'100%' }}
                                />
                            </div>
                            <div className="item-text">
                                <div className="item-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <div className="item-name" style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)' }}><FormattedText text={item.name} /></div>
                                    {!slotName && item.level > 1 && <span className="item-count" style={{ fontSize: '0.85rem', opacity: 0.7 }}>x{item.level}</span>}
                                </div>
                                {item.bonus && <div className="item-bonus"><FormatBonus bonusStr={item.bonus} engine={engine} /></div>}
                                {!isList && fullDesc && (
                                    <div className="item-desc" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                        <FormattedText text={displayDesc} />
                                        {showToggle && <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} style={{ background: 'none', border: 'none', color: 'var(--accent-highlight)', cursor: 'pointer', fontSize: '0.8rem', marginLeft: '5px', padding: 0, textDecoration: 'underline' }}>{expanded ? "Less" : "More"}</button>}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {(canEquip || canUse) && (
                        <div className="item-actions">
                            {canEquip && (
                                <button 
                                    className={isEquipped ? "unequip-btn" : "equip-btn"}
                                    onClick={onEquipToggle}
                                    disabled={isLoading}
                                    style={{ flex: 1, cursor: (isEquipped && isCursed) ? 'not-allowed' : 'pointer', opacity: (isEquipped && isCursed) ? 0.8 : 1 }}
                                >
                                    {isEquipped ? (isCursed ? "🔒 Unequip" : "Unequip") : "Equip"}
                                </button>
                            )}
                            {canUse && (
                                <button className="option-button" onClick={() => onUse(item.storylet)} disabled={isLoading} style={{ flex: 1, width: 'auto', padding: '0.4rem 1rem', fontSize: '0.9rem' }}>Use</button>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// Deprecated message modal before I had a universal one
function MessageModal({ isOpen, message, onClose }: { isOpen: boolean, message: string, onClose: () => void }) {
    if (!isOpen) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ backgroundColor: 'var(--bg-panel)', padding: '2rem', maxWidth: '450px', width: '90%', border: '2px solid var(--accent-highlight)', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)', textAlign: 'center' }}>
                <h3 style={{ marginTop: 0, color: 'var(--accent-highlight)' }}>Locked</h3>
                <div style={{ margin: '2rem 0' }}><FormattedText text={message} /></div>
                <button className="option-button" onClick={onClose}>Dismiss</button>
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
    engine, 
    showHidden, 
    onAutofire,
    isGuestMode,
    character
}: PossessionsProps) {
    
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [groupBy, setGroupBy] = useState("category");
    const [modalState, setModalState] = useState({ isOpen: false, message: "" });
    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, title: string, message: string }>({ isOpen: false, title: "", message: "" });
    const currencyIds = (settings.currencyQualities || []).map(c => c.replace('$', '').trim());
    const invStyle = settings.componentConfig?.inventoryStyle || 'standard';
    const sizeSetting = settings.componentConfig?.inventoryCardSize || 'medium';
    const portraitMode = settings.componentConfig?.inventoryPortraitMode || 'cover';
    const invShape = settings.imageConfig?.inventory || 'default';

    const sizeMap: Record<string, string> = { 'small': '160px', 'medium': '220px', 'large': '340px' };
    const itemWidth = sizeMap[sizeSetting] || '220px';
    const isList = invStyle === 'list';
    
    const styleVariables = { 
        '--inv-item-width': itemWidth,
    } as React.CSSProperties;

    const expandedSlots = useMemo(() => {
        // Use a Map to deduplicate slots by ID to prevent React key collisions and ghost slots
        // if the user accidentally defines overlapping categories (e.g. "Ring" and "Ring*2")
        const slotMap = new Map<string, { id: string, label: string, category: string, order: number }>();
        let globalOrder = 0;

        equipCategories.forEach(catRaw => {
            let cat = catRaw.trim();
            let count = 1;
            let isInfinite = false;
            
            // Regex handles optional whitespace: "Ring * 2" or "Ring*2"
            const infiniteMatch = cat.match(/^(.+?)\s*\*\s*$/);
            const countedMatch = cat.match(/^(.+?)\s*\*\s*(\d+)$/);

            if (infiniteMatch) {
                cat = infiniteMatch[1];
                isInfinite = true;
            } else if (countedMatch) {
                cat = countedMatch[1];
                count = parseInt(countedMatch[2], 10);
            }
            
            if (isInfinite) {
                // Determine max index currently used
                const indices = new Set<number>();
                indices.add(1); 

                // Check base/legacy
                if (equipment[cat]) indices.add(1);
                if (equipment[`${cat}_1`]) indices.add(1);
                
                // Check indexed slots
                Object.keys(equipment).forEach(key => {
                    if (key.startsWith(`${cat}_`)) {
                        const suffix = key.substring(cat.length + 1);
                        const idx = parseInt(suffix, 10);
                        if (!isNaN(idx)) indices.add(idx);
                    }
                });

                const max = Math.max(...Array.from(indices));
                
                // Render 1 to max + 1
                for (let i = 1; i <= max + 1; i++) {
                    const id = i === 1 ? cat : `${cat}_${i}`;
                    slotMap.set(id, { id, label: `${cat} ${i}`, category: cat, order: globalOrder++ });
                }

            } else if (count > 1) {
                // Render 1 to count
                for (let i = 1; i <= count; i++) {
                    const id = i === 1 ? cat : `${cat}_${i}`;
                    slotMap.set(id, { id, label: `${cat} ${i}`, category: cat, order: globalOrder++ });
                }
            } else {
                // Single slot
                slotMap.set(cat, { id: cat, label: cat, category: cat, order: globalOrder++ });
            }
        });

        // Convert map back to array and sort by original definition order
        return Array.from(slotMap.values()).sort((a, b) => a.order - b.order);
    }, [equipCategories, equipment]);

    const handleEquipToggle = async (slot: string, itemId: string | null) => {
        if (isLoading) return;
        setIsLoading(true);
        let targetSlot = slot;
        if (itemId) {
            // Find all valid slots for this category, either through an exact ID match or category match
            const candidates = expandedSlots.filter(s => s.category === slot || s.id === slot);
            
            // Try to find the first empty candidate
            const empty = candidates.find(s => !equipment[s.id]);
            
            if (empty) {
                targetSlot = empty.id;
            } else {
                // If all are full, default to the first candidate, which will trigger a swap
                if (candidates.length > 0) targetSlot = candidates[0].id;
            }
        }
        try {
            const res = await fetch('/api/character/equip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ storyId, slot: targetSlot, itemId, guestState: isGuestMode ? character : undefined }) });
            const data = await res.json();
            
            if (data.success) {
                onUpdateCharacter(data.character);
                
                if (data.redirectId && onAutofire) {
                    onAutofire(data.redirectId);
                }
            }
            else if (data.isLocked) {
                setModalConfig({ isOpen: true, title: "Item Locked", message: data.error });
            }
            else {
                setModalConfig({ isOpen: true, title: "Cannot Equip", message: data.error });
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };
    const handleUse = (eventId: string) => { 
        if (!eventId) return; 
        onUseItem(eventId); 
        onRequestTabChange('story');
    };

    const inventoryItems = useMemo(() => {
        // Count how many times each item ID is equipped
        const equippedCounts: Record<string, number> = {};
        Object.values(equipment).forEach(id => {
            if (id) equippedCounts[id] = (equippedCounts[id] || 0) + 1;
        });

        return Object.keys(qualities).map(qid => {
            if (currencyIds.includes(qid)) return null;
            
            const def = qualityDefs[qid];
            const state = qualities[qid];
            if (!def || !state) return null;

            if (def.tags?.includes('hidden') && !showHidden) return null;

            const totalLevel = ('level' in state) ? state.level : 0;
            const numEquipped = equippedCounts[qid] || 0;
            
            // Subtract equipped items from inventory display count
            // Note: Does not change the actual quality level, just visual "in bag" count
            const inventoryLevel = totalLevel - numEquipped;

            if (inventoryLevel <= 0) return null;
            if (def.type !== 'I' && def.type !== 'E') return null;
            
            const merged = { ...def, ...state, level: inventoryLevel };
            return engine.render(merged);
        }).filter(Boolean as any);
    }, [qualities, qualityDefs, equipment, currencyIds, engine, showHidden]); 

    const grouped = useGroupedList(inventoryItems, groupBy, search);
    const groups = Object.keys(grouped).sort();

    return (
        <div className="possessions-container">
            <GameModal 
                isOpen={modalConfig.isOpen} 
                title={modalConfig.title}
                message={modalConfig.message} 
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onConfirm={() => setModalConfig({ ...modalConfig, isOpen: false })}
                confirmLabel="Dismiss"
            />

            {expandedSlots.length > 0 && (
                <>
                    <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Equipment</h2>
                    <div className={`inventory-grid ${isList ? 'inv-mode-list' : ''}`} style={styleVariables}>
                        {expandedSlots.map(slotObj => {
                            const slotId = slotObj.id;
                            
                            // Visual Fallback: If this is slot 1 (base ID), checks if there's an item in the legacy `_1` slot
                            // This ensures items don't disappear if data migration wasn't perfect.
                            const effectiveEquipId = equipment[slotId] 
                                || (slotId === slotObj.category ? equipment[`${slotId}_1`] : undefined);
                            
                            // Determine which key to actually target for unequip
                            const actualSlotKey = (effectiveEquipId && !equipment[slotId] && slotId === slotObj.category) 
                                ? `${slotId}_1` 
                                : slotId;

                            let equippedItem = null;
                            if (effectiveEquipId && qualityDefs[effectiveEquipId]) {
                                equippedItem = engine.render({ ...qualityDefs[effectiveEquipId], ...qualities[effectiveEquipId] });
                            }

                            if (equippedItem) {
                                return (
                                    <ItemDisplay 
                                        key={slotId}
                                        item={equippedItem}
                                        isEquipped={true}
                                        slotName={slotObj.label}
                                        onEquipToggle={() => handleEquipToggle(actualSlotKey, null)}
                                        onUse={handleUse}
                                        isLoading={isLoading}
                                        qualityDefs={qualityDefs}
                                        qualities={qualities}
                                        imageLibrary={imageLibrary}
                                        styleMode={invStyle} 
                                        shapeConfig={invShape}
                                        portraitMode={portraitMode}
                                        engine={engine}
                                    />
                                );
                            } else {
                                return (
                                    <div key={slotId} className="inventory-item empty" style={{ display: 'flex', flexDirection: isList ? 'row' : 'column', alignItems: 'center', justifyContent: isList ? 'flex-start' : 'center', padding: '1rem', background: 'rgba(0,0,0,0.1)', border: '1px dashed var(--border-light)', gap: '0.5rem', minHeight: isList ? 'auto' : '120px' }}>
                                        <span style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.8rem', color: 'var(--text-muted)' }}><FormattedText text={slotObj.label} /></span>
                                        <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Empty</span>
                                    </div>
                                );
                            }
                        })}
                    </div>
                </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem', marginTop: '2rem' }}>
                <h2 style={{ margin: 0 }}>Inventory</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="form-input" style={{ width: '180px', padding: '0.4rem' }} />
                    <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="form-select" style={{ width: '120px', padding: '0.4rem' }}>
                        <option value="category">Category</option>
                        <option value="type">Type</option>
                    </select>
                </div>
            </div>

            {groups.map(group => (
                <div key={group} style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-highlight)', marginBottom: '1rem', textTransform: 'uppercase', borderLeft: '3px solid var(--accent-highlight)', paddingLeft: '0.5rem' }}><FormattedText text={group} /></h3>
                    
                    <div className={`inventory-grid ${isList ? 'inv-mode-list' : ''}`} style={styleVariables}>
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
                                styleMode={invStyle} 
                                shapeConfig={invShape}
                                portraitMode={portraitMode}
                                engine={engine}
                            />
                        ))}
                    </div>
                </div>
            ))}
            
            {inventoryItems.length === 0 && <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>Your pockets are empty.</p>}
        </div>
    );
}