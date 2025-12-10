'use client'

import { CharacterDocument, ImageDefinition, LocationDefinition, SystemMessage, WorldSettings } from "@/engine/models";
import SystemMessageBanner from "./SystemMessageBanner";
import { useState } from "react";
import GameImage from "./GameImage";

interface CharacterLobbyProps {
    settings: WorldSettings;
    systemMessage?: SystemMessage | null;
    initialCharacter: CharacterDocument | null; 
    availableCharacters: { 
        characterId: string; 
        name: string; 
        currentLocationId: string; 
        lastActionTimestamp?: string;
        portrait?: string | null; 
    }[];
    imageLibrary: Record<string, ImageDefinition>;
    locations: Record<string, LocationDefinition>;
    storyId: string; 
}
export default function CharacterLobby (props: CharacterLobbyProps) {
            // Use the theme from settings
    const theme = props.settings.visualTheme || 'default';
    const [character, setCharacter] = useState<CharacterDocument | null>(props.initialCharacter);
    
    const handleDismissMessage = async () => {
        if (!props.systemMessage || !character) return;
        try {
            await fetch('/api/character/acknowledge-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId: character.characterId, messageId: props.systemMessage.id })
            });
        } catch (e) { console.error(e); }
    }; 

    const handleDeleteChar = async (charId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent clicking the card itself
        if (!confirm("Permanently delete this character? This cannot be undone.")) return;
        
        try {
            await fetch('/api/character/delete', {
                method: 'DELETE',
                body: JSON.stringify({ storyId: props.storyId, characterId: charId })
            });
            window.location.reload();
        } catch (err) { console.error(err); }
    };


    return (
        <div 
            className="theme-wrapper" 
            data-theme={theme} 
            style={{ 
                minHeight: '100vh', 
                width: '100vw',
                background: 'var(--bg-main)', // Loads theme background (image/color)
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                position: 'fixed', // Lock to screen
                top: 0, left: 0
            }}
        >
            {props.systemMessage && (
                <SystemMessageBanner 
                    message={props.systemMessage} 
                    type="world" 
                    onDismiss={handleDismissMessage} 
                />
            )}

            {/* Overlay for readability if background is busy */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 0 }} />
            
            <div style={{ 
                width: '100%', maxWidth: '500px', padding: '2rem', 
                zIndex: 10, position: 'relative',
                background: 'var(--bg-panel)', 
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}>
                <h1 style={{ 
                    textAlign: 'center', marginBottom: '2rem', marginTop: 0,
                    color: 'var(--text-primary)', fontFamily: 'var(--font-main)',
                    textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1.5rem'
                }}>
                    Select Character
                </h1>
                
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {props.availableCharacters.map((c, index) => (
                        <button 
                            key={c.characterId || index} 
                            onClick={() => window.location.href = `/play/${props.storyId}?charId=${c.characterId}`}
                            className="option-button" // Use standard class for hover effects
                            style={{ 
                                padding: '1rem', 
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                textAlign: 'left', width: '100%'
                            }}
                        >
                            {/* PORTRAIT */}
                            <div style={{ 
                                width: '60px', height: '60px', borderRadius: '50%', 
                                overflow: 'hidden', border: '2px solid var(--accent-primary)',
                                flexShrink: 0, background: '#000'
                            }}>
                                <GameImage 
                                    code={c.portrait || "default_avatar"} 
                                    imageLibrary={props.imageLibrary} 
                                    type="portrait" 
                                    className="w-full h-full object-cover"
                                    alt=""
                                />
                            </div>

                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--accent-highlight)', fontSize: '1.1rem' }}>
                                    {c.name}
                                </h3>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    {props.locations[c.currentLocationId]?.name || "Unknown Location"}
                                </p>
                            </div>
                            
                            {/* DELETE BUTTON */}
                            <div 
                                onClick={(e) => handleDeleteChar(c.characterId, e)}
                                style={{ 
                                    color: 'var(--danger-color)', padding: '0.5rem', 
                                    cursor: 'pointer', fontSize: '1.2rem', opacity: 0.6
                                }}
                                title="Delete Save"
                                className="hover:opacity-100"
                            >
                                ✕
                            </div>
                        </button>
                    ))}
                    
                    <button 
                        onClick={() => window.location.href = `/play/${props.storyId}/creation`}
                        className="option-button"
                        style={{ 
                            border: '2px dashed var(--border-color)', 
                            background: 'transparent', 
                            color: 'var(--text-muted)', 
                            textAlign: 'center', justifyContent: 'center',
                            padding: '1rem'
                        }}
                    >
                        + Create New Character
                    </button>
                </div>

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <button 
                        onClick={() => window.location.href = '/'}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );

};