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
import GameImage from '../GameImage';
import WalletHeader from '../WalletHeader';
import MarketInterface from '../MarketInterface';

export default function TabletopLayout(props: LayoutProps) {
    const [activeTab, setActiveTab] = useState<'story' | 'possessions' | 'profile'>('story');
    const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

    const actionQid = props.settings.actionId.replace('$', '');
    const actionState = props.character.qualities[actionQid];
    const currentActions = (actionState && 'level' in actionState) ? actionState.level : 0;
    const maxActions = typeof props.settings.maxActions === 'number' ? props.settings.maxActions : 20; 

    // Parallax Logic
    const parallaxEnabled = props.settings.enableParallax !== false;
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!parallaxEnabled) return;
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        setMousePos({ x, y });
    };
    const moveX = parallaxEnabled ? (mousePos.x - 0.5) * -15 : 0;
    const moveY = parallaxEnabled ? (mousePos.y - 0.5) * -15 : 0;

    const renderRightPanel = () => {
        if (activeTab === 'profile') return <ProfilePanel qualities={props.character.qualities} qualityDefs={props.qualityDefs} imageLibrary={props.imageLibrary} categories={props.categories} settings={props.settings} />;
        if (activeTab === 'possessions') return <Possessions qualities={props.character.qualities} equipment={props.character.equipment} qualityDefs={props.qualityDefs} equipCategories={props.settings.equipCategories || []} onUpdateCharacter={(c) => props.onQualitiesUpdate(c.qualities)} storyId={props.character.storyId} imageLibrary={props.imageLibrary} settings={props.settings} />;
        
        if (props.showMarket && props.activeMarket) {
            return (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
        
        if (props.isLoading) return <div className="loading-container"><p>Loading...</p></div>;
        
        if (props.activeEvent) {
            return (
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
            );
        }

        return (
            <>
                <div style={{ borderBottom: '1px solid #333', paddingBottom: '1rem', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2.5rem', margin: 0, color: '#eee' }}>{props.location.name}</h1>
                </div>
                
                <LocationStorylets storylets={props.locationStorylets} onStoryletClick={props.onOptionClick} qualities={props.character.qualities} qualityDefs={props.qualityDefs} imageLibrary={props.imageLibrary} />
                
                <div style={{ marginTop: '3rem' }}>
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
        <div className="layout-grid-tabletop" onMouseMove={handleMouseMove}>
            
            {/* COLUMN 1: CHARACTER & STATS */}
            <div className="sidebar-panel" style={{ backgroundColor: '#181a1f', borderRight: '1px solid #333' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #333', background: '#21252b' }}>
                    <h3 style={{ margin: 0, color: 'var(--success-color)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Character</h3>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    <div className="action-box" style={{ background: 'transparent', border: '1px dashed #444' }}>
                        <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{currentActions} / {maxActions}</h3>
                        <ActionTimer currentActions={currentActions} maxActions={maxActions} lastTimestamp={props.character.lastActionTimestamp || new Date()} regenIntervalMinutes={props.settings.regenIntervalInMinutes || 10} onRegen={() => {}} />
                    </div>
                    <CharacterSheet qualities={props.character.qualities} equipment={props.character.equipment} qualityDefs={props.qualityDefs} settings={props.settings} categories={props.categories} />
                </div>
                <div style={{ padding: '1rem', borderTop: '1px solid #333', background: '#15171a' }}>
                    <button onClick={props.onExit} className="switch-char-btn" style={{ borderColor: '#555', color: '#777' }}>Exit to Menu</button>
                </div>
            </div>

            {/* COLUMN 2: VISUAL & NAV */}
            <div className="tabletop-visual-col">
                <div style={{ position: 'absolute', top: '-20px', bottom: '-20px', left: '-20px', right: '-20px', transform: `translate3d(${moveX}px, ${moveY}px, 0)`, transition: 'transform 0.1s ease-out' }}>
                    <GameImage code={props.location.image} imageLibrary={props.imageLibrary} type="location" alt="" className="w-full h-full object-cover" />
                </div>
                <div className="tabletop-visual-overlay" />
                
                {/* Navigation Buttons Floating at Bottom */}
                <div style={{ position: 'absolute', bottom: '2rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '10px', zIndex: 10 }}>
                    <button 
                        onClick={props.onOpenMap}
                        style={{ background: '#000', border: '1px solid var(--accent-highlight)', color: 'var(--accent-highlight)', padding: '0.6rem 1.5rem', cursor: 'pointer', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px', boxShadow: '0 0 15px rgba(0,0,0,0.8)' }}
                        className="hover:bg-[var(--accent-highlight)] hover:text-black transition"
                    >
                        Travel
                    </button>
                    {props.currentMarketId && (
                        <button 
                            onClick={props.onOpenMarket}
                            style={{ background: '#000', border: '1px solid #f1c40f', color: '#f1c40f', padding: '0.6rem 1.5rem', cursor: 'pointer', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}
                            className="hover:bg-[#f1c40f] hover:text-black transition"
                        >
                            Market
                        </button>
                    )}
                </div>
            </div>

            {/* COLUMN 3: STORY & CONTENT */}
            <div className="layout-column" style={{ background: '#1e1e1e', minWidth: '400px' }}>
                {/* Wallet Bar */}
                <div style={{ borderBottom: '1px solid #333', background: '#252525' }}>
                    <WalletHeader qualities={props.character.qualities} qualityDefs={props.qualityDefs} settings={props.settings} imageLibrary={props.imageLibrary} />
                </div>

                {/* Tabs */}
                <div className="tab-bar" style={{ background: '#252525', borderBottom: '1px solid #333' }}>
                    <button onClick={() => setActiveTab('story')} className={`tab-btn ${activeTab === 'story' ? 'active' : ''}`}>Story</button>
                    <button onClick={() => setActiveTab('possessions')} className={`tab-btn ${activeTab === 'possessions' ? 'active' : ''}`}>Inventory</button>
                    <button onClick={() => setActiveTab('profile')} className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}>Profile</button>
                </div>
                
                <div className="content-area" style={{ padding: '3rem 4rem' }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        {renderRightPanel()}
                    </div>
                </div>
            </div>
        </div>
    );
}