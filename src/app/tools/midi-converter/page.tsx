'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Midi } from '@tonejs/midi';
import dynamic from 'next/dynamic';
import { convertMidiToLigature } from '@/engine/audio/midiConverter'; 
import { rescaleBPM, refactorScale, processLigature, polishLigatureSource, atomizeRepetitions, consolidateVerticals } from '@/engine/audio/ligatureTools';

const ScribeEditor = dynamic(() => import('@/components/admin/ScribeEditor'), { ssr: false });

export default function MidiConverterPage() {
    const [ligatureSource, setLigatureSource] = useState<string>('');
    const [status, setStatus] = useState<string>('Upload a .mid file to begin.');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [options, setOptions] = useState({
        grid: 4,
        bpm: 0,
        scaleRoot: 'auto',
        scaleMode: 'major'
    });
    
    const [refactorOptions, setRefactorOptions] = useState({
        scaleRoot: 'C',
        scaleMode: 'major'
    });

    const [shouldFoldLanes, setShouldFoldLanes] = useState(true);
    const [shouldExtractPatterns, setShouldExtractPatterns] = useState(true);
    const [foldAggressiveness, setFoldAggressiveness] = useState<'low' | 'high'>('high');
    const [useTransposition, setUseTransposition] = useState(true);
    const [patternAggressiveness, setPatternAggressiveness] = useState<0 | 1 | 2 | 3>(1);

    const aggressivenessLabels = ['Exact Match', 'Quantize Grid (Ignore . vs -)', 'Beat Fingerprint (Fuzzy)', 'Melodic Only (Ignore Rhythm)'];

    // Sync refactor options when main options change (e.g. after file load)
    useEffect(() => {
        if(options.scaleRoot !== 'auto') {
            setRefactorOptions({ scaleRoot: options.scaleRoot, scaleMode: options.scaleMode });
        }
    }, [options.scaleRoot, options.scaleMode]);

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
            
            // Default to C Major if auto is selected, or use detected if available/reliable
            if (options.scaleRoot === 'auto') {
                // If the converter returns "C Major" as default, we accept it.
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
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setStatus(`Importing "${file.name}"...`);
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setLigatureSource(text);
            setStatus(`Successfully imported "${file.name}". Ready for refinement.`);
        };
        reader.onerror = () => {
            setStatus('Error: Failed to read file.');
        };
        reader.readAsText(file);
        event.target.value = '';
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

    const handleRefactorScale = () => {
        if (!ligatureSource) return;
        setStatus(`Refactoring to ${refactorOptions.scaleRoot} ${refactorOptions.scaleMode}...`);
        try {
            const newSource = refactorScale(ligatureSource, refactorOptions.scaleRoot, refactorOptions.scaleMode);
            setLigatureSource(newSource);
            setOptions(prev => ({...prev, scaleRoot: refactorOptions.scaleRoot, scaleMode: refactorOptions.scaleMode}));
            setStatus(`Scale refactored successfully.`);
        } catch (error) {
            console.error(error);
            setStatus(`Error refactoring scale: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // --- NEW: Toggle Relative Major/Minor ---
    const handleToggleRelative = () => {
        if (!ligatureSource) return;
        
        const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const currentRootIndex = roots.indexOf(refactorOptions.scaleRoot);
        if (currentRootIndex === -1) return;

        let newRoot = '';
        let newMode = '';

        if (refactorOptions.scaleMode.toLowerCase() === 'major') {
            // Major -> Relative Minor (Down 3 semitones / Up 9)
            const newIndex = (currentRootIndex - 3 + 12) % 12;
            newRoot = roots[newIndex];
            newMode = 'minor';
        } else {
            // Minor -> Relative Major (Up 3 semitones)
            const newIndex = (currentRootIndex + 3) % 12;
            newRoot = roots[newIndex];
            newMode = 'major';
        }

        // Update state and trigger refactor immediately
        setRefactorOptions({ scaleRoot: newRoot, scaleMode: newMode });
        
        setStatus(`Swapping to relative ${newMode} (${newRoot})...`);
        try {
            const newSource = refactorScale(ligatureSource, newRoot, newMode);
            setLigatureSource(newSource);
            setOptions(prev => ({...prev, scaleRoot: newRoot, scaleMode: newMode}));
            setStatus(`Swapped to relative ${newMode} (${newRoot}).`);
        } catch (error) {
            console.error(error);
            setStatus(`Error swapping keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                patternSimilarity: useTransposition ? 'transpositional' : 'exact',
                patternAggressiveness: patternAggressiveness,
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

    const handleAtomizeClick = () => {
        if (!ligatureSource) return;
        setStatus('Extracting atomic motifs...');
        try {
            const newSource = atomizeRepetitions(ligatureSource);
            setLigatureSource(newSource);
            setStatus('Motif extraction complete.');
        } catch(error) {
            console.error(error);
            setStatus(`Error extracting motifs: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleConsolidateClick = () => {
        if (!ligatureSource) return;
        setStatus('Consolidating vertical layers...');
        try {
            const newSource = consolidateVerticals(ligatureSource);
            setLigatureSource(newSource);
            setStatus('Consolidation complete.');
        } catch(error) {
            console.error(error);
            setStatus(`Error consolidating: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <div style={{ padding: '2rem', background: '#181a1f', minHeight: '100vh', color: '#ccc' }}>
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileImport} 
                style={{ display: 'none' }} 
                accept=".lig,.txt"
            />
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ color: '#61afef', margin: '0 0 0.5rem 0', fontSize: '2rem' }}>MIDI to Ligature Converter</h1>
                    <p style={{ color: '#888', margin: 0 }}>
                        Convert MIDI files into narrative-ready Ligature code.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                    
                    {/* STEP 1: IMPORT */}
                    <div style={{ background: '#21252b', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ background: 'rgba(97, 175, 239, 0.1)', padding: '1rem', borderBottom: '1px solid #333' }}>
                            <h3 style={{ margin: 0, color: '#61afef', fontSize: '1rem', textTransform: 'uppercase' }}>1. Import File</h3>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Select MIDI File</label>
                                <input type="file" accept=".mid,.midi" onChange={handleFileChange} className="form-input" style={{ padding: '0.5rem' }}/>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#888' }}>
                                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #333' }} />
                                OR
                                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #333' }} />
                            </div>
                            <button onClick={handleImportClick} style={{ background: '#2c313a', border: '1px solid #444', color: '#ccc', padding: '0.75rem', borderRadius: '4px', cursor: 'pointer', textAlign: 'center' }}>
                                Import Existing .lig File
                            </button>
                                                    
                            {/* <div className="form-group">
                                <label className="form-label">BPM Override (0 = Auto)</label>
                                <input type="number" value={options.bpm} onChange={e => setOptions({...options, bpm: parseInt(e.target.value)})} className="form-input" />
                            </div> */}
                        </div>
                    </div>

                    {/* STEP 2: REINTERPRET */}
                    <div style={{ background: '#21252b', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden', opacity: ligatureSource ? 1 : 0.5, pointerEvents: ligatureSource ? 'auto' : 'none' }}>
                        <div style={{ background: 'rgba(229, 192, 123, 0.1)', padding: '1rem', borderBottom: '1px solid #333' }}>
                            <h3 style={{ margin: 0, color: '#e5c07b', fontSize: '1rem', textTransform: 'uppercase' }}>2. Re-Interpret</h3>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            
                            <div>
                                <label className="form-label" style={{ marginBottom: '0.5rem' }}>Tempo Scaling</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => handleRescaleBPM(2)} style={{ flex: 1, background: '#2c313a', border: '1px solid #444', color: '#ccc', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer' }}>x2 (Double)</button>
                                    <button onClick={() => handleRescaleBPM(0.5)} style={{ flex: 1, background: '#2c313a', border: '1px solid #444', color: '#ccc', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer' }}>/2 (Half)</button>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid #333', paddingTop: '1.5rem' }}>
                                <label className="form-label" style={{ marginBottom: '0.5rem' }}>Target Key</label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <select value={refactorOptions.scaleRoot} onChange={e => setRefactorOptions({...refactorOptions, scaleRoot: e.target.value})} className="form-select" style={{ width: '80px' }}>
                                        {['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].map(k => <option key={k}>{k}</option>)}
                                    </select>
                                    <select value={refactorOptions.scaleMode} onChange={e => setRefactorOptions({...refactorOptions, scaleMode: e.target.value})} className="form-select" style={{ flex: 1 }}>
                                        <option value="major">Major</option>
                                        <option value="minor">Minor</option>
                                        <option value="dorian">Dorian</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={handleToggleRelative} style={{ flex: 1, background: '#2c313a', border: '1px solid #444', color: '#e5c07b', padding: '0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                        Swap Relative
                                    </button>
                                    <button onClick={handleRefactorScale} style={{ flex: 1, background: '#e5c07b', color: '#000', border: 'none', padding: '0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                        Apply
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STEP 3: REFINE */}
                    <div style={{ background: '#21252b', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden', opacity: ligatureSource ? 1 : 0.5, pointerEvents: ligatureSource ? 'auto' : 'none' }}>
                        <div style={{ background: 'rgba(152, 195, 121, 0.1)', padding: '1rem', borderBottom: '1px solid #333' }}>
                            <h3 style={{ margin: 0, color: '#98c379', fontSize: '1rem', textTransform: 'uppercase' }}>3. Refine & Polish</h3>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={shouldFoldLanes} onChange={e => setShouldFoldLanes(e.target.checked)} /> Fold Lanes
                                </label>
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={useTransposition} onChange={e => setUseTransposition(e.target.checked)} /> Detect Transpose
                                </label>
                            </div>

                            <div>
                                <label className="form-label">Pattern Matching Aggressiveness</label>
                                <input type="range" min="0" max="3" step="1" value={patternAggressiveness} onChange={e => setPatternAggressiveness(Number(e.target.value) as any)} style={{width: '100%', accentColor: '#98c379'}} />
                                <div style={{ fontSize: '0.75rem', color: '#98c379', textAlign: 'center', marginTop: '4px' }}>
                                    {aggressivenessLabels[patternAggressiveness]}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button onClick={handleOptimizeClick} style={{ flex: 1, background: '#98c379', color: '#000', border: 'none', padding: '0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Optimize Structure
                                </button>
                                <button onClick={handlePolishClick} style={{ flex: 1, background: '#56B6C2', color: '#000', border: 'none', padding: '0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Polish Names
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* STEP 4: ADVANCED */}
                    <div style={{ background: '#21252b', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden', opacity: ligatureSource ? 1 : 0.5, pointerEvents: ligatureSource ? 'auto' : 'none' }}>
                        <div style={{ background: 'rgba(198, 120, 221, 0.1)', padding: '1rem', borderBottom: '1px solid #333' }}>
                            <h3 style={{ margin: 0, color: '#c678dd', fontSize: '1rem', textTransform: 'uppercase' }}>4. Advanced Compression</h3>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.5rem', marginTop: 0 }}>
                                    Break patterns into repeating 1-bar motifs (A + B + A). Good for repeating riffs.
                                </p>
                                <button onClick={handleAtomizeClick} style={{ width: '100%', background: '#c678dd', color: '#000', border: 'none', padding: '0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Extract Motifs
                                </button>
                            </div>
                            <div style={{ borderTop: '1px solid #333', paddingTop: '1.5rem' }}>
                                <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.5rem', marginTop: 0 }}>
                                    Merge instruments that always play together into single patterns. Reduces playlist rows.
                                </p>
                                <button onClick={handleConsolidateClick} style={{ width: '100%', background: '#61afef', color: '#000', border: 'none', padding: '0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Merge Layers
                                </button>
                            </div>
                        </div>
                    </div>

                </div>

                {/* STATUS BAR */}
                <div style={{ margin: '2rem 0', padding: '1rem', background: '#111', borderRadius: '4px', borderLeft: '4px solid #61afef', color: '#ccc', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    {status}
                </div>
                
                {/* EDITOR */}
                {ligatureSource && (
                    <div style={{ marginTop: '2rem' }}>
                        <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '1rem' }}>Generated Code</h3>
                        <ScribeEditor value={ligatureSource} onChange={setLigatureSource} language="ligature" minHeight="500px"/>
                    </div>
                )}
            </div>
        </div>
    );
}