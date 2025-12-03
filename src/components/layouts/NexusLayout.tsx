'use client';

import { useState } from 'react';
import { LayoutProps } from './LayoutProps';
import CharacterSheet from '../CharacterSheet';
import LocationHeader from '../LocationHeader';
import LocationStorylets from '../LocationStorylets';
import OpportunityHand from '../OpportunityHand';
import StoryletDisplay from '../StoryletDisplay';
import ProfilePanel from '../ProfilePanel';
import Possessions from '../Possessions';
import ActionTimer from '../ActionTimer';
import WalletHeader from '../WalletHeader';
import MarketInterface from '../MarketInterface';

export default function NexusLayout(props: LayoutProps) {
    const [activeTab, setActiveTab] = useState<'story' | 'possessions' | 'profile'>('story');

    // Logic
    const actionQid = props.settings.actionId.replace('$', '');
    const actionState = props.character.qualities[actionQid];
    const currentActions = (actionState && 'level' in actionState) ? actionState.level : 0;
    const maxActions = typeof props.settings.maxActions === 'number' ? props.settings.maxActions : 20;

    const renderContent = () => {
        if (activeTab === 'profile') {
            return <ProfilePanel qualities={props.character.qualities} qualityDefs={props.qualityDefs} imageLibrary={props.imageLibrary} categories={props.categories} settings={props.settings} />;
        }
        if (activeTab === 'possessions') {
            return <Possessions qualities={props.character.qualities} equipment={props.character.equipment} qualityDefs={props.qualityDefs} equipCategories={props.settings.equipCategories || []} onUpdateCharacter={(c) => props.onQualitiesUpdate(c.qualities)} storyId={props.character.storyId} imageLibrary={props.imageLibrary} settings={props.settings} />;
        }
        
        if (props.isLoading) return <div className="loading-container"><p>Loading...</p></div>;
        
        if (props.showMarket && props.activeMarket) {
            return (
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
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

        if (props.activeEvent) {
            return (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <LocationHeader 
                    location={props.location} 
                    imageLibrary={props.imageLibrary} 
                    onOpenMap={props.onOpenMap}
                    onOpenMarket={props.currentMarketId ? props.onOpenMarket : undefined}
                />
                <div style={{ marginTop: '2rem' }}>
                    <LocationStorylets storylets={props.locationStorylets} onStoryletClick={props.onOptionClick} qualities={props.character.qualities} qualityDefs={props.qualityDefs} imageLibrary={props.imageLibrary} />
                </div>
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
            </div>
        );
    };

    return (
        <div className="layout-grid-nexus">
            {/* LEFT SIDEBAR */}
            <div className="sidebar-panel">
                <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <WalletHeader qualities={props.character.qualities} qualityDefs={props.qualityDefs} settings={props.settings} imageLibrary={props.imageLibrary} />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    <div className="action-box">
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>{currentActions} / {maxActions}</h3>
                        <ActionTimer currentActions={currentActions} maxActions={maxActions} lastTimestamp={props.character.lastActionTimestamp || new Date()} regenIntervalMinutes={props.settings.regenIntervalInMinutes || 10} onRegen={() => {}} />
                    </div>

                    <CharacterSheet qualities={props.character.qualities} equipment={props.character.equipment} qualityDefs={props.qualityDefs} settings={props.settings} categories={props.categories} />
                </div>

                <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <button onClick={props.onExit} className="switch-char-btn">← Switch Character</button>
                </div>
            </div>
            
            {/* MAIN CONTENT */}
            <div className="layout-column" style={{ overflow: 'hidden' }}>
                <div className="tab-bar">
                    <button onClick={() => setActiveTab('story')} className={`tab-btn ${activeTab === 'story' ? 'active' : ''}`}>Story</button>
                    <button onClick={() => setActiveTab('possessions')} className={`tab-btn ${activeTab === 'possessions' ? 'active' : ''}`}>Possessions</button>
                    <button onClick={() => setActiveTab('profile')} className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}>Myself</button>
                </div>
                
                <div className="content-area" style={{ padding: '2rem' }}>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}