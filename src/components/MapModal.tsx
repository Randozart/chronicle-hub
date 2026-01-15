'use client';

import { LocationDefinition, MapRegion, ImageDefinition } from "@/engine/models";
import GameImage from "./GameImage";

interface MapModalProps {
    currentLocationId: string;
    locations: Record<string, LocationDefinition>;
    regions: Record<string, MapRegion>;
    imageLibrary: Record<string, ImageDefinition>;
    onTravel: (locationId: string) => void;
    onClose: () => void;
}

export default function MapModal({ 
    currentLocationId, locations, regions, imageLibrary, onTravel, onClose 
}: MapModalProps) {
    
    const currentLoc = locations[currentLocationId];
    const regionId = currentLoc?.regionId || (currentLoc as any)?.map || 'default';
    const region = regions[regionId];
    const visibleLocations = Object.values(locations).filter(l => 
        (l.regionId === regionId) || ((l as any).map === regionId)
    );
    const hasVisualMap = region && region.image;

    return (
        <div style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'var(--bg-overlay)',
            backdropFilter: 'blur(2px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 9999,
            padding: '1rem'
        }}>
            <div style={{ 
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--border-radius)', 
                boxShadow: 'var(--shadow-modal)',
                width: '100%', 
                maxWidth: '900px', 
                display: 'flex', 
                flexDirection: 'column', 
                maxHeight: '90vh',
                color: 'var(--text-primary)' 
            }}>
                <div style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '1rem', borderBottom: '1px solid var(--border-color)' 
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
                        Travel: <span style={{ color: 'var(--accent-highlight)' }}>{region?.name || "Local Area"}</span>
                    </h2>
                    <button 
                        onClick={onClose} 
                        style={{ 
                            background: 'none', border: 'none', 
                            color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' 
                        }}
                        className="hover-text-primary"
                    >✕</button>
                </div>
                <div style={{ 
                    flex: 1, overflow: 'auto', position: 'relative', 
                    backgroundColor: 'var(--bg-main)'
                }}>
                    
                    {hasVisualMap ? (
                        <div style={{ position: 'relative', width: '100%', minHeight: '400px' }}>
                            <GameImage 
                                code={region.image || ""} 
                                imageLibrary={imageLibrary} 
                                type="map"
                                alt="Map"
                                className="w-full h-auto block" 
                                style={{ width: '100%', display: 'block', userSelect: 'none' }}
                            />
                            {visibleLocations.map(loc => {
                                const x = loc.coordinates?.x ?? 50;
                                const y = loc.coordinates?.y ?? 50;
                                const isCurrent = loc.id === currentLocationId;

                                return (
                                    <div
                                        key={loc.id}
                                        style={{
                                            position: 'absolute',
                                            left: `${x}%`,
                                            top: `${y}%`,
                                            transform: 'translate(-50%, -50%)',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                            zIndex: 10,
                                            cursor: isCurrent ? 'default' : 'pointer'
                                        }}
                                        onClick={() => !isCurrent && onTravel(loc.id)}
                                        title={loc.name}
                                    >
                                        <div style={{
                                            width: '40px', height: '40px',
                                            borderRadius: '50%',
                                            border: `2px solid ${isCurrent ? 'var(--success-color)' : 'var(--border-color)'}`,
                                            backgroundColor: isCurrent ? 'var(--bg-panel)' : 'var(--bg-item)',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                                            overflow: 'hidden',
                                            transition: 'transform 0.2s',
                                        }}
                                        className={!isCurrent ? "hover-scale" : ""}
                                        >
                                            <GameImage 
                                                code={loc.image} 
                                                imageLibrary={imageLibrary} 
                                                type="icon" 
                                                alt={loc.name}
                                            />
                                        </div>
                                        <div style={{
                                            marginTop: '4px',
                                            backgroundColor: 'rgba(0,0,0,0.8)',
                                            color: '#fff',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            whiteSpace: 'nowrap',
                                            pointerEvents: 'none'
                                        }}>
                                            {loc.name}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                            {visibleLocations.map(loc => {
                                const isCurrent = loc.id === currentLocationId;
                                return (
                                    <button
                                        key={loc.id}
                                        disabled={isCurrent}
                                        onClick={() => onTravel(loc.id)}
                                        style={{
                                            padding: '1rem', 
                                            borderRadius: 'var(--border-radius)', 
                                            border: `1px solid ${isCurrent ? 'var(--success-color)' : 'var(--border-light)'}`,
                                            backgroundColor: isCurrent ? 'var(--success-bg)' : 'var(--bg-item)',
                                            display: 'flex', alignItems: 'center', gap: '1rem',
                                            cursor: isCurrent ? 'default' : 'pointer',
                                            textAlign: 'left',
                                            color: 'var(--text-primary)'
                                        }}
                                        className={!isCurrent ? "hover-bg-lighter" : ""}
                                    >
                                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-light)' }}>
                                            <GameImage 
                                                code={loc.image} 
                                                imageLibrary={imageLibrary} 
                                                type="location" 
                                                alt=""
                                                className="location-image"
                                            />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{loc.name}</div>
                                            {isCurrent && <div style={{ fontSize: '0.75rem', color: 'var(--success-text)', textTransform: 'uppercase', fontWeight: 'bold' }}>Current Location</div>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}