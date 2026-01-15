'use client';

import { WorldSettings } from "@/engine/models";
import React from "react";

interface Props {
    settings: WorldSettings;
    theme: string;
}

export default function StoryletStylePreview({ settings, theme }: Props) {
    const imgCfg = settings.imageConfig || {};
    const getAspectRatio = (type: string) => {
        const shape = imgCfg[type as keyof typeof imgCfg] || 'default';
        switch (shape) {
            case 'landscape': return '16/9';
            case 'square': return '1/1';
            case 'circle': return '1/1';
            case 'portrait': return '3/4';
            default: return '3/4';
        }
    };
    const MockImage = ({ shape, type, style, borderRadiusOverride }: { shape?: string, type?: string, style?: React.CSSProperties, borderRadiusOverride?: string }) => {
        const actualShape = shape || imgCfg[type as keyof typeof imgCfg] || 'default';
        let finalRadius = '4px'; 
        
        if (borderRadiusOverride) {
            finalRadius = borderRadiusOverride;
        } else {
            switch (actualShape) {
                case 'circle': finalRadius = '50%'; break;
                case 'rounded': finalRadius = '12px'; break;
                case 'square': finalRadius = '4px'; break;
                default: if (type === 'icon' || type === 'portrait') finalRadius = '4px'; break;
            }
        }

        const { borderRadius: _, ...safeStyle } = style || {};

        return (
            <div style={{ 
                width: '100%', height: '100%', 
                background: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.2)', fontSize: '1.2rem', fontWeight: 'bold',
                borderRadius: finalRadius, 
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
                ...safeStyle
            }}>
                IMG
            </div>
        );
    };
    const MockBar = ({ text, progress, isMenace }: { text: string, progress?: number, isMenace?: boolean }) => (
        <div className="quality-change-item" style={{ width: '100%' }}>
            <div className="quality-change-text" style={{ fontSize: '0.9rem', marginBottom: '0.25rem', color: isMenace ? 'var(--danger-color)' : 'var(--text-secondary)', fontWeight: isMenace ? 'bold' : 'normal' }}>
                {text}
            </div>
            {progress !== undefined && (
                <div className="bar-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="quality-bar-background" style={{ flex: 1, height: '8px', background: 'var(--bg-main)', border:'1px solid var(--border-light)', borderRadius: '2px', overflow:'hidden' }}>
                        <div className="quality-bar-fill" style={{ width: `${progress}%`, height: '100%', background: isMenace ? 'var(--danger-color)' : 'var(--success-color)' }}></div>
                    </div>
                </div>
            )}
        </div>
    );

    const storyletRatio = getAspectRatio('storylet');

    return (
        <div data-theme={theme} className="theme-wrapper" style={{ height: '100%' }}>


            <div className="storylet-container" style={{ position: 'relative', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem', background: 'var(--bg-panel)', height: '100%' }}>
                <div className="storylet-main-content" style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', alignItems: 'flex-start' }}>
                    <div className="storylet-image-frame storylet-image-container" style={{ width: '180px', flexShrink: 0, aspectRatio: storyletRatio }}> 
                        <MockImage type="storylet" shape={imgCfg.storylet} />
                    </div>

                    <div className="storylet-text-content" style={{ flex: 1 }}>
                        <h1 style={{ marginTop: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>A Successful Venture</h1> 
                        <div className="storylet-text" style={{ lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                            <p>You slip past the guards unnoticed. The prize is yours.</p>
                            <p>The weight of the coins is reassuring in your pocket, though the shadow of the Opera House still looms large in your mind.</p>
                        </div>
                    </div>
                </div>
                <div className="quality-changes-container" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ width: '40px', height: '40px', flexShrink: 0, marginTop: '2px' }}>
                            <MockImage type="icon" shape={imgCfg.icon} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <MockBar text="Gold +10" />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ width: '40px', height: '40px', flexShrink: 0, marginTop: '2px' }}>
                            <MockImage type="icon" shape={imgCfg.icon} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <MockBar text="Shadowy has increased to 4!" progress={40} />
                        </div>
                    </div>
                </div>
                <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <button className="option-button continue-button" style={{ width: '100%', padding: '1rem', textAlign: 'center', background: 'var(--accent-primary)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}