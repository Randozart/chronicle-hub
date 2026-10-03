'use client';

import { useState, useEffect } from 'react';
import { PendingEvent, LivingEvent, SocialEvent, QualityDefinition, WorldSettings, ImageDefinition } from '@/engine/models';
import GameImage from './GameImage';
import FormattedText from './FormattedText';
import { GameEngine } from '@/engine/gameEngine';

interface Props {
    pendingEvents: PendingEvent[];
    qualityDefs: Record<string, QualityDefinition>;
    imageLibrary: Record<string, ImageDefinition>;
    settings: WorldSettings;
    engine: GameEngine;
    onAcknowledge: (instanceId: string) => void; 
    onSocialRespond?: (instanceId: string, action: 'accept' | 'decline') => void;
}

const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return "Ready!";
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    if (h > 0) return `${h}h ${m}m`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const formatChange = (c: { qid: string; qualityName?: string; name?: string; levelBefore?: number; levelAfter?: number; cpBefore?: number; cpAfter?: number }) => {
    const label = c.qualityName || c.name || c.qid;
    const levelDelta = (c.levelAfter ?? 0) - (c.levelBefore ?? 0);
    if (levelDelta !== 0) return `${label} ${levelDelta > 0 ? '+' : ''}${levelDelta}`;
    const cpDelta = (c.cpAfter ?? 0) - (c.cpBefore ?? 0);
    if (cpDelta !== 0) return `${label} (${cpDelta > 0 ? '+' : ''}${cpDelta} progress)`;
    return label;
};

export default function LivingStories({ pendingEvents, qualityDefs, imageLibrary, settings, engine, onAcknowledge, onSocialRespond }: Props) {
    const [now, setNow] = useState(Date.now());
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const all = pendingEvents || [];
    const socialStories = all.filter((e): e is SocialEvent => e.type === 'social');
    const livingStories = all.filter((e): e is LivingEvent => e.type !== 'social');
    const activeStories = all;

    const hideWhenEmpty = settings.livingStoriesConfig?.hideWhenEmpty !== false;
    if (activeStories.length === 0 && hideWhenEmpty) return null;

    const title = settings.livingStoriesConfig?.title || "Living Stories";

    const handleAcknowledge = (instanceId: string) => {
        setBusyId(instanceId);
        onAcknowledge(instanceId);
    };

    const handleSocialRespond = (instanceId: string, action: 'accept' | 'decline') => {
        if (!onSocialRespond) return;
        setBusyId(instanceId);
        onSocialRespond(instanceId, action);
    };

    return (
        <div className="living-stories-container">
            <h3 style={{ 
                fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', 
                color: 'var(--accent-highlight)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem'
            }}>
                {title}
            </h3>
            
            {activeStories.length === 0 && !hideWhenEmpty && (
                <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No active timers.</div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {socialStories.map(event => {
                    const senderLabel = event.fromName || 'Another rat';
                    const outcomeLabel = event.outcome === 'fail' ? 'They failed.' : event.outcome === 'pass' ? 'They succeeded.' : '';
                    return (
                        <div key={event.instanceId} className="living-story-card" style={{ 
                            background: 'var(--bg-item)', border: '1px solid var(--accent-highlight)',
                            borderRadius: 'var(--border-radius)', padding: '0.75rem', display: 'flex', gap: '10px'
                        }}>
                            <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>🐀</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{senderLabel}</div>
                                {event.description && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.3' }}>
                                        <FormattedText text={event.description} />
                                    </div>
                                )}
                                {outcomeLabel && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                                        {outcomeLabel}
                                    </div>
                                )}
                                {event.accepted && event.changes && event.changes.length > 0 && (
                                    <div style={{ fontSize: '0.8rem', marginTop: '6px', color: 'var(--success-color)' }}>
                                        {event.changes.map(c => (
                                            <div key={c.qid}>{formatChange(c)}</div>
                                        ))}
                                    </div>
                                )}
                                {event.accepted ? (
                                    <button 
                                        onClick={() => handleAcknowledge(event.instanceId)}
                                        disabled={busyId === event.instanceId}
                                        className="option-button"
                                        style={{ width: '100%', marginTop: '8px', padding: '0.4rem', fontSize: '0.8rem', background: 'var(--success-bg)', color: 'var(--success-color)' }}
                                    >
                                        {busyId === event.instanceId ? 'Processing...' : 'Acknowledge'}
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <button 
                                            onClick={() => handleSocialRespond(event.instanceId, 'accept')}
                                            disabled={busyId === event.instanceId || !onSocialRespond}
                                            className="option-button"
                                            style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', background: 'var(--success-bg)', color: 'var(--success-color)' }}
                                        >
                                            Accept
                                        </button>
                                        <button 
                                            onClick={() => handleSocialRespond(event.instanceId, 'decline')}
                                            disabled={busyId === event.instanceId || !onSocialRespond}
                                            className="option-button"
                                            style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}
                                        >
                                            Decline
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {livingStories.map(event => {
                    const qDef = qualityDefs[event.targetId];
                    const name = qDef?.name || event.targetId;
                    const desc = event.description || qDef?.description || "";
                    
                    const triggerTime = new Date(event.triggerTime).getTime();
                    const startTime = event.startTime 
                        ? new Date(event.startTime).getTime() 
                        : (triggerTime - (event.intervalMs || 10000)); 
                    
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
                            background: 'var(--bg-item)', border: `1px solid ${isComplete ? 'var(--success-color)' : 'var(--border-color)'}`,
                            borderRadius: 'var(--border-radius)', padding: '0.75rem', display: 'flex', gap: '10px'
                        }}>
                            <div style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                                <GameImage code={qDef?.image || event.targetId} imageLibrary={imageLibrary} type="icon" settings={settings} className="option-image"/>
                            </div>
                            
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}><FormattedText text={name} /></span>
                                    {!isComplete && (
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                            {formatTimeLeft(timeLeftMs)}
                                        </span>
                                    )}
                                </div>
                                {renderedDesc && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.3' }}><FormattedText text={renderedDesc} /></div>}
                                
                                {!isComplete && (
                                    <div style={{ height: '6px', background: 'var(--bg-panel)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden', width: '100%' }}>
                                        <div style={{ 
                                            height: '100%', 
                                            width: `${progress}%`, 
                                            background: 'var(--accent-primary)'
                                        }} />
                                    </div>
                                )}
                                {isComplete && (
                                    <button 
                                        onClick={() => handleAcknowledge(event.instanceId)}
                                        disabled={busyId === event.instanceId}
                                        className="option-button"
                                        style={{ width: '100%', marginTop: '8px', padding: '0.4rem', fontSize: '0.8rem', background: 'var(--success-bg)', color: 'var(--success-color)' }}
                                    >
                                        {busyId === event.instanceId ? 'Processing...' : 'Acknowledge'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
