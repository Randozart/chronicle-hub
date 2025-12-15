'use client';

import { useState } from 'react';
import { Midi } from '@tonejs/midi';
import dynamic from 'next/dynamic';
import { convertMidiToLigature } from '@/engine/audio/midiConverter'; 
// --- NEW IMPORT ---
import { processLigature } from '@/engine/audio/ligatureTools';

const ScribeEditor = dynamic(() => import('@/components/admin/ScribeEditor'), { ssr: false });

export default function MidiConverterPage() {
    const [ligatureSource, setLigatureSource] = useState<string>('');
    const [status, setStatus] = useState<string>('Upload a .mid file to begin.');
    
    // State for conversion options
    const [options, setOptions] = useState({
        grid: 4,
        bpm: 0, // 0 means 'auto'
        scaleRoot: 'auto',
        scaleMode: 'major'
    });

    // --- NEW STATE FOR REFINEMENT TOOLS ---
    const [shouldFoldLanes, setShouldFoldLanes] = useState(true);
    const [shouldExtractPatterns, setShouldExtractPatterns] = useState(true);
    const [foldAggressiveness, setFoldAggressiveness] = useState<'low' | 'high'>('high');
    const [patternSimilarity, setPatternSimilarity] = useState<'exact' | 'rhythmic'>('exact');

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setStatus(`Parsing "${file.name}"...`);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const midi = new Midi(arrayBuffer);
            
            const { source, warnings, detected } = convertMidiToLigature(midi, options);

            setLigatureSource(source);
            
            if (options.bpm === 0) setOptions(prev => ({ ...prev, bpm: detected.bpm }));
            if (options.scaleRoot === 'auto') {
                const [root, mode] = detected.key.split(' ');
                setOptions(prev => ({ ...prev, scaleRoot: root, scaleMode: mode.toLowerCase() }));
            }
            
            let finalStatus = "Conversion successful!";
            if (warnings.length > 0) {
                finalStatus += `\nDetected: ${detected.key} @ ${detected.bpm} BPM.\nWarnings:\n- ${warnings.join('\n- ')}`;
            }
            setStatus(finalStatus);

        } catch (e: any) {
            setStatus(`Error: ${e.message}`);
        }
    };
    
    // --- NEW HANDLER FOR OUR TOOLS ---
    const handleOptimizeClick = () => {
        if (!ligatureSource) {
            setStatus('Nothing to optimize.');
            return;
        }

        setStatus('Optimizing Ligature source...');
        try {
            const newSource = processLigature(ligatureSource, {
                foldLanes: shouldFoldLanes,
                extractPatterns: shouldExtractPatterns,
                foldAggressiveness: foldAggressiveness,
                patternSimilarity: patternSimilarity,
            });
            setLigatureSource(newSource);
            setStatus('Optimization complete.');
        } catch (error) {
            console.error(error);
            setStatus(`Error optimizing source: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <div style={{ padding: '2rem', background: '#181a1f', minHeight: '100vh', color: '#ccc' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ color: '#61afef' }}>MIDI to Ligature Converter</h1>
                <p style={{ color: '#888', marginBottom: '2rem' }}>
                    1. Upload a .mid file and adjust settings. 2. Use the refinement tools to clean the output.
                </p>

                <div style={{ background: '#21252b', padding: '2rem', borderRadius: '8px', border: '1px solid #333' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">MIDI File</label>
                            <input type="file" accept=".mid,.midi" onChange={handleFileChange} className="form-input"/>
                        </div>
                        <div className="form-group">
                            <label className="form-label">BPM (0=auto)</label>
                            <input type="number" value={options.bpm} onChange={e => setOptions({...options, bpm: parseInt(e.target.value)})} className="form-input" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Key Root</label>
                            <select value={options.scaleRoot} onChange={e => setOptions({...options, scaleRoot: e.target.value})} className="form-select">
                                <option value="auto">Auto-Detect</option>
                                <option>C</option><option>C#</option><option>D</option><option>D#</option><option>E</option><option>F</option><option>F#</option><option>G</option><option>G#</option><option>A</option><option>A#</option><option>B</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Key Mode</label>
                            <select value={options.scaleMode} onChange={e => setOptions({...options, scaleMode: e.target.value})} className="form-select">
                                <option value="major">Major</option>
                                <option value="minor">Minor</option>
                                <option value="dorian">Dorian</option>
                            </select>
                        </div>
                    </div>
                    <pre style={{ margin: '1rem 0', padding: '1rem', background: '#111', borderRadius: '4px', fontSize: '0.8rem', color: '#777', whiteSpace: 'pre-wrap' }}>
                        {status}
                    </pre>
                </div>
                
                {/* --- NEW/REPLACED REFINEMENT TOOLS SECTION --- */}
                <div style={{ marginTop: '2rem', background: '#21252b', padding: '2rem', borderRadius: '8px', border: '1px solid #333' }}>
                    <h3 style={{ color: '#C678DD', marginTop: 0 }}>Refinement Tools</h3>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                        
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input type="checkbox" checked={shouldFoldLanes} onChange={e => setShouldFoldLanes(e.target.checked)} />
                                Fold Instrument Lanes
                            </label>
                            {shouldFoldLanes && (
                                <select value={foldAggressiveness} onChange={e => setFoldAggressiveness(e.target.value as any)} className="form-select" style={{ marginTop: '0.5rem' }}>
                                    <option value="high">Aggressive (Cut sustains)</option>
                                    <option value="low">Conservative (Preserve sustains)</option>
                                </select>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input type="checkbox" checked={shouldExtractPatterns} onChange={e => setShouldExtractPatterns(e.target.checked)} />
                                Extract Repeated Patterns
                            </label>
                            {shouldExtractPatterns && (
                                 <select value={patternSimilarity} onChange={e => setPatternSimilarity(e.target.value as any)} className="form-select" style={{ marginTop: '0.5rem' }}>
                                    <option value="exact">Exact Match</option>
                                    <option value="rhythmic" disabled>Rhythmic Match (Soon)</option>
                                </select>
                            )}
                        </div>
                        
                        <button
                            disabled={!ligatureSource}
                            onClick={handleOptimizeClick}
                            style={{
                                marginLeft: 'auto',
                                background: '#56B6C2',
                                color: '#000',
                                border: 'none',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                alignSelf: 'center'
                            }}
                        >
                            Refine & Optimize
                        </button>
                    </div>
                </div>
                
                {ligatureSource && (
                    <div style={{ marginTop: '2rem' }}>
                        <h3 style={{ color: '#98c379' }}>Generated Ligature Code</h3>
                        <ScribeEditor
                            value={ligatureSource}
                            onChange={setLigatureSource}
                            language="ligature"
                            minHeight="400px"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}