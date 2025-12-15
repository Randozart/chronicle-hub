'use client';

import { useEffect, useState } from 'react';
import { InstrumentDefinition, LigatureTrack } from '@/engine/audio/models';
import { DEFAULT_INSTRUMENT_LIST } from '@/engine/audio/presets';
import dynamic from 'next/dynamic';

const TrackEditor = dynamic(() => import('@/app/create/[storyId]/audio/components/TrackEditor'), {
    ssr: false,
    loading: () => <div style={{ color: '#555', padding: '2rem' }}>Loading Audio Lab...</div>
});

// Use the same demo track from the admin page
const DEMO_TRACK_SOURCE = `[CONFIG]
BPM: 110
Scale: C Minor
Grid: 4

[INSTRUMENTS]
Bass: fm_bass
Lead: retro_lead
Pads: warm_pad

[DEFINITIONS]
@Root = [1, 3, 5]
@Sus  = [1, 4, 5]

[PATTERN: Intro_Bass]
Bass | 1 . . 1  1, . . 1  1 . . 1  1, . . . |

[PATTERN: Main_Melody]
Bass | 1 . . 1  1, . . 1  4 . . 4  5, . . . |
Lead | 3 - 5 -  1' - 5 -  6 - 4 -  2 . (2 3 2) |

[PATTERN: Pads_Layer]
Pads | @Root - - -  - - - -  @Sus - - -  - - - - |

[PLAYLIST]
Intro_Bass
Main_Melody, Pads_Layer
Main_Melody( +4 ), Pads_Layer( +4 )
Intro_Bass
`;

export default function LigaturePlayground() {
    // --- APPLY THE SAME DELAY PATTERN ---
    const [track, setTrack] = useState<LigatureTrack | null>(null);

    useEffect(() => {
        // Set the initial track data only on the client after mount
        setTrack({
            id: 'demo_track',
            name: 'Ligature Demo',
            source: DEMO_TRACK_SOURCE,
        });
    }, []);
    
    // The available instruments are our hardcoded presets
    const availableInstruments = DEFAULT_INSTRUMENT_LIST;

    return (
        <div style={{ padding: '2rem', background: '#181a1f', minHeight: '100vh', color: '#ccc' }}>
            <div style={{ maxWidth: '1500px', margin: '0 auto' }}>
                <h1 style={{ color: '#61afef' }}>Ligature Playground</h1>
                <p style={{ color: '#888', marginBottom: '2rem' }}>
                    Experiment with the ChronicleHub procedural audio engine. Changes are not saved.
                </p>
                {/* --- RENDER TRACKEDITOR CONDITIONALLY --- */}
                {track ? (
                    <TrackEditor 
                        data={track}
                        onSave={(updatedData) => setTrack(updatedData as LigatureTrack)}
                        onDelete={() => {}}
                        availableInstruments={availableInstruments}
                        enableDownload={true}
                        isPlayground={true} // <-- ADD THIS

                    />
                ) : (
                    <div>Loading Editor...</div> // Or your loading component
                )}
            </div>
        </div>
    );
}