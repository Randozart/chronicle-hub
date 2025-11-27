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

    const renderContent = () => {
        if (activeTab === 'profile') return <ProfilePanel qualities={props.character.qualities} qualityDefs={props.qualityDefs} imageLibrary={props.imageLibrary} categories={props.categories} />;
        if (activeTab === 'possessions') return <Possessions qualities={props.character.qualities} equipment={props.character.equipment} qualityDefs={props.qualityDefs} equipCategories={props.settings.equipCategories || []} onUpdateCharacter={(c) => props.onQualitiesUpdate(c.qualities)} storyId={props.character.storyId} imageLibrary={props.imageLibrary} />;
        
        if (props.isLoading) return <div className="storylet-container loading-container" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' }}><p>Thinking...</p></div>;
        
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
                />
            );
        }

        return (
            <>
                <div style={{ marginBottom: '3rem', textAlign: 'center', marginTop: '4rem' }}>
                    <h1 style={{ fontSize: '4rem', margin: 0, textShadow: '0 4px 20px rgba(0,0,0,0.9)', fontFamily: 'serif', letterSpacing: '1px' }}>
                        {props.location.name}
                    </h1>
                    {/* TRAVEL BUTTON */}
                    <button 
                        onClick={props.onOpenMap}
                        style={{ 
                            marginTop: '1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', 
                            color: '#ccc', padding: '0.5rem 2rem', borderRadius: '20px',
                            cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '2px'
                        }}
                        className="hover:border-white hover:text-white transition"
                    >
                        Change Location
                    </button>
                </div>
                
                <div style={{ background: 'rgba(20, 20, 30, 0.6)', backdropFilter: 'blur(10px)', padding: '2rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <LocationStorylets
                        storylets={props.locationStorylets}
                        onStoryletClick={props.onOptionClick}
                        qualities={props.character.qualities}
                        qualityDefs={props.qualityDefs}
                        imageLibrary={props.imageLibrary}
                    />
                </div>
                
                <div style={{ marginTop: '2rem' }}>
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
        <div onMouseMove={handleMouseMove} style={{ height: '100vh', display: 'flex', overflow: 'hidden', position: 'relative', color: '#eee', background: '#000' }}>
            <div style={{ position: 'absolute', top: '-50px', left: '-50px', right: '-50px', bottom: '-50px', zIndex: 0, transition: 'transform 0.1s ease-out', transform: `translate3d(${-moveX}px, ${-moveY}px, 0)` }}>
                <img src={bgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.6)' }} onError={(e) => e.currentTarget.style.display = 'none'} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent 40%)' }} />
            </div>

            <div style={{ width: '350px', borderRight: '1px solid rgba(255,255,255,0.1)', background: 'rgba(10, 10, 15, 0.7)', backdropFilter: 'blur(15px)', display: 'flex', flexDirection: 'column', zIndex: 10, boxShadow: '5px 0 20px rgba(0,0,0,0.5)' }}>
                <div style={{ padding: '2rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button onClick={() => setActiveTab('story')} style={{ background: 'none', border: 'none', color: activeTab === 'story' ? '#fff' : '#666', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', borderBottom: activeTab === 'story' ? '2px solid #fff' : '2px solid transparent', paddingBottom: '5px' }}>Story</button>
                        <button onClick={() => setActiveTab('possessions')} style={{ background: 'none', border: 'none', color: activeTab === 'possessions' ? '#fff' : '#666', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', borderBottom: activeTab === 'possessions' ? '2px solid #fff' : '2px solid transparent', paddingBottom: '5px' }}>Items</button>
                        <button onClick={() => setActiveTab('profile')} style={{ background: 'none', border: 'none', color: activeTab === 'profile' ? '#fff' : '#666', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', borderBottom: activeTab === 'profile' ? '2px solid #fff' : '2px solid transparent', paddingBottom: '5px' }}>Stats</button>
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                    {activeTab === 'story' ? (
                        <>
                            <div className="action-display" style={{ marginBottom: '3rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '3rem', fontWeight: '200', lineHeight: 1 }}>{currentActions}</div>
                                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#888', marginBottom: '0.5rem' }}>Actions Available</div>
                                <ActionTimer currentActions={currentActions} maxActions={maxActions} lastTimestamp={props.character.lastActionTimestamp || new Date()} regenIntervalMinutes={props.settings.regenIntervalInMinutes || 10} onRegen={handleActionRegen} />
                            </div>
                            <CharacterSheet qualities={props.character.qualities} equipment={props.character.equipment} qualityDefs={props.qualityDefs} settings={props.settings} categories={props.categories} />
                        </>
                    ) : (
                        activeTab === 'profile' ? <ProfilePanel qualities={props.character.qualities} qualityDefs={props.qualityDefs} imageLibrary={props.imageLibrary} categories={props.categories} />
                        : <Possessions qualities={props.character.qualities} equipment={props.character.equipment} qualityDefs={props.qualityDefs} equipCategories={props.settings.equipCategories || []} onUpdateCharacter={(c) => props.onQualitiesUpdate(c.qualities)} storyId={props.character.storyId} imageLibrary={props.imageLibrary} />
                    )}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 5 }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem 4rem 2rem', minHeight: '100%' }}>
                    {activeTab === 'story' ? renderContent() : null}
                </div>
            </div>
        </div>
    );
}