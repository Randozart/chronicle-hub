'use client';

import { useState } from 'react';
import { InstrumentDefinition, LigatureTrack } from '@/engine/audio/models';
import { DEFAULT_INSTRUMENT_LIST } from '@/engine/audio/presets';
import TrackEditor from '@/app/create/[storyId]/audio/components/TrackEditor'; // We can reuse this!

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
    // We manage state locally instead of fetching from a DB
    const [track, setTrack] = useState<LigatureTrack>({
        id: 'demo_track',
        name: 'Ligature Demo',
        source: DEMO_TRACK_SOURCE,
    });
    
    // The available instruments are our hardcoded presets
    const availableInstruments = DEFAULT_INSTRUMENT_LIST;

    return (
        <div style={{ padding: '2rem', background: '#181a1f', minHeight: '100vh', color: '#ccc' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <h1 style={{ color: '#61afef' }}>Ligature Playground</h1>
                <p style={{ color: '#888', marginBottom: '2rem' }}>
                    Experiment with the ChronicleHub procedural audio engine. Changes are not saved.
                </p>
                <TrackEditor 
                    data={track}
                    onSave={(updatedData) => setTrack(updatedData as LigatureTrack)} // Just updates local state
                    onDelete={() => {}} // No-op
                    availableInstruments={availableInstruments}
                    enableDownload ={true}
                />
            </div>
        </div>
    );
}