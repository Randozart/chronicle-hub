'use client';

import { useState } from 'react';
import { LayoutProps } from './LayoutProps';
import CharacterSheet from '../CharacterSheet';
import LocationStorylets from '../LocationStorylets';
import OpportunityHand from '../OpportunityHand';
import StoryletDisplay from '../StoryletDisplay';
import ProfilePanel from '../ProfilePanel';
import Possessions from '../Possessions';
import ActionTimer from '../ActionTimer';
import WalletHeader from '../WalletHeader';
import MarketInterface from '../MarketInterface';

export default function ElysiumLayout(props: LayoutProps) {
    const [activeTab, setActiveTab] = useState<'story' | 'possessions' | 'profile'>('story');
    const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

    const actionQid = props.settings.actionId.replace('$', '');
    const actionState = props.character.qualities[actionQid];
    const currentActions = (actionState && 'level' in actionState) ? actionState.level : 0;
    const maxActions = typeof props.settings.maxActions === 'number' ? props.settings.maxActions : 20; 

    const handleActionRegen = () => props.onQualitiesUpdate({ ...props.character.qualities, [actionQid]: { ...actionState, level: currentActions + 1 } as any });

    const parallaxEnabled = props.settings.enableParallax !== false;
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!parallaxEnabled) return;
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        setMousePos({ x, y });
    };
    const moveX = parallaxEnabled ? (mousePos.x - 0.5) * 40 : 0;
    const moveY = parallaxEnabled ? (mousePos.y - 0.5) * 40 : 0;

    const bgDef = props.imageLibrary[props.location.image];
    const bgSrc = bgDef ? bgDef.url : `/images/locations/${props.location.image}.png`;

    // --- CENTER CONTENT RENDERER ---
    const renderCenterContent = () => {
        
        // 1. PROFILE VIEW
        if (activeTab === 'profile') {
            return (
                <div style={{ background: 'rgba(15, 15, 20, 0.85)', backdropFilter: 'blur(20px)', padding: '3rem', borderRadius: 'var(--border-radius)', border: '1px solid rgba(255,255,255,0.1)', minHeight: '80vh' }}>
                    <h2 style={{ marginTop: 0, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '1rem', marginBottom: '2rem' }}>My Profile</h2>
                    <ProfilePanel 
                        qualities={props.character.qualities} 
                        qualityDefs={props.qualityDefs} 
                        imageLibrary={props.imageLibrary} 
                        categories={props.categories}
                        settings={props.settings}
                    />
                </div>
            );
        }        

        // 2. INVENTORY VIEW
        if (activeTab === 'possessions') {
            return (
                <div style={{ background: 'rgba(15, 15, 20, 0.85)', backdropFilter: 'blur(20px)', padding: '3rem', borderRadius: 'var(--border-radius)', border: '1px solid rgba(255,255,255,0.1)', minHeight: '80vh' }}>
                    <Possessions 
                        qualities={props.character.qualities} 
                        equipment={props.character.equipment} 
                        qualityDefs={props.qualityDefs} 
                        equipCategories={props.settings.equipCategories || []} 
                        onUpdateCharacter={(c) => props.onQualitiesUpdate(c.qualities)} 
                        storyId={props.character.storyId} 
                        imageLibrary={props.imageLibrary} 
                        settings={props.settings}
                    />
                </div>
            );
        }

        // MARKET VIEW
        if (props.showMarket && props.activeMarket) {
            return (
                <div style={{ background: 'rgba(15, 15, 20, 0.85)', backdropFilter: 'blur(20px)', padding: '3rem', borderRadius: 'var(--border-radius)', border: '1px solid rgba(255,255,255,0.1)', minHeight: '80vh' }}>
                    <MarketInterface 
                        market={props.activeMarket}
                        qualities={props.character.qualities}
                        qualityDefs={props.qualityDefs}
                        imageLibrary={props.imageLibrary}
                        settings={props.settings}
                        onClose={props.onCloseMarket}
                        onUpdate={props.onQualitiesUpdate}
                        storyId={props.storyId}
                        characterId={props.character.characterId}
                    />
                </div>
            );
        }
        
        // 3. STORY VIEW (Default)
        if (props.isLoading) return <div className="storylet-container loading-container" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' }}><p>Thinking...</p></div>;
        
        if (props.activeEvent) {
            return (
                <div style={{ background: 'rgba(15, 15, 20, 0.95)', backdropFilter: 'blur(25px)', borderRadius: 'var(--border-radius)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem' }}>
                    <StoryletDisplay
                        eventData={props.activeEvent}
                        qualities={props.character.qualities}
                        onFinish={props.onEventFinish}
                        onQualitiesUpdate={props.onQualitiesUpdate}
                        onCardPlayed={props.onCardPlayed}
                        qualityDefs={props.qualityDefs}
                        storyletDefs={props.storyletDefs}
                        opportunityDefs={props.opportunityDefs} 
                        settings={props.settings}
                        imageLibrary={props.imageLibrary}
                        categories={props.categories}
                        storyId={props.storyId}
                        characterId={props.character.characterId}
                    />
                </div>
            );
        }

        return (
            <>
                {/* LOCATION TITLE HEADER */}
                <div style={{ marginBottom: '3rem', textAlign: 'center', marginTop: '4rem' }}>
                    <h1 style={{ fontSize: '5rem', margin: 0, textShadow: '0 10px 40px rgba(0,0,0,0.8)', letterSpacing: '4px', color: 'var(--accent-highlight)', fontFamily: 'var(--font-main)' }}>
                        {props.location.name}
                    </h1>
                    
                    {/* FLOATING ACTION BAR */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '2rem' }}>
                        <button 
                            onClick={props.onOpenMap}
                            style={{ 
                                background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.4)', 
                                color: '#fff', padding: '0.8rem 2.5rem', borderRadius: '50px',
                                cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '2px', fontWeight: 'bold',
                                backdropFilter: 'blur(10px)'
                            }}
                            className="hover:bg-white hover:text-black transition"
                        >
                            Change Location
                        </button>
                         {props.currentMarketId && (
                            <button 
                                onClick={props.onOpenMarket}
                                style={{ 
                                    background: 'rgba(241, 196, 15, 0.2)', border: '1px solid #f1c40f', 
                                    color: '#f1c40f', padding: '0.8rem 2.5rem', borderRadius: '50px',
                                    cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '2px', fontWeight: 'bold',
                                    backdropFilter: 'blur(10px)'
                                }}
                            >
                                Market
                            </button>
                        )}
                    </div>
                </div>
                
                {/* STORYLETS GLASS PANEL */}
                <div style={{ background: 'rgba(15, 15, 25, 0.7)', backdropFilter: 'blur(15px)', padding: '2.5rem', borderRadius: 'var(--border-radius)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <LocationStorylets
                        storylets={props.locationStorylets}
                        onStoryletClick={props.onOptionClick}
                        qualities={props.character.qualities}
                        qualityDefs={props.qualityDefs}
                        imageLibrary={props.imageLibrary}
                    />
                </div>
                
                {/* DECK */}
                <div style={{ marginTop: '2rem' }}>
                    <OpportunityHand 
                        hand={props.hand} 
                        onCardClick={props.onOptionClick}
                        onDrawClick={props.onDrawClick}
                        isLoading={props.isLoading} 
                        qualities={props.character.qualities}
                        qualityDefs={props.qualityDefs}
                        imageLibrary={props.imageLibrary}
                        character={props.character}
                        locationDeckId={props.location.deck}
                        deckDefs={props.deckDefs}
                        settings={props.settings}
                        currentDeckStats={props.currentDeckStats}
                    />
                </div>
            </>
        );
    };

    return (
        <div onMouseMove={handleMouseMove} style={{ height: '100vh', display: 'flex', overflow: 'hidden', position: 'relative', color: '#eee', background: '#000' }}>
            
            {/* BACKGROUND LAYER */}
            <div style={{ position: 'absolute', top: '-50px', left: '-50px', right: '-50px', bottom: '-50px', zIndex: 0, transition: 'transform 0.1s ease-out', transform: `translate3d(${-moveX}px, ${-moveY}px, 0)` }}>
                <img src={bgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.5)' }} onError={(e) => e.currentTarget.style.display = 'none'} />
                {/* Vignette */}
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.8) 100%)' }} />
            </div>

            {/* --- LEFT SIDEBAR (HUD ONLY) --- */}
            <div style={{ 
                width: '400px', // WIDER SIDEBAR
                borderRight: '1px solid rgba(255,255,255,0.1)', 
                background: 'rgba(10, 10, 15, 0.6)', 
                backdropFilter: 'blur(20px)', 
                display: 'flex', flexDirection: 'column', 
                zIndex: 10, 
                boxShadow: '5px 0 20px rgba(0,0,0,0.5)',
                flexShrink: 0
            }}>
                
                {/* 1. WALLET */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                     <WalletHeader 
                        qualities={props.character.qualities}
                        qualityDefs={props.qualityDefs}
                        settings={props.settings}
                        imageLibrary={props.imageLibrary}
                    />
                </div>

                {/* 2. NAVIGATION MENU */}
                <div style={{ display: 'flex', flexDirection: 'column', padding: '1rem 2rem', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <button onClick={() => setActiveTab('story')} className={`tab-btn ${activeTab === 'story' ? 'active' : ''}`} style={{textAlign: 'left', padding: '1rem', fontSize: '1rem'}}>
                         Story
                    </button>
                    <button onClick={() => setActiveTab('possessions')} className={`tab-btn ${activeTab === 'possessions' ? 'active' : ''}`} style={{textAlign: 'left', padding: '1rem', fontSize: '1rem'}}>
                         Inventory
                    </button>
                    <button onClick={() => setActiveTab('profile')} className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} style={{textAlign: 'left', padding: '1rem', fontSize: '1rem'}}>
                         Profile & Stats
                    </button>
                </div>

                {/* 3. ACTIVE STATS (Character Sheet - Compact) */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                    <div className="action-display" style={{ marginBottom: '3rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '3.5rem', fontWeight: '200', lineHeight: 1, color: 'white' }}>{currentActions}</div>
                        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--accent-highlight)', marginBottom: '0.5rem' }}>Actions</div>
                        <ActionTimer currentActions={currentActions} maxActions={maxActions} lastTimestamp={props.character.lastActionTimestamp || new Date()} regenIntervalMinutes={props.settings.regenIntervalInMinutes || 10} onRegen={handleActionRegen} />
                    </div>
                    
                    {/* Only show basic stats here, deeper stats are in Profile tab now */}
                    <CharacterSheet qualities={props.character.qualities} equipment={props.character.equipment} qualityDefs={props.qualityDefs} settings={props.settings} categories={props.categories} />
                </div>

                {/* 4. FOOTER */}
                 <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <button 
                        onClick={props.onExit}
                        className="switch-char-btn"
                        style={{ background: 'rgba(231, 76, 60, 0.2)', borderColor: '#e74c3c' }}
                    >
                        ← Switch Character
                    </button>
                </div>
            </div>

            {/* --- MAIN CONTENT AREA (Scrollable) --- */}
            <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 5 }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '4rem 2rem', minHeight: '100%' }}>
                    {renderCenterContent()}
                </div>
            </div>
        </div>
    );
}