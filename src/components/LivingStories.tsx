'use client';

import { useState, useEffect } from 'react';
import { PendingEvent, QualityDefinition, WorldSettings, ImageDefinition } from '@/engine/models';
import GameImage from './GameImage';
import FormattedText from './FormattedText';
import { GameEngine } from '@/engine/gameEngine';

interface Props {
    pendingEvents: PendingEvent[];
    qualityDefs: Record<string, QualityDefinition>;
    imageLibrary: Record<string, ImageDefinition>;
    settings: WorldSettings;
    engine: GameEngine;
}

const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return "Complete";
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    if (h > 0) return `${h}h ${m}m`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function LivingStories({ pendingEvents, qualityDefs, imageLibrary, settings, engine }: Props) {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const activeStories = pendingEvents.filter(e => {
        return true;
    });

    if (activeStories.length === 0) return null;

    const title = settings.livingStoriesConfig?.title || "Living Stories";

    return (
        <div className="living-stories-container">
            <h3 style={{ 
                fontSize: '0.9rem', 
                textTransform: 'uppercase', 
                letterSpacing: '1px', 
                color: 'var(--accent-highlight)', 
                marginBottom: '1rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.5rem'
            }}>
                {title}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activeStories.map(event => {
                    const qDef = qualityDefs[event.targetId];
                    const name = qDef?.name || event.targetId;
                    const desc = event.description || qDef?.description || "";
                    
                    const triggerTime = new Date(event.triggerTime).getTime();
                    const startTime = event.startTime ? new Date(event.startTime).getTime() : now; 
                    const totalDuration = triggerTime - startTime;
                    const elapsed = now - startTime;
                    
                    let progress = 0;
                    if (totalDuration > 0) {
                        progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
                    }

                    const timeLeftMs = triggerTime - now;
                    const isComplete = timeLeftMs <= 0;
                    
                    const renderedDesc = engine.evaluateText(desc);

                    return (
                        <div key={event.instanceId} className="living-story-card" style={{ 
                            background: 'var(--bg-item)', 
                            border: `1px solid ${isComplete ? 'var(--success-color)' : 'var(--border-color)'}`,
                            borderRadius: 'var(--border-radius)',
                            padding: '0.75rem',
                            display: 'flex',
                            gap: '10px'
                        }}>
                            <div style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                                <GameImage 
                                    code={qDef?.image || event.targetId} 
                                    imageLibrary={imageLibrary} 
                                    type="icon" 
                                    settings={settings}
                                    className="option-image"
                                />
                            </div>
                            
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                                        <FormattedText text={name} />
                                    </span>
                                    <span style={{ 
                                        fontSize: '0.8rem', 
                                        color: isComplete ? 'var(--success-color)' : 'var(--text-secondary)',
                                        fontFamily: 'monospace',
                                        fontWeight: 'bold'
                                    }}>
                                        {isComplete ? "Ready!" : formatTimeLeft(timeLeftMs)}
                                    </span>
                                </div>
                                
                                {renderedDesc && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.3' }}>
                                        <FormattedText text={renderedDesc} />
                                    </div>
                                )}
                                
                                {!isComplete && (
                                    <div style={{ 
                                        height: '6px', 
                                        background: 'var(--bg-panel)', 
                                        borderRadius: '3px', 
                                        marginTop: '8px',
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}>
                                        <div style={{ 
                                            height: '100%', 
                                            width: `${progress}%`, 
                                            background: 'var(--accent-primary)',
                                            transition: 'width 1s linear'
                                        }} />
                                    </div>
                                )}
                                {isComplete && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--success-color)', marginTop: '5px', fontStyle: 'italic' }}>
                                        Event has triggered. Refresh to see effects.
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <style jsx>{`
                @keyframes pulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { opacity: 0.6; }
                }
            `}</style>
        </div>
    );
}