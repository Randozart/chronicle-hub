'use client';

import { WorldSettings } from "@/engine/models";
import React from "react";

interface Props {
    settings: WorldSettings;
    theme: string;
}

export default function GlobalStylePreview({ settings, theme }: Props) {
    const cfg = settings.componentConfig || {};
    const imgCfg = settings.imageConfig || {};

    // --- DYNAMIC RATIO HELPER ---
    const getAspectRatio = (type: string) => {
        const shape = imgCfg[type as keyof typeof imgCfg] || 'default';
        switch (shape) {
            case 'landscape': return '16/9';
            case 'square': return '1/1';
            case 'circle': return '1/1';
            case 'portrait': return '3/4';
            default: return '3/4'; 
        }
    };

    // --- MOCK IMAGE ---
    const MockImage = ({ shape, type, style, borderRadiusOverride }: { shape?: string, type?: string, style?: React.CSSProperties, borderRadiusOverride?: string }) => {
        const actualShape = shape || imgCfg[type as keyof typeof imgCfg] || 'default';
        let finalRadius = '4px'; 
        
        if (borderRadiusOverride) {
            finalRadius = borderRadiusOverride;
        } else {
            switch (actualShape) {
                case 'circle': finalRadius = '50%'; break;
                case 'rounded': finalRadius = '12px'; break;
                case 'square': finalRadius = '4px'; break;
                default: if (type === 'icon' || type === 'portrait') finalRadius = '4px'; break;
            }
        }
        
        const { borderRadius: _, ...safeStyle } = style || {};

        return (
            <div style={{ 
                width: '100%', height: '100%', 
                background: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.2)', fontSize: '1.2rem', fontWeight: 'bold',
                borderRadius: finalRadius, 
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
                ...safeStyle
            }}>
                IMG
            </div>
        );
    };

    // --- CONFIG ---
    const slStyle = cfg.storyletListStyle || 'rows';
    const isSlGrid = slStyle === 'cards';
    const slImageShape = imgCfg.storylet; 
    const slRatio = getAspectRatio('storylet'); // <--- Calculate Ratio

    const handStyle = cfg.handStyle || 'cards';
    const isHandRow = handStyle === 'rows';
    
    const invStyle = cfg.inventoryStyle || 'standard';
    const sizeSetting = cfg.inventoryCardSize || 'medium';
    const sizeMap: Record<string, string> = { 'small': '140px', 'medium': '220px', 'large': '340px' };
    const itemWidth = sizeMap[sizeSetting];
    const isInvPortrait = invStyle === 'portrait';
    const isInvIconGrid = invStyle === 'icon-grid';
    const isInvList = invStyle === 'list';
    const isInvStandard = invStyle === 'standard';

    const previewStyle = { '--inv-item-width': itemWidth } as React.CSSProperties;

    return (
        <div data-theme={theme} className="theme-wrapper" style={{ padding: '1rem', border: '1px solid #444', borderRadius: '8px', background: 'var(--bg-main)', ...previewStyle }}>
            
            {/* 1. STORYLET PREVIEW */}
            <div className="location-storylets" style={{ marginBottom: '2rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-highlight)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    Action Style ({slStyle})
                </h5>
                <div className={`storylet-list mode-${slStyle}`}>
                    <button 
                        className={`option-button ${isSlGrid ? 'card-mode' : ''}`}
                        style={isSlGrid ? { display: 'flex', flexDirection: 'column', alignItems: 'stretch' } : {}}
                    >
                        <div 
                            className="option-content-wrapper"
                            style={isSlGrid ? { flexDirection: 'column', padding: 0 } : {}}
                        >
                            <div 
                                className="option-image-container"
                                // Use Dynamic Aspect Ratio instead of fixed height
                                style={isSlGrid 
                                    ? { width: '100%', aspectRatio: slRatio, marginBottom: '0.5rem' } 
                                    : { width: '80px', flexShrink: 0, aspectRatio: slRatio }
                                }
                            >
                                <MockImage 
                                    type="storylet" 
                                    shape={slImageShape} 
                                    borderRadiusOverride={isSlGrid ? '4px 4px 0 0' : undefined}
                                />
                            </div>
                            <div 
                                className="option-text-wrapper"
                                style={isSlGrid ? { padding: '1rem', paddingTop: 0 } : {}}
                            >
                                <h3>Enter the shadows</h3>
                                <p className="option-short-desc">The path is dark, but you have a lantern. The wind howls.</p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {/* 2. HAND PREVIEW */}
            <div className="opportunity-hand" style={{ marginBottom: '2rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-highlight)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    Hand Style ({handStyle})
                </h5>
                <div className={`card-container mode-${handStyle}`} style={{ display: isHandRow ? 'flex' : 'grid', flexDirection: isHandRow ? 'column' : undefined }}>
                    <div className={`card ${handStyle === 'images-only' ? 'image-only-card' : ''}`} style={{ position: 'relative' }}>
                        <button 
                            className="card-content-btn" 
                            style={isHandRow ? { display: 'flex', flexDirection: 'row', alignItems: 'flex-start', textAlign: 'left', width: '100%' } : {}}
                        >
                            <div 
                                className={isHandRow ? '' : 'card-image-wrapper'} 
                                style={isHandRow ? { width: '80px', flexShrink: 0, marginRight: '1rem', height: '80px' } : { height: handStyle === 'images-only' ? '100%' : (handStyle === 'tarot' ? '75%' : '120px'), width: '100%' }}
                            >
                                 <MockImage type="storylet" shape={handStyle === 'images-only' ? 'square' : undefined} />
                            </div>
                            {handStyle !== 'images-only' && (
                                <div className="card-text">
                                    <h3>A Favorable Omen</h3>
                                    {handStyle !== 'tarot' && <p>Luck is with you today.</p>}
                                </div>
                            )}
                            {handStyle === 'images-only' && (
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', padding: '2rem 0.5rem 0.5rem 0.5rem', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center', pointerEvents: 'none' }}>
                                    A Favorable Omen
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. INVENTORY PREVIEW */}
            <div>
                <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-highlight)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    Inventory ({invStyle}) {invStyle !== 'list' ? `- ${itemWidth}` : ''}
                </h5>
                <div className={`inventory-grid ${invStyle === 'list' ? 'inv-mode-list' : ''}`} style={{ width: isInvList ? '100%' : itemWidth, maxWidth: '100%' }}>
                    <div className={`inventory-item style-${invStyle} ${isInvPortrait ? `variant-${cfg.inventoryPortraitMode || 'cover'}` : ''}`}>
                        {isInvIconGrid && (
                            <>
                                <div className="item-image-container">
                                     <div className="game-image-wrapper" style={{ position: 'absolute', inset: 0 }}>
                                        <MockImage type="icon" shape={imgCfg.inventory} />
                                     </div>
                                </div>
                                <div className="slot-header-overlay">HEAD</div>
                                <div className="item-overlay-title">Iron Helm</div>
                            </>
                        )}
                        {isInvPortrait && (
                            <>
                                <div className="item-image-container">
                                    <MockImage type={cfg.inventoryPortraitMode === 'cover' ? 'cover' : 'storylet'} shape={imgCfg.inventory} />
                                </div>
                                <div className="item-text">
                                    <div className="item-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div className="item-name" style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Iron Helm</div>
                                        <span className="item-count" style={{ fontSize: '0.8rem' }}>x1</span>
                                    </div>
                                    <div className="item-desc" style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7 }}>
                                        Sturdy and dependable protection.
                                    </div>
                                </div>
                                <div className="item-actions">
                                    <button className="unequip-btn" style={{ fontSize: '0.7rem', padding: '2px 8px', flex: 1 }}>Unequip</button>
                                </div>
                            </>
                        )}
                        {(isInvStandard || isInvList) && (
                            <>
                                {!isInvList && <div className="slot-header">HEAD</div>}
                                <div className="item-main-body">
                                    <div className="item-image-container">
                                         <MockImage type="icon" shape={imgCfg.inventory} />
                                    </div>
                                    <div className="item-text" style={{ minWidth: 0, flex: 1 }}>
                                        <div className="item-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <div className="item-name" style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Iron Helm</div>
                                            <span className="item-count" style={{ fontSize: '0.8rem' }}>x1</span>
                                        </div>
                                        {!isInvList && (
                                            <div className="item-desc" style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7 }}>
                                                Sturdy and dependable protection.
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="item-actions">
                                    <button className="unequip-btn" style={{ fontSize: '0.7rem', padding: '2px 8px', width: isInvList ? 'auto' : '100%' }}>Unequip</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}