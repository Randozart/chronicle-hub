'use client';

import { useState } from 'react';
import { Midi } from '@tonejs/midi';
import dynamic from 'next/dynamic';
import { convertMidiToLigature } from '@/engine/audio/midiConverter'; 
import { rescaleBPM, processLigature, polishLigatureSource } from '@/engine/audio/ligatureTools';

const ScribeEditor = dynamic(() => import('@/components/admin/ScribeEditor'), { ssr: false });

export default function MidiConverterPage() {
    const [ligatureSource, setLigatureSource] = useState<string>('');
    const [status, setStatus] = useState<string>('Upload a .mid file to begin.');
    
    // State for conversion options
    const [options, setOptions] = useState({
        grid: 4,
        bpm: 0,
        scaleRoot: 'auto',
        scaleMode: 'major'
    });

    // State for refinement tools
    const [shouldFoldLanes, setShouldFoldLanes] = useState(true);
    const [shouldExtractPatterns, setShouldExtractPatterns] = useState(true);
    const [foldAggressiveness, setFoldAggressiveness] = useState<'low' | 'high'>('high');
    const [useTransposition, setUseTransposition] = useState(true);
    const [patternAggressiveness, setPatternAggressiveness] = useState<0 | 1 | 2 | 3>(1);

    const aggressivenessLabels = ['Exact Match', 'Quantize Grid (Ignore . vs -)', 'Beat Fingerprint (Fuzzy)', 'Melodic Only (Ignore Rhythm)'];

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
    
    const handleRescaleBPM = (factor: number) => {
        if (!ligatureSource) return;
        setStatus(`Rescaling BPM by a factor of ${factor}...`);
        try {
            const newSource = rescaleBPM(ligatureSource, factor);
            setLigatureSource(newSource);
            const currentBpmMatch = newSource.match(/BPM:\s*(\d+)/);
            if (currentBpmMatch) {
                setOptions(prev => ({...prev, bpm: parseInt(currentBpmMatch[1])}));
            }
            setStatus(`BPM rescaled successfully.`);
        } catch (error) {
            console.error(error);
            setStatus(`Error rescaling BPM: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    
    const handleOptimizeClick = () => {
        if (!ligatureSource) return;
        setStatus('Optimizing Ligature source...');
        try {
            const newSource = processLigature(ligatureSource, {
                foldLanes: shouldFoldLanes,
                extractPatterns: shouldExtractPatterns,
                foldAggressiveness: foldAggressiveness,
                patternSimilarity: useTransposition ? 'transpositional' : 'exact', // This now controls transposition
                patternAggressiveness: patternAggressiveness, // This controls the fuzzy rhythm
            });
            setLigatureSource(newSource);
            setStatus('Optimization complete.');
        } catch (error) {
            console.error(error);
            setStatus(`Error optimizing source: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handlePolishClick = () => {
        if (!ligatureSource) return;
        setStatus('Polishing names and cleaning up...');
        try {
            const newSource = polishLigatureSource(ligatureSource);
            setLigatureSource(newSource);
            setStatus('Polishing complete.');
        } catch(error) {
            console.error(error);
            setStatus(`Error polishing source: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <div style={{ padding: '2rem', background: '#181a1f', minHeight: '100vh', color: '#ccc' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ color: '#61afef' }}>MIDI to Ligature Converter</h1>
                <p style={{ color: '#888', marginBottom: '2rem' }}>
                    Workflow: 1. Convert → 2. Rescale BPM → 3. Refine & Polish
                </p>

                {/* Step 1: Conversion */}
                <div style={{ background: '#21252b', padding: '2rem', borderRadius: '8px', border: '1px solid #333' }}>
                    <h3 style={{ marginTop: 0, color: '#e5c07b' }}>1. Convert MIDI</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div className="form-group"><label className="form-label">MIDI File</label><input type="file" accept=".mid,.midi" onChange={handleFileChange} className="form-input"/></div>
                        <div className="form-group"><label className="form-label">BPM (0=auto)</label><input type="number" value={options.bpm} onChange={e => setOptions({...options, bpm: parseInt(e.target.value)})} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Key Root</label><select value={options.scaleRoot} onChange={e => setOptions({...options, scaleRoot: e.target.value})} className="form-select"><option value="auto">Auto-Detect</option><option>C</option><option>C#</option><option>D</option><option>D#</option><option>E</option><option>F</option><option>F#</option><option>G</option><option>G#</option><option>A</option><option>A#</option><option>B</option></select></div>
                        <div className="form-group"><label className="form-label">Key Mode</label><select value={options.scaleMode} onChange={e => setOptions({...options, scaleMode: e.target.value})} className="form-select"><option value="major">Major</option><option value="minor">Minor</option><option value="dorian">Dorian</option></select></div>
                    </div>
                    <pre style={{ margin: '1rem 0', padding: '1rem', background: '#111', borderRadius: '4px', fontSize: '0.8rem', color: '#777', whiteSpace: 'pre-wrap' }}>{status}</pre>
                </div>

                {/* Step 2: Rhythmic Interpretation */}
                 <div style={{ marginTop: '2rem', background: '#21252b', padding: '2rem', borderRadius: '8px', border: '1px solid #333' }}>
                    <h3 style={{ marginTop: 0, color: '#e5c07b' }}>2. Rhythmic Interpretation</h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                         <p style={{ margin: 0, color: '#888' }}>Adjust the base tempo to simplify complex rhythms before optimizing.</p>
                         <button disabled={!ligatureSource} onClick={() => handleRescaleBPM(2)} style={{ background: '#98c379', color: '#000', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Double BPM (x2)</button>
                         <button disabled={!ligatureSource} onClick={() => handleRescaleBPM(0.5)} style={{ background: '#e06c75', color: '#000', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Halve BPM (/2)</button>
                    </div>
                </div>
                
                {/* Step 3: Refinement and Polishing */}
                <div style={{ marginTop: '2rem', background: '#21252b', padding: '2rem', borderRadius: '8px', border: '1px solid #333' }}>
                    <h3 style={{ marginTop: 0, color: '#e5c07b' }}>3. Refine & Polish</h3>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div className="form-group">
                            <h4 style={{color: '#61afef', margin: '0 0 0.5rem 0'}}>Options</h4>
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={shouldFoldLanes} onChange={e => setShouldFoldLanes(e.target.checked)} />Fold Instrument Lanes</label>
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}><input type="checkbox" checked={useTransposition} onChange={e => setUseTransposition(e.target.checked)} />Find Transposed Patterns</label>
                        </div>

                        {/* --- NEW SLIDER --- */}
                        <div className="form-group" style={{ flexGrow: 1}}>
                             <h4 style={{color: '#61afef', margin: '0 0 0.5rem 0'}}>Pattern Matching Aggressiveness</h4>
                             <input type="range" min="0" max="3" step="1" value={patternAggressiveness} onChange={e => setPatternAggressiveness(Number(e.target.value) as any)} style={{width: '100%'}} />
                             <div style={{textAlign: 'center', color: '#98c379', fontWeight: 'bold', marginTop: '0.5rem'}}>{aggressivenessLabels[patternAggressiveness]}</div>
                        </div>
                        
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center', alignSelf: 'center' }}>
                            <button disabled={!ligatureSource} onClick={handleOptimizeClick} style={{ background: '#56B6C2', color: '#000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Refine Structure</button>
                            <button disabled={!ligatureSource} onClick={handlePolishClick} style={{ background: '#C678DD', color: '#000', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Polish Names</button>
                        </div>
                    </div>
                </div>
                
                {ligatureSource && (
                    <div style={{ marginTop: '2rem' }}>
                        <h3 style={{ color: '#98c379' }}>Ligature Code</h3>
                        <ScribeEditor value={ligatureSource} onChange={setLigatureSource} language="ligature" minHeight="400px"/>
                    </div>
                )}
            </div>
        </div>
    );
}

// Dummy property on ParsedPattern to satisfy the type checker for our new logic
declare module '@/engine/audio/models' {
    interface ParsedPattern {
        sourceString?: string;
    }
}