'use client';

import { ImageDefinition, PlayerQualities, QualityDefinition, WorldSettings } from "@/engine/models";
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
}

const FormatBonus = ({ bonusStr, qualityDefs, qualities }: { bonusStr: string, qualityDefs: Record<string, QualityDefinition>, qualities: PlayerQualities }) => {
    if (!bonusStr) return null;
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
                return <span key={idx} style={{ color, fontWeight: 'bold', fontSize: '0.85rem', backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>{content}</span>;
            })}
        </div>
    );
};

const ItemDisplay = ({ 
    item, isEquipped, slotName, onEquipToggle, onUse, isLoading, qualityDefs, qualities, imageLibrary, 
    styleMode, shapeConfig, portraitMode
}: any) => {
    const [expanded, setExpanded] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    
    // Close menu click outside
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

    // Layout Flags
    const activeStyle = styleMode || 'standard';
    const isIconGrid = activeStyle === 'icon-grid';
    const isPortrait = activeStyle === 'portrait';
    const isList = activeStyle === 'list';

    // --- FIX: Define capabilityClass ---
    let capabilityClass = "";
    if (isEquipable && hasStorylet) capabilityClass = "can-both";
    else if (isEquipable) capabilityClass = "can-equip";
    else if (hasStorylet) capabilityClass = "can-use";

    // Portrait Variant Class
    const portraitVariantClass = isPortrait ? (portraitMode === 'cover' ? 'variant-cover' : 'variant-icon') : '';

    // Interaction Handlers
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
            // backgroundColor: isEquipped ? 'rgba(var(--accent-rgb), 0.05)' : undefined, Adopts equipment slot color
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

            {/* --- STANDARD / PORTRAIT / LIST MODES --- */}
            {!isIconGrid && (
                <>
                    {/* Header (Slot Name) */}
                    {slotName && (
                        <div className="slot-header">
                            <FormattedText text={slotName} />
                        </div>
                    )}

                    {/* Main Body */}
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
                                {item.bonus && <div className="item-bonus"><FormatBonus bonusStr={item.bonus} qualityDefs={qualityDefs} qualities={qualities} /></div>}
                                {fullDesc && (
                                    <div className="item-desc" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                        <FormattedText text={displayDesc} />
                                        {showToggle && <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} style={{ background: 'none', border: 'none', color: 'var(--accent-highlight)', cursor: 'pointer', fontSize: '0.8rem', marginLeft: '5px', padding: 0, textDecoration: 'underline' }}>{expanded ? "Less" : "More"}</button>}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        // STANDARD & LIST
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
                                {item.bonus && <div className="item-bonus"><FormatBonus bonusStr={item.bonus} qualityDefs={qualityDefs} qualities={qualities} /></div>}
                                {!isList && fullDesc && (
                                    <div className="item-desc" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                        <FormattedText text={displayDesc} />
                                        {showToggle && <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} style={{ background: 'none', border: 'none', color: 'var(--accent-highlight)', cursor: 'pointer', fontSize: '0.8rem', marginLeft: '5px', padding: 0, textDecoration: 'underline' }}>{expanded ? "Less" : "More"}</button>}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
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

// --- MAIN COMPONENT ---
export default function Possessions({ 
    qualities, equipment, qualityDefs, equipCategories, onUpdateCharacter, onUseItem, onRequestTabChange, storyId, imageLibrary, settings, engine, showHidden, onAutofire
}: PossessionsProps) {
    
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [groupBy, setGroupBy] = useState("category");
    const [modalState, setModalState] = useState({ isOpen: false, message: "" });
    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, title: string, message: string }>({ isOpen: false, title: "", message: "" });
    const currencyIds = (settings.currencyQualities || []).map(c => c.replace('$', '').trim());
    

    // @ts-ignore
    const invStyle = settings.componentConfig?.inventoryStyle || 'standard';
    // @ts-ignore
    const sizeSetting = settings.componentConfig?.inventoryCardSize || 'medium';
    // @ts-ignore
    const portraitMode = settings.componentConfig?.inventoryPortraitMode || 'cover';
    // @ts-ignore
    const invShape = settings.imageConfig?.inventory || 'default';

    const sizeMap: Record<string, string> = { 'small': '160px', 'medium': '220px', 'large': '340px' };
    const itemWidth = sizeMap[sizeSetting] || '220px';
    const isList = invStyle === 'list';
    
    const styleVariables = { 
        '--inv-item-width': itemWidth,
    } as React.CSSProperties;

    const expandedSlots = useMemo(() => {
        const slots: { id: string, label: string, category: string }[] = [];
        equipCategories.forEach(catRaw => {
            let cat = catRaw.trim();
            let count = 1;
            let isInfinite = false;
            if (cat.endsWith('*')) { cat = cat.slice(0, -1); isInfinite = true; } 
            else if (cat.match(/\*\d+$/)) { const parts = cat.split('*'); count = parseInt(parts.pop() || "1", 10); cat = parts.join('*'); }

            if (isInfinite) {
                const usedIndices: number[] = [];
                Object.keys(equipment).forEach(key => {
                    if (key.startsWith(`${cat}_`)) {
                        const parts = key.split('_');
                        const idx = parseInt(parts[parts.length - 1], 10);
                        if (!isNaN(idx)) usedIndices.push(idx);
                    }
                });
                usedIndices.sort((a,b) => a - b);
                usedIndices.forEach(i => slots.push({ id: `${cat}_${i}`, label: `${cat} ${i}`, category: cat }));
                const nextIdx = (usedIndices.length > 0 ? Math.max(...usedIndices) : 0) + 1;
                slots.push({ id: `${cat}_${nextIdx}`, label: `${cat} ${nextIdx}`, category: cat });
            } else if (count > 1) {
                for(let i=1; i<=count; i++) slots.push({ id: `${cat}_${i}`, label: `${cat} ${i}`, category: cat });
            } else {
                slots.push({ id: cat, label: cat, category: cat });
            }
        });
        return slots;
    }, [equipCategories, equipment]);

    const handleEquipToggle = async (slot: string, itemId: string | null) => {
        if (isLoading) return;
        setIsLoading(true);
        let targetSlot = slot;
        if (itemId) {
            const exactSlotExists = expandedSlots.some(s => s.id === slot);
            if (!exactSlotExists) {
                const emptySlot = expandedSlots.find(s => s.category === slot && !equipment[s.id]);
                if (emptySlot) targetSlot = emptySlot.id;
                else {
                    const firstSlot = expandedSlots.find(s => s.category === slot);
                    if (firstSlot) targetSlot = firstSlot.id;
                }
            }
        }
        try {
            const res = await fetch('/api/character/equip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId, slot: targetSlot, itemId }) });
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
        const equippedIds = new Set(Object.values(equipment).filter(Boolean));
        return Object.keys(qualities).map(qid => {
            if (currencyIds.includes(qid)) return null;
            if (equippedIds.has(qid)) return null;
            const def = qualityDefs[qid];
            const state = qualities[qid];
            if (!def || !state) return null;

            if (def.tags?.includes('hidden') && !showHidden) return null;

            const level = ('level' in state) ? state.level : 0;
            if (level <= 0) return null;
            if (def.type !== 'I' && def.type !== 'E') return null;
            const merged = { ...def, ...state, level };
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
                            const equippedId = equipment[slotId];
                            let equippedItem = null;
                            if (equippedId && qualityDefs[equippedId]) equippedItem = engine.render({ ...qualityDefs[equippedId], ...qualities[equippedId] });

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
                                        styleMode={invStyle} 
                                        shapeConfig={invShape}
                                        portraitMode={portraitMode}
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
                            />
                        ))}
                    </div>
                </div>
            ))}
            
            {inventoryItems.length === 0 && <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>Your pockets are empty.</p>}
        </div>
    );
}