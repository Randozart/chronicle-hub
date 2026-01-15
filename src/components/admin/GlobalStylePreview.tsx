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

    const MockImage = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
        <div className={className} style={{ 
            width: '100%', height: '100%', 
            background: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.2)', fontSize: '1.2rem', fontWeight: 'bold',
            ...style
        }}>IMG</div>
    );
    const slStyle = cfg.storyletListStyle as 'rows' | 'cards' | 'polaroid' | 'compact' | 'images-only' | 'tarot' | 'scrolling' || 'rows';
    const useSlOptionButton = ['rows', 'compact', 'polaroid'].includes(slStyle);

    const handStyle = cfg.handStyle as 'rows' | 'cards' | 'polaroid' | 'compact' | 'images-only' | 'tarot' | 'scrolling' || 'cards';
    const useHandOptionButton = ['rows', 'compact', 'polaroid'].includes(handStyle);

    const invStyle = cfg.inventoryStyle || 'standard';
    const sizeSetting = cfg.inventoryCardSize || 'medium';
    const sizeMap: Record<string, string> = { 'small': '140px', 'medium': '220px', 'large': '340px' };
    const itemWidth = sizeMap[sizeSetting];
    const isInvList = invStyle === 'list';
    const isInvPortrait = invStyle === 'portrait';
    const isInvIconGrid = invStyle === 'icon-grid';
    const isInvStandard = invStyle === 'standard';
    const previewStyle = { '--inv-item-width': itemWidth } as React.CSSProperties;

    return (
        <div data-theme={theme} className="theme-wrapper" style={{ padding: '1rem', border: '1px solid #444', borderRadius: '8px', background: 'var(--bg-main)', ...previewStyle }}>
            
            <div style={{ marginBottom: '2rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-highlight)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    Action Style
                </h5>
                <div style={{ flex: slStyle === 'polaroid' ? '0 1 250px' : '1', maxWidth: slStyle === 'polaroid' ? '250px' : '100%' }}>
                    <div className={useSlOptionButton ? `storylet-list-container mode-${slStyle}` : `card-container mode-${slStyle}`}>
                        {useSlOptionButton ? (
                            <button 
                                className={`option-button ${slStyle === 'polaroid' ? 'card-mode' : ''}`}
                                style={slStyle === 'polaroid' ? { display: 'flex', flexDirection: 'column', height: '100%' } : {}}

                            >
                                <div className="option-content-wrapper" style={slStyle === 'polaroid' ? { flexDirection: 'column', padding: 0 } : {}}>
                                    <div className="option-image-container" style={slStyle === 'polaroid' ? { width: '100%', height: '160px', marginBottom: '1rem', marginRight: 0 } : {}}>
                                        <MockImage className="option-image" style={slStyle === 'polaroid' ? { borderRadius: 0 } : {}} />
                                    </div>
                                    <div className="option-text-wrapper" style={slStyle === 'polaroid' ? { padding: '0 1rem 1rem' } : {}}>
                                        <h3>Enter the shadows</h3>
                                        {slStyle !== 'compact' && <p className="option-short-desc">The path is dark...</p>}
                                    </div>
                                </div>
                            </button>
                        ) : (
                            <div className="card"><button className="card-content-btn"><MockImage className="card-image" /><div className="card-text"><h3>Enter the shadows</h3>{slStyle !== 'tarot' && <p>The path is dark...</p>}</div>{slStyle === 'images-only' && <div className="image-only-overlay"><span>Enter the shadows</span></div>}</button></div>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-highlight)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    Hand Style
                </h5>
                <div style={{ flex: handStyle === 'polaroid' ? '0 1 250px' : '1', maxWidth: handStyle === 'polaroid' ? '250px' : '100%' }}>
                    <div className={useHandOptionButton ? `storylet-list-container mode-${handStyle}` : `card-container mode-${handStyle}`}>
                        {useHandOptionButton ? (
                            <button className={`option-button ${handStyle === 'polaroid' ? 'option-button card-mode' : ''}`} style={handStyle === 'polaroid' ? { display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'stretch' } : {}}>
                                <div className="option-content-wrapper" style={handStyle === 'polaroid' ? { flexDirection: 'column', padding: 0 } : {}}><div className="option-image-container" style={handStyle === 'polaroid' ? { width: '100%', height: '160px', marginBottom: '1rem', marginRight: 0 } : {}}><MockImage className="option-image" style={handStyle === 'polaroid' ? { borderRadius: 0 } : {}}/></div><div className="option-text-wrapper" style={handStyle === 'polaroid' ? { padding: '0 1rem 1rem' } : {}}><h3>A Favorable Omen</h3>{handStyle !== 'compact' && <p className="option-short-desc">Luck is with you.</p>}</div></div>
                            </button>
                        ) : (
                            <div className="card"><button className="card-content-btn"><MockImage className="card-image" /><div className="card-text"><h3>A Favorable Omen</h3>{handStyle !== 'tarot' && <p>Luck is with you.</p>}</div>{handStyle === 'images-only' && <div className="image-only-overlay"><span>A Favorable Omen</span></div>}</button></div>
                        )}
                    </div>
                </div>
            </div>
            <div>
                <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-highlight)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    Inventory ({invStyle}) {invStyle !== 'list' ? `- ${itemWidth}` : ''}
                </h5>
                <div className={`inventory-grid ${isInvList ? 'inv-mode-list' : ''}`} style={{ width: isInvList ? '100%' : itemWidth, maxWidth: '100%' }}>
                    <div className={`inventory-item style-${invStyle} ${isInvPortrait ? `variant-${cfg.inventoryPortraitMode || 'cover'}` : ''}`}>
                        {(isInvStandard || isInvList) ? (
                            <>
                                <div className="slot-header">HEAD</div>
                                <div className="item-main-body">
                                    <div className="item-image-container"><MockImage/></div>
                                    <div className="item-text" style={{ minWidth: 0 }}>
                                        <div className="item-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <div className="item-name" style={{ fontWeight: 'bold' }}>Iron Helm</div>
                                            <span>x1</span>
                                        </div>
                                        {!isInvList && <div className="item-desc" style={{ opacity: 0.7, marginTop: '0.5rem' }}>Sturdy protection.</div>}
                                    </div>
                                </div>
                                <div className="item-actions">
                                    <button className="unequip-btn" style={{ fontSize: '0.7rem', padding: '2px 8px', width: '100%' }}>Unequip</button>
                                </div>
                            </>
                        ) : isInvIconGrid ? (
                             <div style={{position: 'relative', width: '100%', height: '100%'}}>
                                 <div className="item-image-container" style={{position: 'absolute', inset: 0}}><MockImage/></div>
                                 <div className="slot-header-overlay">HEAD</div>
                                 <div className="item-overlay-title">Iron Helm</div>
                             </div>
                        ) : isInvPortrait ? (
                            <>
                                <div className="item-image-container"><MockImage /></div>
                                <div className="item-text" style={{padding: '1rem'}}><div className="item-header" style={{ display: 'flex', justifyContent: 'space-between' }}><div className="item-name" style={{ fontWeight: 'bold' }}>Iron Helm</div><span>x1</span></div><div className="item-desc" style={{ opacity: 0.7, marginTop: '0.5rem' }}>Sturdy protection.</div></div>
                                <div className="item-actions" style={{padding: '1rem', paddingTop: 0}}><button className="unequip-btn" style={{ fontSize: '0.7rem', padding: '2px 8px', width: '100%' }}>Unequip</button></div>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}