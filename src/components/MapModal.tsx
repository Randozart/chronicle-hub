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
    // If location has no region assigned, use "default" or handle gracefully
    const regionId = currentLoc?.regionId || (currentLoc as any)?.map || 'default';
    const region = regions[regionId];

    // Filter locations for this region
    const visibleLocations = Object.values(locations).filter(l => 
        (l.regionId === regionId) || ((l as any).map === regionId)
    );

    // Decide Mode
    const hasVisualMap = region && region.image;

    return (
        // OVERLAY
        <div style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.9)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 9999, // Ensure it's on top of everything
            padding: '1rem'
        }}>
            
            {/* MODAL BOX */}
            <div style={{ 
                backgroundColor: 'var(--bg-panel)', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--border-radius)', 
                width: '100%', 
                maxWidth: '900px', 
                display: 'flex', 
                flexDirection: 'column', 
                maxHeight: '90vh' 
            }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
                        Travel: <span style={{ color: 'var(--success-color)' }}>{region?.name || "Local Area"}</span>
                    </h2>
                    <button 
                        onClick={onClose} 
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}
                    >✕</button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', position: 'relative', backgroundColor: '#111' }}>
                    
                    {hasVisualMap ? (
                        /* VISUAL MAP */
                        <div style={{ position: 'relative', width: '100%', minHeight: '500px' }}>
                            <GameImage 
                                code={region.image || ""} 
                                imageLibrary={imageLibrary} 
                                type="map"
                                alt="Map"
                                className="w-full h-auto block" // Ensure this class exists or use style={{ width: '100%', display: 'block' }}
                            />
                            {/* ... Pins logic ... */}
                        </div>
                    ) : (
                        /* LIST FALLBACK */
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
                                            borderRadius: '4px', 
                                            border: `1px solid ${isCurrent ? '#2ecc71' : 'var(--border-light)'}`,
                                            backgroundColor: isCurrent ? 'rgba(46, 204, 113, 0.1)' : 'var(--bg-main)',
                                            display: 'flex', alignItems: 'center', gap: '1rem',
                                            cursor: isCurrent ? 'default' : 'pointer',
                                            textAlign: 'left'
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
                                            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{loc.name}</div>
                                            {isCurrent && <div style={{ fontSize: '0.75rem', color: '#2ecc71', textTransform: 'uppercase', fontWeight: 'bold' }}>Current Location</div>}
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