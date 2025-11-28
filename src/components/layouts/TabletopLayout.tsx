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

export default function TabletopLayout(props: LayoutProps) {
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
    
    const moveX = parallaxEnabled ? (mousePos.x - 0.5) * -15 : 0;
    const moveY = parallaxEnabled ? (mousePos.y - 0.5) * -15 : 0;

    const renderRightPanel = () => {
        if (activeTab === 'profile') return <ProfilePanel qualities={props.character.qualities} qualityDefs={props.qualityDefs} imageLibrary={props.imageLibrary} categories={props.categories} />;
        if (activeTab === 'possessions') return <Possessions qualities={props.character.qualities} equipment={props.character.equipment} qualityDefs={props.qualityDefs} equipCategories={props.settings.equipCategories || []} onUpdateCharacter={(c) => props.onQualitiesUpdate(c.qualities)} storyId={props.character.storyId} imageLibrary={props.imageLibrary} />;
        
        if (props.isLoading) return <div className="storylet-container loading-container"><p>Loading...</p></div>;
        
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
                />
            );
        }

        return (
            <>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2.5rem', margin: 0 }}>{props.location.name}</h1>
                </div>
                
                <LocationStorylets
                    storylets={props.locationStorylets}
                    onStoryletClick={props.onOptionClick}
                    qualities={props.character.qualities}
                    qualityDefs={props.qualityDefs}
                    imageLibrary={props.imageLibrary}
                />
                
                <div style={{ marginTop: '3rem' }}>
                    <OpportunityHand 
                        hand={props.hand} 
                        onCardClick={props.onOptionClick}
                        onDrawClick={props.onDrawClick}
                        isLoading={props.isLoading} 
                        qualities={props.character.qualities}
                        qualityDefs={props.qualityDefs}
                        imageLibrary={props.imageLibrary}
                    />
                </div>
            </>
        );
    };

    return (
        <div 
            onMouseMove={handleMouseMove}
            className="tabletop-container"
            style={{ height: '100vh', display: 'flex', background: '#121212', color: '#ccc', overflow: 'hidden' }}
        >
            <div style={{ width: '280px', flexShrink: 0, borderRight: '1px solid #333', background: '#181a1f', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #333', background: '#21252b' }}>
                    <h3 style={{ margin: 0, color: 'var(--success-color)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Character</h3>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    <div className="action-display" style={{ marginBottom: '2rem', textAlign: 'center', padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '4px' }}>
                        <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{currentActions} / {maxActions}</h3>
                        <ActionTimer currentActions={currentActions} maxActions={maxActions} lastTimestamp={props.character.lastActionTimestamp || new Date()} regenIntervalMinutes={props.settings.regenIntervalInMinutes || 10} onRegen={handleActionRegen} />
                    </div>
                    <CharacterSheet qualities={props.character.qualities} equipment={props.character.equipment} qualityDefs={props.qualityDefs} settings={props.settings} categories={props.categories} />
                </div>
            </div>

            <div style={{ flex: '0 0 30%', minWidth: '250px', maxWidth: '500px', background: '#000', position: 'relative', overflow: 'hidden', borderRight: '1px solid #333', boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8)', zIndex: 1 }}>
                <div style={{ position: 'absolute', top: '-20px', bottom: '-20px', left: '-20px', right: '-20px', transform: `translate3d(${moveX}px, ${moveY}px, 0)`, transition: 'transform 0.1s ease-out' }}>
                    <GameImage 
                        code={props.location.image} 
                        imageLibrary={props.imageLibrary} 
                        type="location" 
                        alt=""
                        className="w-full h-full object-cover"
                    />
                </div>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, transparent 40%, #000 120%)' }} />
                
                {/* TRAVEL BUTTON */}
                <div style={{ position: 'absolute', bottom: '2rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
                    <button 
                        onClick={props.onOpenMap}
                        style={{ 
                            background: '#000', border: '1px solid var(--accent-highlight)', 
                            color: 'var(--accent-highlight)', padding: '0.5rem 1.5rem', 
                            cursor: 'pointer', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px',
                            boxShadow: '0 0 10px rgba(0,0,0,0.8)'
                        }}
                        className="hover:bg-[var(--accent-highlight)] hover:text-black transition"
                    >
                        Travel
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1e1e1e', minWidth: '400px' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #333', background: '#252525' }}>
                    <button onClick={() => setActiveTab('story')} style={{ padding: '1rem 2rem', background: activeTab === 'story' ? '#1e1e1e' : 'transparent', border: 'none', borderRight: '1px solid #333', color: activeTab === 'story' ? 'var(--text-primary)' : '#777', cursor: 'pointer', fontWeight: 'bold' }}>STORY</button>
                    <button onClick={() => setActiveTab('possessions')} style={{ padding: '1rem 2rem', background: activeTab === 'possessions' ? '#1e1e1e' : 'transparent', border: 'none', borderRight: '1px solid #333', color: activeTab === 'possessions' ? 'var(--text-primary)' : '#777', cursor: 'pointer', fontWeight: 'bold' }}>INVENTORY</button>
                    <button onClick={() => setActiveTab('profile')} style={{ padding: '1rem 2rem', background: activeTab === 'profile' ? '#1e1e1e' : 'transparent', border: 'none', borderRight: '1px solid #333', color: activeTab === 'profile' ? 'var(--text-primary)' : '#777', cursor: 'pointer', fontWeight: 'bold' }}>PROFILE</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '3rem 4rem' }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        {renderRightPanel()}
                    </div>
                </div>
            </div>
        </div>
    );
}