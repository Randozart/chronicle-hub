'use client'

import { CharacterDocument, ImageDefinition, LocationDefinition, SystemMessage, WorldSettings } from "@/engine/models";
import SystemMessageBanner from "./SystemMessageBanner";
import { useState, useEffect } from "react";
import GameImage from "./GameImage";
import GameModal from "./GameModal";
import { useSearchParams } from "next/navigation";

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
    isGuest?: boolean;
}

export default function CharacterLobby (props: CharacterLobbyProps) {
    const theme = props.settings.visualTheme || 'default';
    const [charToDelete, setCharToDelete] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [guestChar, setGuestChar] = useState<CharacterDocument | null>(null);
    
    const searchParams = useSearchParams();
    const isPlaytest = searchParams.get('playtest') === 'true';
    const urlSuffix = isPlaytest ? '&playtest=true' : '';

    useEffect(() => {
        if (props.isGuest) {
            const localKey = `chronicle_guest_${props.storyId}`;
            const stored = localStorage.getItem(localKey);
            if (stored) {
                try {
                    setGuestChar(JSON.parse(stored));
                } catch (e) { console.error("Error parsing guest save", e); }
            }
        }
    }, [props.isGuest, props.storyId]);

    const hideIdentity = props.settings.hideProfileIdentity === true;
    const skipCreation = props.settings.skipCharacterCreation === true;
    
    const portraitStyle = props.settings.portraitStyle || 'circle';
    const borderRadius = portraitStyle === 'circle' ? '50%' : (portraitStyle === 'rounded' ? '8px' : '0px');

    const handleDismissMessage = async () => {
    }; 

    const requestDelete = (charId: string, e: React.MouseEvent) => {
        e.stopPropagation(); 
        setCharToDelete(charId);
    };

    const confirmDelete = async () => {
        if (!charToDelete) return;

        if (props.isGuest) {
            localStorage.removeItem(`chronicle_guest_${props.storyId}`);
            setGuestChar(null);
            setCharToDelete(null);
        } else {
            try {
                await fetch('/api/character/delete', {
                    method: 'DELETE',
                    body: JSON.stringify({ storyId: props.storyId, characterId: charToDelete })
                });
                window.location.reload();
            } catch (err) { console.error(err); }
        }
    };
    const handleStartGame = async () => {
        setIsCreating(true);
        try {
            const response = await fetch('/api/character/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: props.storyId, choices: { name: 'Drifter' } }) 
            });
            
            const data = await response.json();
            if (data.success && data.character) {
                if (props.isGuest) {
                    localStorage.setItem(`chronicle_guest_${props.storyId}`, JSON.stringify(data.character));
                    window.location.href = `/play/${props.storyId}?guest=true${urlSuffix}`; 
                } else {
                    window.location.href = `/play/${props.storyId}?char=${data.character.characterId}${urlSuffix}`;
                }
            } else {
                alert("Failed to create character: " + (data.error || "Unknown Error"));
                setIsCreating(false);
            }
        } catch (e) {
            console.error(e);
            alert("Network error occurred.");
            setIsCreating(false);
        }
    };

    return (
        <div 
            className="theme-wrapper" 
            data-theme={theme} 
            style={{ 
                height: '100vh', 
                width: '100vw',
                overflowY: 'auto', 
                // background: 'var(--bg-main)',
                // backgroundSize: 'cover',
                // backgroundPosition: 'center',
                display: 'flex', 
                flexDirection: 'column',
                position: 'fixed',
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

            <GameModal
                isOpen={!!charToDelete}
                type="danger"
                title="Delete Character?"
                message="Are you sure you want to permanently delete this character? This action cannot be undone."
                confirmLabel="Delete Forever"
                onConfirm={confirmDelete}
                onClose={() => setCharToDelete(null)}
            />

            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 0 }} />
            
            <div style={{ 
                width: '100%', maxWidth: '500px', padding: '2rem', 
                zIndex: 10, position: 'relative',
                background: 'var(--bg-panel)', 
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                margin: 'auto', 
                flexShrink: 0
            }}>
                <h1 style={{ 
                    textAlign: 'center', marginBottom: '2rem', marginTop: 0,
                    color: 'var(--text-primary)', fontFamily: 'var(--font-main)',
                    textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1.5rem'
                }}>
                    Select Character
                </h1>
                
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {props.isGuest && guestChar && (
                        <button 
                            onClick={() => window.location.href = `/play/${props.storyId}?guest=true${urlSuffix}`} 
                            className="option-button"
                            style={{ 
                                padding: '1rem', 
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                textAlign: 'left', width: '100%'
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--accent-highlight)', fontSize: '1.1rem' }}>
                                    {guestChar.name || "Guest"}
                                </h3>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    Local Save • {props.locations[guestChar.currentLocationId]?.name || "Unknown Location"}
                                </p>
                            </div>
                            <div 
                                onClick={(e) => requestDelete(guestChar.characterId, e)}
                                style={{ color: 'var(--danger-color)', padding: '0.5rem', cursor: 'pointer', fontSize: '1.2rem', opacity: 0.6 }}
                                title="Delete Save"
                                className="hover:opacity-100"
                            >
                                ✕
                            </div>
                        </button>
                    )}
                    {!props.isGuest && props.availableCharacters.map((c, index) => {
                        const sizeSetting = props.settings.portraitSize || 'medium';
                        const sizeMap: Record<string, string> = {
                            small: '50px',
                            medium: '70px',
                            large: '100px'
                        };
                        const width = sizeMap[sizeSetting] || '70px';
                        const effectiveShape = props.settings.portraitStyle || 'circle';

                        return (
                            <button 
                                key={c.characterId || index} 
                                onClick={() => window.location.href = `/play/${props.storyId}?char=${c.characterId}${urlSuffix}`}
                                className="option-button"
                                style={{ 
                                    padding: '1rem', 
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    textAlign: 'left', width: '100%'
                                }}
                            >
                                {!hideIdentity && (
                                    <div style={{ 
                                        width: width,
                                        aspectRatio: effectiveShape === 'rect' ? '3/4' : '1/1',
                                        borderRadius: borderRadius,
                                        overflow: 'hidden', 
                                        border: '2px solid var(--accent-primary)',
                                        flexShrink: 0, background: '#000'
                                    }}
                                    >
                                        <GameImage 
                                            code={c.portrait || "default_avatar"} 
                                            imageLibrary={props.imageLibrary} 
                                            type="portrait" 
                                            settings={props.settings}
                                            shapeOverride={effectiveShape}
                                            className="w-full h-full object-cover"
                                            alt=""
                                        />
                                    </div>
                                )}

                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--accent-highlight)', fontSize: '1.1rem' }}>
                                        {hideIdentity ? `Save Slot ${index + 1}` : c.name}
                                    </h3>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        {props.locations[c.currentLocationId]?.name || "Unknown Location"}
                                    </p>
                                </div>
                                
                                <div 
                                    onClick={(e) => requestDelete(c.characterId, e)}
                                    style={{ color: 'var(--danger-color)', padding: '0.5rem', cursor: 'pointer', fontSize: '1.2rem', opacity: 0.6 }}
                                    title="Delete Save"
                                    className="hover:opacity-100"
                                >
                                    ✕
                                </div>
                            </button>
                        );
                    })}
                    {(!props.isGuest || !guestChar) && (
                        <button 
                            onClick={skipCreation ? handleStartGame : () => window.location.href = `/play/${props.storyId}/creation?${urlSuffix.replace('&', '')}`}
                            className="option-button"
                            disabled={isCreating}
                            style={{ 
                                border: '2px dashed var(--border-color)', 
                                background: 'transparent', 
                                color: 'var(--text-muted)', 
                                textAlign: 'center', justifyContent: 'center',
                                padding: '1rem',
                                cursor: isCreating ? 'wait' : 'pointer'
                            }}
                        >
                            {isCreating 
                                ? "Creating..." 
                                : (skipCreation ? "+ Start New Game" : "+ Create New Character")
                            }
                        </button>
                    )}
                    {props.isGuest && guestChar && (
                        <button
                            onClick={() => {
                                if (confirm("Starting a new game will overwrite your current Guest save. Continue?")) {
                                    localStorage.removeItem(`chronicle_guest_${props.storyId}`);
                                    
                                    if (skipCreation) {
                                        handleStartGame();
                                    } else {
                                        window.location.href = `/play/${props.storyId}/creation?${urlSuffix.replace('&', '')}`;
                                    }
                                }
                            }}
                            className="option-button"
                            style={{ 
                                padding: '0.8rem', 
                                opacity: 0.7, 
                                fontSize: '0.9rem', 
                                border: '1px solid var(--border-color)', 
                                background: 'transparent',
                                marginTop: '1rem' 
                            }}
                        >
                            Start Over (Overwrite Save)
                        </button>
                    )}
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