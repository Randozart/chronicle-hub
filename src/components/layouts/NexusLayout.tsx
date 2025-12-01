'use client';

import { LayoutProps } from './LayoutProps';
import CharacterSheet from '../CharacterSheet';
import LocationHeader from '../LocationHeader';
import LocationStorylets from '../LocationStorylets';
import OpportunityHand from '../OpportunityHand';
import StoryletDisplay from '../StoryletDisplay';
import ProfilePanel from '../ProfilePanel';
import Possessions from '../Possessions';
import ActionTimer from '../ActionTimer';
import { useState } from 'react';

export default function NexusLayout(props: LayoutProps) {
    const [activeTab, setActiveTab] = useState<'story' | 'possessions' | 'profile'>('story');

    // Helper for Action Timer (logic copied from GameHub or passed down? 
    // Ideally passed down, but local state update logic can live here or be hoisted).
    // For simplicity, assume props handles the heavy lifting, but UI state is local.

    // Calculate Actions for Timer
    const actionQid = props.settings.actionId.replace('$', '');
    const actionState = props.character.qualities[actionQid];
    const currentActions = (actionState && 'level' in actionState) ? actionState.level : 0;
    const maxActions = typeof props.settings.maxActions === 'number' ? props.settings.maxActions : 20;

    const renderContent = () => {
        if (activeTab === 'profile') {
            return <ProfilePanel 
                qualities={props.character.qualities} 
                qualityDefs={props.qualityDefs} 
                imageLibrary={props.imageLibrary} 
                categories={props.categories}
                settings={props.settings} /* <--- MAKE SURE THIS IS HERE */
            />;
        }
        if (activeTab === 'possessions') {
            return <Possessions 
                qualities={props.character.qualities} 
                equipment={props.character.equipment}
                qualityDefs={props.qualityDefs}
                equipCategories={props.settings.equipCategories || []}
                onUpdateCharacter={(c) => props.onQualitiesUpdate(c.qualities)} // Simplified update
                storyId={props.character.storyId}
                imageLibrary={props.imageLibrary}
            />;
        }
        
        // Story Tab
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
                    characterId={props.character.characterId} // <--- ADD THIS

                />
            );
        }

        return (
            <>
                <LocationHeader 
                    location={props.location} 
                    imageLibrary={props.imageLibrary} 
                    onOpenMap={props.onOpenMap} // <--- Pass it
                />
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
        <div className="hub-layout">
            <div className="sidebar-column left">
                {/* Action Timer */}
                <div className="action-display" style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-panel)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Actions: {currentActions} / {maxActions}</h3>
                    <ActionTimer 
                        currentActions={currentActions}
                        maxActions={maxActions}
                        lastTimestamp={props.character.lastActionTimestamp || new Date()}
                        regenIntervalMinutes={props.settings.regenIntervalInMinutes || 10}
                        onRegen={() => { /* Trigger Refetch or Optimistic Update */ }}
                    />
                </div>

                <CharacterSheet 
                    qualities={props.character.qualities} 
                    equipment={props.character.equipment}
                    qualityDefs={props.qualityDefs}
                    settings={props.settings}
                    categories={props.categories}
                />

                <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <button 
                        onClick={props.onExit}
                        style={{ 
                            background: 'transparent', border: '1px solid var(--danger-color)', 
                            color: 'var(--danger-color)', width: '100%', padding: '0.5rem', 
                            borderRadius: 'var(--border-radius)', cursor: 'pointer', fontWeight: 'bold'
                        }}
                        className="hover:bg-red-900/20 transition"
                    >
                        ← Switch Character
                    </button>
                </div>
            </div>
            
            <div className="main-content-column">
                <div className="hub-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <button 
                        onClick={() => setActiveTab('story')} 
                        style={{ 
                            padding: '0.5rem 1rem', 
                            background: activeTab === 'story' ? 'var(--bg-item)' : 'transparent', // Active BG
                            color: 'white', // Always white text
                            border: 'none', 
                            cursor: 'pointer',
                            borderRadius: '4px 4px 0 0'
                        }}
                    >
                        Story
                    </button>
                    <button 
                        onClick={() => setActiveTab('possessions')} 
                        style={{ 
                            padding: '0.5rem 1rem', 
                            background: activeTab === 'possessions' ? 'var(--bg-item)' : 'transparent', 
                            color: 'white', 
                            border: 'none', 
                            cursor: 'pointer',
                            borderRadius: '4px 4px 0 0'
                        }}
                    >
                        Possessions
                    </button>
                    <button 
                        onClick={() => setActiveTab('profile')} 
                        style={{ 
                            padding: '0.5rem 1rem', 
                            background: activeTab === 'profile' ? 'var(--bg-item)' : 'transparent', 
                            color: 'white', 
                            border: 'none', 
                            cursor: 'pointer',
                            borderRadius: '4px 4px 0 0'
                        }}
                    >
                        Myself
                    </button>
                </div>
                {renderContent()}
            </div>
            <div className="sidebar-column right"></div>
        </div>
    );
}