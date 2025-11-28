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

export default function LondonLayout(props: LayoutProps) {
    const [activeTab, setActiveTab] = useState<'story' | 'possessions' | 'profile'>('story');

    const actionQid = props.settings.actionId.replace('$', '');
    const actionState = props.character.qualities[actionQid];
    const currentActions = (actionState && 'level' in actionState) ? actionState.level : 0;
    const maxActions = typeof props.settings.maxActions === 'number' ? props.settings.maxActions : 20;
    const handleActionRegen = () => props.onQualitiesUpdate({ ...props.character.qualities, [actionQid]: { ...actionState, level: currentActions + 1 } as any });

    const renderContent = () => {
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
                <LocationStorylets
                    storylets={props.locationStorylets}
                    onStoryletClick={props.onOptionClick}
                    qualities={props.character.qualities}
                    qualityDefs={props.qualityDefs}
                    imageLibrary={props.imageLibrary}
                />
                <OpportunityHand 
                    hand={props.hand} 
                    onCardClick={props.onOptionClick}
                    onDrawClick={props.onDrawClick}
                    isLoading={props.isLoading} 
                    qualities={props.character.qualities}
                    qualityDefs={props.qualityDefs}
                    imageLibrary={props.imageLibrary}
                />
            </>
        );
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            
            {/* --- FULL WIDTH BANNER --- */}
            <div style={{ 
                position: 'relative', 
                height: '300px', 
                overflow: 'hidden', 
                borderBottom: '1px solid var(--border-color)',
                marginBottom: '2rem'
            }}>
                <div style={{ position: 'absolute', inset: 0 }}>
                    <GameImage 
                        code={props.location.image} 
                        imageLibrary={props.imageLibrary} 
                        type="location" 
                        alt=""
                        className="banner-bg-image" // Expects global CSS for object-fit
                    />
                </div>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #181a1f, transparent)' }} />
                
                {/* Banner Content */}
                <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', padding: '2rem', textAlign: 'center', width: '100%', maxWidth: '1200px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <h1 style={{ fontSize: '4rem', margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.9)', fontFamily: 'inherit', letterSpacing: '2px', color: 'var(--accent-highlight)' }}>
                        {props.location.name}
                    </h1>
                    
                    {/* TRAVEL BUTTON */}
                    <button 
                        onClick={props.onOpenMap}
                        style={{ 
                            background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-primary)', 
                            color: 'var(--accent-highlight)', padding: '0.5rem 1.5rem', borderRadius: '4px',
                            cursor: 'pointer', textTransform: 'uppercase', fontWeight: 'bold',
                            backdropFilter: 'blur(5px)', marginBottom: '10px'
                        }}
                        className="hover:bg-white hover:text-black transition"
                    >
                        Travel
                    </button>
                </div>
            </div>

            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem', width: '100%', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '3rem' }}>
                    <div>
                        <div className="action-display" style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-panel)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Actions: {currentActions} / {maxActions}</h3>
                            <ActionTimer currentActions={currentActions} maxActions={maxActions} lastTimestamp={props.character.lastActionTimestamp || new Date()} regenIntervalMinutes={props.settings.regenIntervalInMinutes || 10} onRegen={handleActionRegen} />
                        </div>
                        <CharacterSheet qualities={props.character.qualities} equipment={props.character.equipment} qualityDefs={props.qualityDefs} settings={props.settings} categories={props.categories} />
                    </div>

                    <div>
                        <div className="hub-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                            <button onClick={() => setActiveTab('story')} style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'story' ? '2px solid var(--text-primary)' : '2px solid transparent', color: activeTab === 'story' ? 'var(--text-primary)' : '#777', cursor: 'pointer' }}>Story</button>
                            <button onClick={() => setActiveTab('possessions')} style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'possessions' ? '2px solid var(--text-primary)' : '2px solid transparent', color: activeTab === 'possessions' ? 'var(--text-primary)' : '#777', cursor: 'pointer' }}>Possessions</button>
                            <button onClick={() => setActiveTab('profile')} style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'profile' ? '2px solid var(--text-primary)' : '2px solid transparent', color: activeTab === 'profile' ? 'var(--text-primary)' : '#777', cursor: 'pointer' }}>Myself</button>
                        </div>
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}