'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Midi } from '@tonejs/midi';
import dynamic from 'next/dynamic';
import { convertMidiToLigature } from '@/engine/audio/midiConverter'; 
import { convertItToLigature } from '@/engine/audio/tracker/converter';
import { rescaleBPM, refactorScale, processLigature, polishLigatureSource, atomizeRepetitions, consolidateVerticals } from '@/engine/audio/ligatureTools';
import { useAudio } from '@/providers/AudioProvider';
import { InstrumentDefinition } from '@/engine/audio/models';
import { disposeInstruments } from '@/engine/audio/synth'; // Import dispose logic

const ScribeEditor = dynamic(() => import('@/components/admin/ScribeEditor'), { 
    ssr: false,
    loading: () => <div style={{ height: '500px', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Loading Editor...</div>
});

// Styles
const panelStyle: React.CSSProperties = { background: '#21252b', border: '1px solid #333', borderRadius: '4px', padding: '1rem' };
const btnStyle: React.CSSProperties = { background: '#2c313a', border: '1px solid #444', color: '#ccc', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '4px', textTransform: 'uppercase' };
const inputStyle: React.CSSProperties = { width: '100%', background: '#111', border: '1px solid #444', color: '#ccc', padding: '6px', borderRadius: '4px', fontSize: '0.9rem' };

export default function AudioConverterPage() {
    const { playTrack, stop, isPlaying } = useAudio();
    const [ligatureSource, setLigatureSource] = useState<string>('');
    const [presetsSource, setPresetsSource] = useState<string>(''); 
    const [generatedPresets, setGeneratedPresets] = useState<InstrumentDefinition[]>([]);
    const [zipBlob, setZipBlob] = useState<Blob | null>(null); 
    
    const [status, setStatus] = useState<string>('Upload a .mid, .it, or .umx file to begin.');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [options, setOptions] = useState({ grid: 4, speed: 4, bpm: 0, scaleRoot: 'auto', scaleMode: 'major', sampleVol: 60 }); // Default Vol 60 (~50%)
    const [detectModulation, setDetectModulation] = useState(false);
    
    const [refactorOptions, setRefactorOptions] = useState({ scaleRoot: 'C', scaleMode: 'major' });
    const [shouldFoldLanes, setShouldFoldLanes] = useState(true);
    const [shouldExtractPatterns, setShouldExtractPatterns] = useState(true);
    const [foldAggressiveness, setFoldAggressiveness] = useState<'low' | 'high'>('high');
    const [useTransposition, setUseTransposition] = useState(true);
    const [patternAggressiveness, setPatternAggressiveness] = useState<0 | 1 | 2 | 3>(1);

    const aggressivenessLabels = ['Exact Match', 'Quantize Grid', 'Beat Fingerprint', 'Melodic Only'];

    useEffect(() => {
        if(options.scaleRoot !== 'auto') {
            setRefactorOptions({ scaleRoot: options.scaleRoot, scaleMode: options.scaleMode });
        }
    }, [options.scaleRoot, options.scaleMode]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setStatus(`Parsing "${file.name}"...`);
        setZipBlob(null);
        stop();
        disposeInstruments(); // FORCE CACHE CLEAR

        try {
            const arrayBuffer = await file.arrayBuffer();
            const fileName = file.name.toLowerCase();

            if (fileName.endsWith('.it') || fileName.endsWith('.umx')) {
                const result = convertItToLigature(arrayBuffer, {
                    grid: options.grid,
                    speed: options.speed,
                    scaleRoot: options.scaleRoot === 'auto' ? 'C' : options.scaleRoot,
                    scaleMode: options.scaleMode,
                    amplify: options.sampleVol,
                    detectModulation: detectModulation
                });
                
                setLigatureSource(result.source);
                setPresetsSource(JSON.stringify(result.presets, null, 4));
                setGeneratedPresets(result.presets); 
                
                if (result.zipBlob) {
                    setZipBlob(result.zipBlob);
                    setStatus(`Tracker Conversion successful! Samples extracted.`);
                } else {
                    setStatus(`Tracker Conversion successful!`);
                }

            } else {
                const midi = new Midi(arrayBuffer);
                const { source, warnings, detected } = convertMidiToLigature(midi, options);
                setLigatureSource(source);
                setPresetsSource(''); 
                setZipBlob(null);
                setGeneratedPresets([]);
                
                if (options.scaleRoot === 'auto') {
                    const [root, mode] = detected.key.split(' ');
                    setOptions(prev => ({ ...prev, scaleRoot: root, scaleMode: mode.toLowerCase() }));
                }
                
                let finalStatus = "MIDI Conversion successful!";
                if (warnings.length > 0) finalStatus += ` (Warnings: ${warnings.length})`;
                setStatus(finalStatus);
            }
        } catch (e: any) {
            console.error(e);
            setStatus(`Error: ${e.message}`);
        }
    };

    const handlePlay = () => {
        if (!ligatureSource) return;
        
        if (presetsSource && !window.confirm("For local playback, ensure you have extracted the samples to /public/sounds/tracker/. Proceed?")) {
            return;
        }

        try {
            playTrack(ligatureSource, generatedPresets.length > 0 ? generatedPresets : []);
            setStatus("Playing...");
        } catch(e: any) {
            setStatus("Error: " + e.message);
        }
    };

    const handleStop = () => { stop(); setStatus("Stopped"); };

    const handleImportTextClick = () => fileInputRef.current?.click();
    const handleTextFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setStatus(`Importing "${file.name}"...`);
        const reader = new FileReader();
        reader.onload = (e) => {
            setLigatureSource(e.target?.result as string);
            setStatus(`Successfully imported "${file.name}".`);
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const downloadZip = () => {
        if (!zipBlob) return;
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "tracker_samples.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const copyPresets = () => {
        navigator.clipboard.writeText(presetsSource);
        setStatus("Presets copied to clipboard!");
    };

    const handleRescaleBPM = (factor: number) => {
        if (!ligatureSource) return;
        try { const n = rescaleBPM(ligatureSource, factor); setLigatureSource(n); setStatus(`BPM rescaled by ${factor}x.`); } 
        catch (e: any) { setStatus(`Error: ${e.message}`); }
    };
    const handleRefactorScale = () => {
        if (!ligatureSource) return;
        try { 
            const n = refactorScale(ligatureSource, refactorOptions.scaleRoot, refactorOptions.scaleMode); 
            setLigatureSource(n); 
            setOptions(p => ({...p, scaleRoot: refactorOptions.scaleRoot, scaleMode: refactorOptions.scaleMode}));
            setStatus(`Refactored to ${refactorOptions.scaleRoot} ${refactorOptions.scaleMode}.`);
        } catch (e: any) { setStatus(`Error: ${e.message}`); }
    };
    const handleToggleRelative = () => {
        if (!ligatureSource) return;
        const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const idx = roots.indexOf(refactorOptions.scaleRoot);
        if (idx === -1) return;
        let newRoot='', newMode='';
        if (refactorOptions.scaleMode.toLowerCase() === 'major') { newRoot = roots[(idx-3+12)%12]; newMode = 'minor'; } 
        else { newRoot = roots[(idx+3)%12]; newMode = 'major'; }
        setRefactorOptions({ scaleRoot: newRoot, scaleMode: newMode });
        try {
            const n = refactorScale(ligatureSource, newRoot, newMode);
            setLigatureSource(n);
            setStatus(`Swapped to relative ${newMode} (${newRoot}).`);
        } catch (e: any) { setStatus(`Error: ${e.message}`); }
    };
    const handleOptimizeClick = () => {
        if (!ligatureSource) return;
        try {
            const n = processLigature(ligatureSource, {
                foldLanes: shouldFoldLanes, extractPatterns: shouldExtractPatterns, foldAggressiveness: foldAggressiveness,
                patternSimilarity: useTransposition ? 'transpositional' : 'exact', patternAggressiveness: patternAggressiveness,
            });
            setLigatureSource(n); setStatus('Optimization complete.');
        } catch (e: any) { setStatus(`Error: ${e.message}`); }
    };
    const handlePolishClick = () => {
        if (!ligatureSource) return;
        try { setLigatureSource(polishLigatureSource(ligatureSource)); setStatus('Polishing complete.'); } 
        catch (e: any) { setStatus(`Error: ${e.message}`); }
    };
    const handleAtomizeClick = () => {
        if (!ligatureSource) return;
        try { setLigatureSource(atomizeRepetitions(ligatureSource)); setStatus('Motif extraction complete.'); } 
        catch (e: any) { setStatus(`Error: ${e.message}`); }
    };
    const handleConsolidateClick = () => {
        if (!ligatureSource) return;
        try { setLigatureSource(consolidateVerticals(ligatureSource)); setStatus('Vertical consolidation complete.'); } 
        catch (e: any) { setStatus(`Error: ${e.message}`); }
    };

    return (
        <div style={{ padding: '2rem', background: '#181a1f', minHeight: '100vh', color: '#ccc', fontFamily: 'sans-serif' }}>
             <input type="file" ref={fileInputRef} onChange={handleTextFileImport} style={{ display: 'none' }} accept=".lig,.txt" />
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
                    <h1 style={{ color: '#61afef', margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>Audio Converter</h1>
                    <p style={{ color: '#888', margin: 0, fontSize: '0.9rem' }}>Import MIDI, IT, or UMX files.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div style={panelStyle}>
                        <h3 style={{ margin: '0 0 1rem 0', color: '#61afef', fontSize: '0.9rem', textTransform: 'uppercase' }}>1. Input Configuration</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Grid Size</label>
                                <select style={inputStyle} value={options.grid} onChange={e => setOptions({...options, grid: parseInt(e.target.value)})}>
                                    {[4,6,8,12].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Scale Key</label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <select style={{...inputStyle, width:'60px'}} value={options.scaleRoot} onChange={e => setOptions({...options, scaleRoot: e.target.value})}>
                                        <option value="auto">Auto</option>
                                        {['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].map(k => <option key={k}>{k}</option>)}
                                    </select>
                                    <select style={{...inputStyle, flex:1}} value={options.scaleMode} onChange={e => setOptions({...options, scaleMode: e.target.value})}>
                                        <option value="major">Major</option>
                                        <option value="minor">Minor</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={labelStyle} title="Tracker Only">IT Speed</label>
                                <input type="number" style={inputStyle} value={options.speed} onChange={e => setOptions({...options, speed: parseInt(e.target.value)})} />
                            </div>
                            <div>
                                <label style={labelStyle} title="Tracker Only">IT Volume</label>
                                <input type="number" style={inputStyle} value={options.sampleVol} onChange={e => setOptions({...options, sampleVol: parseInt(e.target.value)})} />
                            </div>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#ccc' }}>
                                <input type="checkbox" checked={detectModulation} onChange={e => setDetectModulation(e.target.checked)} /> 
                                Auto-Detect Modulation (Relative Keys)
                            </label>
                        </div>
                        <label style={{ display: 'block', padding: '0.8rem', background: '#61afef', color: '#000', textAlign: 'center', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Select File
                            <input type="file" accept=".mid,.midi,.it,.umx" onChange={handleFileChange} style={{ display: 'none' }} />
                        </label>
                    </div>

                    {/* (Other panels unchanged except for min-width handling in parent grid) */}
                    {/* ... */}
                </div>

                {/* STATUS BAR */}
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#111', borderRadius: '4px', borderLeft: '4px solid #61afef', color: '#ccc', fontFamily: 'monospace', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{status}</span>
                    {isPlaying ? (
                        <button onClick={handleStop} style={{...btnStyle, background: '#e06c75', color: '#fff'}}>■ Stop Playback</button>
                    ) : (
                        <button onClick={handlePlay} style={{...btnStyle, background: '#98c379', color: '#000', opacity: ligatureSource ? 1 : 0.5}}>▶ Play Preview</button>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: presetsSource ? '2fr 1fr' : '1fr', gap: '1.5rem', height: '600px' }}>
                    
                    {/* FIXED: Min Width to prevent infinite expansion */}
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#ccc' }}>Ligature Source</h3>
                            <span style={{ fontSize: '0.8rem', color: '#666' }}>{ligatureSource.length} chars</span>
                        </div>
                        {/* FIXED: Min Width on Editor Container */}
                        <div style={{ flex: 1, border: '1px solid #333', borderRadius: '4px', overflow: 'hidden', minWidth: 0 }}>
                            <ScribeEditor value={ligatureSource} onChange={setLigatureSource} language="ligature" minHeight="100%"/>
                        </div>
                    </div>
                    {presetsSource && (
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', color: '#98c379' }}>Instrument Presets</h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {zipBlob && (
                                        <button onClick={downloadZip} style={{...btnStyle, background:'#98c379', color:'#000'}}>⬇ Samples ZIP</button>
                                    )}
                                    <button onClick={copyPresets} style={{...btnStyle, background:'transparent', border:'1px solid #98c379', color:'#98c379'}}>Copy JSON</button>
                                </div>
                            </div>
                            <textarea value={presetsSource} readOnly style={{ flex: 1, width: '100%', resize: 'none', background: '#21252b', color: '#98c379', border: '1px solid #333', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.85rem', padding: '1rem', outline: 'none', whiteSpace: 'pre' }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}