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

export default function ElysiumLayout(props: LayoutProps) {
    const [activeTab, setActiveTab] = useState<'story' | 'possessions' | 'profile'>('story');

    // Action Logic (Standard)
    const actionQid = props.settings.actionId.replace('$', '');
    const actionState = props.character.qualities[actionQid];
    const currentActions = (actionState && 'level' in actionState) ? actionState.level : 0;
    const maxActions = typeof props.settings.maxActions === 'number' ? props.settings.maxActions : 20;
    const handleActionRegen = () => props.onQualitiesUpdate({ ...props.character.qualities, [actionQid]: { ...actionState, level: currentActions + 1 } as any });

    const renderContent = () => {
        if (activeTab === 'profile') return <ProfilePanel qualities={props.character.qualities} qualityDefs={props.qualityDefs} imageLibrary={props.imageLibrary} categories={props.categories} />;
        if (activeTab === 'possessions') return <Possessions qualities={props.character.qualities} equipment={props.character.equipment} qualityDefs={props.qualityDefs} equipCategories={props.settings.equipCategories || []} onUpdateCharacter={(c) => props.onQualitiesUpdate(c.qualities)} storyId={props.character.storyId} imageLibrary={props.imageLibrary} />;
        
        if (props.isLoading) return <div className="storylet-container loading-container" style={{ background: 'rgba(0,0,0,0.7)' }}><p>Thinking...</p></div>;
        
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
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '3rem', margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                        {props.location.name}
                    </h1>
                </div>
                
                <LocationStorylets
                    storylets={props.locationStorylets}
                    onStoryletClick={props.onOptionClick}
                    qualities={props.character.qualities}
                    qualityDefs={props.qualityDefs}
                    imageLibrary={props.imageLibrary}
                />
                
                <div style={{ marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
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
        <div style={{ height: '100vh', display: 'flex', overflow: 'hidden', position: 'relative', color: '#eee' }}>
            
            {/* --- BACKGROUND LAYER --- */}
            <div style={{ position: 'absolute', inset: 0, zIndex: -1 }}>
                <GameImage 
                    code={props.location.image} 
                    imageLibrary={props.imageLibrary} 
                    type="location" 
                    alt=""
                    className="w-full h-full object-cover"
                    // Force full coverage style manually to override class constraints if needed
                    // style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.4) blur(5px)', transform: 'scale(1.1)' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(20, 20, 30, 0.85)' }} />
            </div>

            {/* --- LEFT COLUMN (Stats) --- */}
            <div style={{ 
                width: '350px', 
                borderRight: '1px solid rgba(255,255,255,0.1)', 
                background: 'rgba(0,0,0,0.4)', 
                backdropFilter: 'blur(10px)',
                display: 'flex', 
                flexDirection: 'column'
            }}>
                {/* Header / Tabs */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button onClick={() => setActiveTab('story')} style={{ background: 'none', border: 'none', color: activeTab === 'story' ? '#fff' : '#888', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.9rem' }}>Story</button>
                        <button onClick={() => setActiveTab('possessions')} style={{ background: 'none', border: 'none', color: activeTab === 'possessions' ? '#fff' : '#888', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.9rem' }}>Items</button>
                        <button onClick={() => setActiveTab('profile')} style={{ background: 'none', border: 'none', color: activeTab === 'profile' ? '#fff' : '#888', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.9rem' }}>Stats</button>
                    </div>
                </div>

                {/* Scrollable Stats Area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    {activeTab === 'story' ? (
                        <>
                            <div className="action-display" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                                <h3 style={{ fontSize: '2rem', margin: 0, fontWeight: '300' }}>{currentActions} <span style={{ fontSize: '1rem', color: '#888' }}>/ {maxActions}</span></h3>
                                <ActionTimer currentActions={currentActions} maxActions={maxActions} lastTimestamp={props.character.lastActionTimestamp || new Date()} regenIntervalMinutes={props.settings.regenIntervalInMinutes || 10} onRegen={handleActionRegen} />
                            </div>
                            <CharacterSheet qualities={props.character.qualities} equipment={props.character.equipment} qualityDefs={props.qualityDefs} settings={props.settings} categories={props.categories} />
                        </>
                    ) : (
                        // Reuse renderContent logic for sidebar if needed, 
                        // OR just render specific panels here if they fit better in sidebar.
                        // For Elysium, Items/Stats usually live in this Left Panel permanently 
                        // while the Right Panel is purely narrative.
                        // But to reuse your components, we can just render them here.
                        activeTab === 'profile' ? <ProfilePanel qualities={props.character.qualities} qualityDefs={props.qualityDefs} imageLibrary={props.imageLibrary} categories={props.categories} />
                        : <Possessions qualities={props.character.qualities} equipment={props.character.equipment} qualityDefs={props.qualityDefs} equipCategories={props.settings.equipCategories || []} onUpdateCharacter={(c) => props.onQualitiesUpdate(c.qualities)} storyId={props.character.storyId} imageLibrary={props.imageLibrary} />
                    )}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 2rem', minHeight: '100%' }}>
                    {activeTab === 'story' ? renderContent() : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', fontStyle: 'italic' }}>
                            Select 'Story' to continue your journey.
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}