'use client';

import { useState } from 'react';
import { LayoutProps } from './LayoutProps';
import NexusLayout from './NexusLayout'; // We can reuse parts, but let's keep it independent for clarity
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

    // Action Logic (Same as Nexus)
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
                />
            );
        }

        return (
            <>
                {/* NOTE: No LocationHeader here. We use the banner above. */}
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
            

            <div style={{ 
                position: 'relative', 
                height: '300px', // Made slightly taller
                overflow: 'hidden', 
                borderBottom: '1px solid #444'
            }}>
<               div className="london-banner" style={{ position: 'relative', height: '300px', overflow: 'hidden' }}>
                    <GameImage 
                        code={props.location.image} 
                        imageLibrary={props.imageLibrary} 
                        type="location" 
                        alt=""
                        className="banner-bg-image"
                    />
                </div>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #181a1f, transparent)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', padding: '2rem', textAlign: 'center', width: '100%', maxWidth: '1200px' }}>
                    <h1 style={{ fontSize: '4rem', margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.9)', fontFamily: 'serif', letterSpacing: '2px' }}>
                        {props.location.name}
                    </h1>
                </div>
            </div>

            {/* --- CONTENT CONTAINER --- */}
            <div style={{ 
                maxWidth: '1400px', 
                margin: '0 auto', 
                padding: '2rem', 
                width: '100%', 
                flex: 1 
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '3rem' }}>
                {/* Sidebar */}
                <div>
                    <div className="action-display" style={{ marginBottom: '1rem', padding: '1rem', background: '#1e2127', borderRadius: '8px', border: '1px solid #444' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Actions: {currentActions} / {maxActions}</h3>
                        <ActionTimer currentActions={currentActions} maxActions={maxActions} lastTimestamp={props.character.lastActionTimestamp || new Date()} regenIntervalMinutes={props.settings.regenIntervalInMinutes || 10} onRegen={handleActionRegen} />
                    </div>
                    <CharacterSheet qualities={props.character.qualities} equipment={props.character.equipment} qualityDefs={props.qualityDefs} settings={props.settings} categories={props.categories} />
                </div>

                {/* Main Content */}
                <div>
                    <div className="hub-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid #444' }}>
                        <button onClick={() => setActiveTab('story')} style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'story' ? '2px solid #fff' : '2px solid transparent', color: activeTab === 'story' ? '#fff' : '#777', cursor: 'pointer' }}>Story</button>
                        <button onClick={() => setActiveTab('possessions')} style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'possessions' ? '2px solid #fff' : '2px solid transparent', color: activeTab === 'possessions' ? '#fff' : '#777', cursor: 'pointer' }}>Possessions</button>
                        <button onClick={() => setActiveTab('profile')} style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'profile' ? '2px solid #fff' : '2px solid transparent', color: activeTab === 'profile' ? '#fff' : '#777', cursor: 'pointer' }}>Myself</button>
                    </div>
                    {renderContent()}
                </div>
            </div>
        </div>
    </div>
    );
}